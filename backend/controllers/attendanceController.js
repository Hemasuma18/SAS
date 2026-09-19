const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const logger = require('../utils/logger');
const { calculate } = require('../utils/attendanceCalculator');

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Parse a YYYY-MM-DD string into a UTC midnight Date, avoiding timezone shifts.
// e.g. "2026-09-09" → 2026-09-09T00:00:00.000Z regardless of server timezone.
const parseUTCDate = (dateStr) => {
  const [y, m, d] = String(dateStr).split('-').map(Number);
  if (!y || !m || !d || m < 1 || m > 12 || d < 1 || d > 31) return null;
  return new Date(Date.UTC(y, m - 1, d));
};

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const getTodayUTC = () => parseUTCDate(new Date().toISOString().slice(0, 10));

// ─── Mark Attendance ──────────────────────────────────────────────────────────

// @desc    Mark attendance (bulk)
// @route   POST /api/attendance/mark
// @access  Teacher / Admin / CR
const markAttendance = async (req, res, next) => {
  try {
    const { subjectId, date, records } = req.body;

    // 1. Basic presence validation
    if (!subjectId || !date || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: 'subjectId, date, and records[] are required' });
    }

    // 2. Validate subjectId format
    if (!isValidObjectId(subjectId)) {
      return res.status(400).json({ message: 'Invalid subjectId' });
    }

    // 3. Timezone-safe date parsing
    const attendanceDate = parseUTCDate(date);
    if (!attendanceDate) {
      return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD' });
    }

    // 4. Reject future dates
    const todayUTC = parseUTCDate(new Date().toISOString().slice(0, 10));
    if (attendanceDate > todayUTC) {
      return res.status(400).json({ message: 'Cannot mark attendance for a future date' });
    }

    // 5. Verify subject exists and is active
    const subject = await Subject.findOne({ _id: subjectId, isActive: true });
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found or inactive' });
    }

    // 6. Authorization: teacher can only mark their own subject
    if (req.user.role === 'teacher') {
      if (String(subject.teacherId) !== String(req.user._id)) {
        return res.status(403).json({ message: 'You are not authorized to mark attendance for this subject' });
      }
      if (req.user.department && subject.department !== req.user.department) {
        return res.status(403).json({ message: 'You are not authorized to mark attendance for this department' });
      }
    }

    // 7. Check if attendance already marked for this subject+date
    const existing = await Attendance.findOne({ subjectId, date: attendanceDate });
    if (existing) {
      return res.status(400).json({ message: 'Attendance already marked for this subject on this date' });
    }

    // 8. Validate each record
    const validStatuses = ['Present', 'Absent'];
    for (const rec of records) {
      if (!rec.studentId || !isValidObjectId(rec.studentId)) {
        return res.status(400).json({ message: `Invalid studentId: ${rec.studentId}` });
      }
      if (!validStatuses.includes(rec.status)) {
        return res.status(400).json({ message: `Invalid status "${rec.status}". Must be Present or Absent` });
      }
    }

    // 9. Verify all studentIds exist and belong to the subject's department+year
    const studentIds = records.map((r) => r.studentId);
    const students = await Student.find({
      _id: { $in: studentIds },
      department: subject.department,
      year: subject.year,
      isActive: true,
    }).select('_id');

    const validStudentIds = new Set(students.map((s) => String(s._id)));
    const invalidStudents = studentIds.filter((id) => !validStudentIds.has(String(id)));
    if (invalidStudents.length > 0) {
      return res.status(400).json({
        message: `${invalidStudents.length} student(s) do not belong to this subject's class or are inactive`,
      });
    }

    // 10. Build and insert documents
    const docs = records.map(({ studentId, status }) => ({
      studentId,
      subjectId,
      teacherId: req.user._id,
      date: attendanceDate,
      status,
    }));

    // ordered:false so a rare race-condition duplicate on one record doesn't abort the batch
    await Attendance.insertMany(docs, { ordered: false });

    const presentCount = records.filter((r) => r.status === 'Present').length;
    const markedBy = req.user.role === 'student_cr' ? `CR ${req.user.name}` : `Teacher ${req.user.name}`;
    logger.info(
      `${markedBy} marked attendance for ${subject.subjectName} on ${date}. Present: ${presentCount}/${records.length}`
    );

    res.status(201).json({ message: 'Attendance marked successfully', count: docs.length });
  } catch (error) {
    // Handle insertMany partial duplicate errors gracefully
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Attendance already marked for this subject on this date' });
    }
    next(error);
  }
};

// ─── Get Attendance by Date ───────────────────────────────────────────────────

// @desc    Get attendance by date and subject
// @route   GET /api/attendance/date/:date
// @access  Private
const getAttendanceByDate = async (req, res, next) => {
  try {
    const { subjectId, department } = req.query;

    const date = parseUTCDate(req.params.date);
    if (!date) return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD' });

    const nextDay = new Date(date.getTime() + 24 * 60 * 60 * 1000);
    const filter = { date: { $gte: date, $lt: nextDay } };

    let scopedSubjectIds;
    if (req.user.role === 'teacher') {
      scopedSubjectIds = await Subject.find({ teacherId: req.user._id, isActive: true }, { _id: 1 });
      filter.subjectId = { $in: scopedSubjectIds.map((s) => s._id) };
    } else if (req.user.role === 'hod' && req.user.department) {
      scopedSubjectIds = await Subject.find({ department: req.user.department, isActive: true }, { _id: 1 });
      filter.subjectId = { $in: scopedSubjectIds.map((s) => s._id) };
    }

    if (department && !['teacher', 'hod'].includes(req.user.role)) {
      scopedSubjectIds = await Subject.find({ department, isActive: true }, { _id: 1 });
      filter.subjectId = { $in: scopedSubjectIds.map((s) => s._id) };
    }

    if (subjectId) {
      if (!isValidObjectId(subjectId)) return res.status(400).json({ message: 'Invalid subjectId' });
      if (scopedSubjectIds && !scopedSubjectIds.some((s) => String(s._id) === subjectId)) {
        return res.status(403).json({ message: 'You are not authorized to view this subject' });
      }
      filter.subjectId = subjectId;
    }

    const records = await Attendance.find(filter)
      .populate('studentId', 'name rollNumber department section')
      .populate('subjectId', 'subjectName subjectCode')
      .sort({ createdAt: 1 });

    res.json(records);
  } catch (error) {
    next(error);
  }
};

// ─── Get Attendance by Student ────────────────────────────────────────────────

// @desc    Get attendance by student
// @route   GET /api/attendance/student/:id
// @access  Private
const getAttendanceByStudent = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid student ID' });
    }

    const { subjectId, startDate, endDate } = req.query;
    const filter = { studentId: req.params.id };

    if (subjectId) {
      if (!isValidObjectId(subjectId)) return res.status(400).json({ message: 'Invalid subjectId' });
      filter.subjectId = subjectId;
    }

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        const d = parseUTCDate(startDate);
        if (!d) return res.status(400).json({ message: 'Invalid startDate' });
        filter.date.$gte = d;
      }
      if (endDate) {
        const d = parseUTCDate(endDate);
        if (!d) return res.status(400).json({ message: 'Invalid endDate' });
        // include the full end day
        filter.date.$lte = new Date(d.getTime() + 24 * 60 * 60 * 1000 - 1);
      }
    }

    const records = await Attendance.find(filter)
      .populate('subjectId', 'subjectName subjectCode')
      .sort({ date: -1 });

    res.json(records);
  } catch (error) {
    next(error);
  }
};

// @desc    Get the authenticated student's attendance summary
// @route   GET /api/attendance/my
// @access  Student
const getMyAttendance = async (req, res, next) => {
  try {
    const student = await Student.findOne({ _id: req.user.studentId, isActive: true })
      .select('name rollNumber');
    if (!student) return res.status(404).json({ message: 'Student record not found' });

    const today = getTodayUTC();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const records = await Attendance.find({
      studentId: student._id,
      // Attendance is cumulative from the student's first recorded class through today.
      date: { $lt: tomorrow },
    }).select('status date');

    const present = records.filter((record) => record.status === 'Present').length;
    const totalClasses = records.length;
    const attendancePercentage = totalClasses === 0 ? 0 : Math.round((present / totalClasses) * 10000) / 100;

    res.json({
      student,
      present,
      absent: totalClasses - present,
      totalClasses,
      attendancePercentage,
      belowThreshold: attendancePercentage < 75,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Get Report ───────────────────────────────────────────────────────────────

// @desc    Get attendance report with stats
// @route   GET /api/attendance/report
// @access  Private
const getReport = async (req, res, next) => {
  try {
    const { subjectId, department, year, section, startDate, endDate, month } = req.query;

    const matchFilter = {};
    let scopedSubjectIds;

    if (req.user.role === 'teacher') {
      scopedSubjectIds = await Subject.find({ teacherId: req.user._id, isActive: true }, { _id: 1 });
      matchFilter.subjectId = { $in: scopedSubjectIds.map((s) => s._id) };
    } else if (req.user.role === 'hod' && req.user.department) {
      scopedSubjectIds = await Subject.find({ department: req.user.department, isActive: true }, { _id: 1 });
      matchFilter.subjectId = { $in: scopedSubjectIds.map((s) => s._id) };
    }

    if (subjectId) {
      if (!isValidObjectId(subjectId)) return res.status(400).json({ message: 'Invalid subjectId' });
      const requestedSubjectId = new mongoose.Types.ObjectId(subjectId);
      if (scopedSubjectIds && !scopedSubjectIds.some((s) => String(s._id) === subjectId)) {
        return res.status(403).json({ message: 'You are not authorized to report on this subject' });
      }
      matchFilter.subjectId = requestedSubjectId;
    }

    if (startDate || endDate || month) {
      matchFilter.date = {};
      if (month) {
        const parts = String(month).split('-');
        if (parts.length !== 2) return res.status(400).json({ message: 'Invalid month format. Use YYYY-MM' });
        const [y, m] = parts.map(Number);
        const monthStart = new Date(Date.UTC(y, m - 1, 1));
        const monthEnd = new Date(Date.UTC(y, m, 1));
        const tomorrow = new Date(getTodayUTC().getTime() + 24 * 60 * 60 * 1000);
        matchFilter.date.$gte = monthStart;
        matchFilter.date.$lt = monthEnd < tomorrow ? monthEnd : tomorrow;
      } else {
        if (startDate) {
          const d = parseUTCDate(startDate);
          if (!d) return res.status(400).json({ message: 'Invalid startDate' });
          matchFilter.date.$gte = d;
        }
        if (endDate) {
          const d = parseUTCDate(endDate);
          if (!d) return res.status(400).json({ message: 'Invalid endDate' });
          matchFilter.date.$lte = new Date(d.getTime() + 24 * 60 * 60 * 1000 - 1);
        }

        const today = getTodayUTC();
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
        if (!matchFilter.date.$lte || matchFilter.date.$lte >= tomorrow) {
          matchFilter.date.$lt = tomorrow;
          delete matchFilter.date.$lte;
        }
      }
    }

    const report = await Attendance.aggregate([
      { $match: matchFilter },
      {
        $lookup: {
          from: 'students', localField: 'studentId', foreignField: '_id', as: 'student',
        },
      },
      { $unwind: '$student' },
      {
        $match: {
          ...(department && { 'student.department': department }),
          ...(req.user.department && ['teacher', 'hod'].includes(req.user.role) && { 'student.department': req.user.department }),
          ...(year       && { 'student.year': Number(year) }),
          ...(section    && { 'student.section': section.toUpperCase() }),
        },
      },
      {
        $lookup: {
          from: 'subjects', localField: 'subjectId', foreignField: '_id', as: 'subject',
        },
      },
      { $unwind: '$subject' },
      {
        $group: {
          _id: '$studentId',
          studentName:  { $first: '$student.name' },
          rollNumber:   { $first: '$student.rollNumber' },
          department:   { $first: '$student.department' },
          year:         { $first: '$student.year' },
          section:      { $first: '$student.section' },
          totalClasses: { $sum: 1 },
          presentCount: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
        },
      },
      {
        $addFields: {
          attendancePercentage: {
            $round: [{ $multiply: [{ $divide: ['$presentCount', '$totalClasses'] }, 100] }, 2],
          },
        },
      },
      { $sort: { rollNumber: 1 } },
    ]);

    res.json(report);
  } catch (error) {
    next(error);
  }
};

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

// @desc    Get dashboard stats
// @route   GET /api/attendance/dashboard
// @access  Private
const getDashboardStats = async (req, res, next) => {
  try {
    const requestedDepartment = req.query.department || '';
    const department = ['teacher', 'hod'].includes(req.user.role) && req.user.department
      ? req.user.department
      : requestedDepartment;
    const todayStr = new Date().toISOString().slice(0, 10);
    const today    = parseUTCDate(todayStr);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const sixMonthsAgo = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 5, 1));

    // Scope to department for teacher/HOD; admin sees all
    const deptFilter = department ? { department } : {};

    // For attendance scoping, find student IDs in this department
    let attendanceMatch = {};
    if (deptFilter.department) {
      const deptStudentIds = await Student.distinct('_id', { department: deptFilter.department, isActive: true });
      attendanceMatch = { studentId: { $in: deptStudentIds } };
    }

    const [totalStudents, todayRecords, monthlyData] = await Promise.all([
      Student.countDocuments({ isActive: true, ...deptFilter }),
      Attendance.find({ date: { $gte: today, $lt: tomorrow }, ...attendanceMatch }),
      Attendance.aggregate([
        { $match: { date: { $gte: sixMonthsAgo, $lt: tomorrow }, ...attendanceMatch } },
        {
          $group: {
            _id:     { year: { $year: '$date' }, month: { $month: '$date' } },
            total:   { $sum: 1 },
            present: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
    ]);

    const presentToday      = todayRecords.filter((r) => r.status === 'Present').length;
    const absentToday       = todayRecords.filter((r) => r.status === 'Absent').length;
    const totalToday        = todayRecords.length;
    const overallPercentage = totalToday > 0 ? Math.round((presentToday / totalToday) * 100) : 0;

    res.json({ totalStudents, presentToday, absentToday, overallPercentage, monthlyData });
  } catch (error) {
    next(error);
  }
};

// ─── Check Attendance ─────────────────────────────────────────────────────────

// @desc    Check if attendance already marked
// @route   GET /api/attendance/check
// @access  Private
const checkAttendance = async (req, res, next) => {
  try {
    const { subjectId, date } = req.query;

    if (!subjectId || !date) {
      return res.status(400).json({ message: 'subjectId and date are required' });
    }
    if (!isValidObjectId(subjectId)) {
      return res.status(400).json({ message: 'Invalid subjectId' });
    }

    const attendanceDate = parseUTCDate(date);
    if (!attendanceDate) {
      return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD' });
    }

    const exists = await Attendance.findOne({ subjectId, date: attendanceDate });
    res.json({ marked: !!exists });
  } catch (error) {
    next(error);
  }
};

// ─── Attendance Calculator ────────────────────────────────────────────────────

// @desc    Calculate attendance stats + projections for a student+subject
// @route   GET /api/attendance/calculator
// @access  Private
// Query params: studentId, subjectId (optional), target (optional, default 75)
const getCalculator = async (req, res, next) => {
  try {
    const { studentId, subjectId, target = 75 } = req.query;

    if (!studentId || !isValidObjectId(studentId)) {
      return res.status(400).json({ message: 'Valid studentId is required' });
    }
    if (subjectId && !isValidObjectId(subjectId)) {
      return res.status(400).json({ message: 'Invalid subjectId' });
    }
    const targetNum = Number(target);
    if (!Number.isFinite(targetNum) || targetNum <= 0 || targetNum > 100) {
      return res.status(400).json({ message: 'target must be a number between 1 and 100' });
    }

    const filter = { studentId };
    if (subjectId) filter.subjectId = subjectId;

    // Aggregate per-subject totals for this student
    const rows = await Attendance.aggregate([
      { $match: { studentId: new mongoose.Types.ObjectId(studentId), ...(subjectId && { subjectId: new mongoose.Types.ObjectId(subjectId) }) } },
      {
        $group: {
          _id: '$subjectId',
          total:   { $sum: 1 },
          present: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
        },
      },
      {
        $lookup: { from: 'subjects', localField: '_id', foreignField: '_id', as: 'subject' },
      },
      { $unwind: { path: '$subject', preserveNullAndEmptyArrays: true } },
      { $sort: { 'subject.subjectName': 1 } },
    ]);

    const results = rows.map((row) => ({
      subjectId:   row._id,
      subjectName: row.subject?.subjectName || 'Unknown',
      subjectCode: row.subject?.subjectCode || '',
      ...calculate(row.present, row.total, targetNum),
    }));

    // Overall across all subjects
    const totalAttended = results.reduce((s, r) => s + r.attended, 0);
    const totalClasses  = results.reduce((s, r) => s + r.total, 0);
    const overall = calculate(totalAttended, totalClasses, targetNum);

    res.json({ overall, bySubject: results });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  markAttendance,
  getAttendanceByDate,
  getAttendanceByStudent,
  getMyAttendance,
  getReport,
  getDashboardStats,
  checkAttendance,
  getCalculator,
};
