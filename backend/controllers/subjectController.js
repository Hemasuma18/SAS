const { validationResult } = require('express-validator');
const Subject = require('../models/Subject');

// @desc    Get subjects (teacher gets own, admin gets all)
// @route   GET /api/subjects
// @access  Private
const getSubjects = async (req, res, next) => {
  try {
    const { department, year } = req.query;
    const filter = { isActive: true };

    // Teachers only see subjects assigned to them. HODs are scoped to their department.
    if (req.user.role === 'teacher') {
      filter.teacherId = req.user._id;
      if (req.user.department) filter.department = req.user.department;
    } else if (req.user.role === 'hod' && req.user.department) {
      filter.department = req.user.department;
    }
    if (department && req.user.role !== 'teacher' && req.user.role !== 'hod') {
      filter.department = { $regex: department, $options: 'i' };
    }
    if (year) filter.year = Number(year);

    const subjects = await Subject.find(filter)
      .populate('teacherId', 'name email')
      .sort({ subjectName: 1 });

    res.json(subjects);
  } catch (error) {
    next(error);
  }
};

// @desc    Get single subject
// @route   GET /api/subjects/:id
// @access  Private
const getSubject = async (req, res, next) => {
  try {
    const subject = await Subject.findById(req.params.id).populate('teacherId', 'name email');
    if (!subject) return res.status(404).json({ message: 'Subject not found' });
    res.json(subject);
  } catch (error) {
    next(error);
  }
};

// @desc    Create subject
// @route   POST /api/subjects
// @access  Admin
const createSubject = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const subject = await Subject.create(req.body);
    const populated = await subject.populate('teacherId', 'name email');
    res.status(201).json(populated);
  } catch (error) {
    next(error);
  }
};

// @desc    Update subject
// @route   PUT /api/subjects/:id
// @access  Admin
const updateSubject = async (req, res, next) => {
  try {
    const { subjectName, subjectCode, department, year, semester, teacherId } = req.body;
    const subject = await Subject.findByIdAndUpdate(
      req.params.id,
      { subjectName, subjectCode, department, year, semester, teacherId },
      { new: true, runValidators: true }
    ).populate('teacherId', 'name email');

    if (!subject) return res.status(404).json({ message: 'Subject not found' });
    res.json(subject);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete subject (soft delete — preserves attendance history)
// @route   DELETE /api/subjects/:id
// @access  Admin
const deleteSubject = async (req, res, next) => {
  try {
    const subject = await Subject.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!subject) return res.status(404).json({ message: 'Subject not found' });
    res.json({ message: 'Subject deactivated' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getSubjects, getSubject, createSubject, updateSubject, deleteSubject };
