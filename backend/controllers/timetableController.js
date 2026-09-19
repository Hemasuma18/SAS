const Timetable = require('../models/Timetable');
const Subject = require('../models/Subject');
const Student = require('../models/Student');

const getTimetableScope = async (req) => {
  if (!['teacher', 'hod'].includes(req.user.role) || !req.user.department) {
    return null;
  }

  const subjectFilter = {
    ...(req.user.role === 'teacher' ? { teacherId: req.user._id } : {}),
    department: req.user.department,
    isActive: true,
  };
  const [departmentSections, assignedSubjects] = await Promise.all([
    Student.distinct('section', { department: req.user.department, isActive: true }),
    Subject.find(subjectFilter, { _id: 1, subjectCode: 1 }).lean(),
  ]);

  const assignedSubjectIds = assignedSubjects.map((subject) => subject._id);
  const assignedSubjectCodes = assignedSubjects.map((subject) => subject.subjectCode);
  const assignedSubjectScope = req.user.role === 'teacher'
    ? { $or: [{ subjectId: { $in: assignedSubjectIds } }, { subjectCode: { $in: assignedSubjectCodes } }] }
    : { $or: [{ department: req.user.department }, { subjectId: { $in: assignedSubjectIds } }, { subjectCode: { $in: assignedSubjectCodes } }] };
  const assignedSections = await Timetable.distinct('section', assignedSubjectScope);
  const slotScope = req.user.role === 'teacher'
    ? assignedSubjectScope
    : { $or: [...assignedSubjectScope.$or, { department: { $exists: false }, section: { $in: assignedSections } }] };
  return { sections: [...new Set([...departmentSections, ...assignedSections])], slotScope };
};

const applyScope = (filter, scope) => {
  if (!scope) return filter;
  if (scope.sections.length === 0) return { ...filter, section: { $in: [] } };
  filter.section = { $in: scope.sections };
  if (scope.slotScope) filter.$and = [scope.slotScope];
  return filter;
};

// @desc    Get full timetable (optionally filter by day/section)
// @route   GET /api/timetable
// @access  Private
const getTimetable = async (req, res, next) => {
  try {
    const { day, section, department, academicYear } = req.query;
    const scope = await getTimetableScope(req);
    const filter = applyScope({}, scope);
    if (section) filter.section = scope && !scope.sections.includes(section) ? { $in: [] } : section;
    if (department) filter.department = ['teacher', 'hod'].includes(req.user.role) && req.user.department ? req.user.department : department;
    if (academicYear) filter.academicYear = academicYear;
    if (day) filter.day = day;

    const slots = await Timetable.find(filter)
      .populate('subjectId', 'subjectName subjectCode teacherId')
      .sort({ day: 1, hour: 1 });

    res.json(slots);
  } catch (error) {
    next(error);
  }
};

// @desc    Get timetable grouped by day
// @route   GET /api/timetable/grouped
// @access  Private
const getTimetableGrouped = async (req, res, next) => {
  try {
    const { section, department, academicYear } = req.query;
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const scope = await getTimetableScope(req);
    const filter = applyScope({}, scope);
    if (section) filter.section = scope && !scope.sections.includes(section) ? { $in: [] } : section;
    if (department) filter.department = ['teacher', 'hod'].includes(req.user.role) && req.user.department ? req.user.department : department;
    if (academicYear) filter.academicYear = academicYear;

    const slots = await Timetable.find(filter)
      .populate('subjectId', 'subjectName subjectCode')
      .sort({ hour: 1 });

    const grouped = {};
    days.forEach((d) => { grouped[d] = []; });
    slots.forEach((s) => { if (grouped[s.day]) grouped[s.day].push(s); });

    res.json(grouped);
  } catch (error) {
    next(error);
  }
};

// @desc    Get distinct sections visible to the current user
// @route   GET /api/timetable/sections
// @access  Private
const getSections = async (req, res, next) => {
  try {
    const scope = await getTimetableScope(req);
    const department = ['teacher', 'hod'].includes(req.user.role) && req.user.department
      ? req.user.department
      : req.query.department;
    const filter = {};
    if (scope?.slotScope) filter.$and = [scope.slotScope];
    if (department) filter.department = department;
    const sections = await Timetable.aggregate([
      { $match: filter },
      { $group: { _id: { department: '$department', section: '$section' } } },
      { $sort: { '_id.department': 1, '_id.section': 1 } },
      { $project: { _id: 0, department: '$_id.department', section: '$_id.section' } },
    ]);
    res.json(sections.filter((item) => item.department && item.section));
  } catch (error) {
    next(error);
  }
};

// @desc    Upsert a single timetable slot
// @route   PUT /api/timetable
// @access  Admin
const upsertSlot = async (req, res, next) => {
  try {
    const { day, hour, section, department, ...rest } = req.body;
    if (!section) return res.status(400).json({ message: 'section is required' });
    const slot = await Timetable.findOneAndUpdate(
      { day, hour, section, department },
      { day, hour, section, department, ...rest },
      { upsert: true, new: true, runValidators: true }
    );
    res.json(slot);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a timetable slot
// @route   DELETE /api/timetable/:id
// @access  Admin
const deleteSlot = async (req, res, next) => {
  try {
    await Timetable.findByIdAndDelete(req.params.id);
    res.json({ message: 'Slot removed' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getTimetable, getTimetableGrouped, getSections, upsertSlot, deleteSlot };
