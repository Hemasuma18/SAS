const { validationResult } = require('express-validator');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const User = require('../models/User');
const Timetable = require('../models/Timetable');
const { ensureStudentAccount } = require('../utils/studentAccount');

// @desc    Get all students with search, filter, pagination
// @route   GET /api/students
// @access  Private
const getStudents = async (req, res, next) => {
  try {
    const { department, year, section, search, page = 1, limit = 20 } = req.query;
    const filter = { isActive: true };

    const departmentScope = ['teacher', 'hod'].includes(req.user.role) && req.user.department;
    if (departmentScope) filter.department = req.user.department;
    if (department && !departmentScope) filter.department = { $regex: department, $options: 'i' };
    if (year) filter.year = Number(year);
    if (section) filter.section = section.toUpperCase();
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { rollNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Student.countDocuments(filter);
    const students = await Student.find(filter)
      .sort({ rollNumber: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ students, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single student
// @route   GET /api/students/:id
// @access  Private
const getStudent = async (req, res, next) => {
  try {
    const student = await Student.findOne({ _id: req.params.id, isActive: true });
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.json(student);
  } catch (error) {
    next(error);
  }
};

// @desc    Create student
// @route   POST /api/students
// @access  Admin
const createStudent = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const student = await Student.create(req.body);
    await ensureStudentAccount(student);
    res.status(201).json(student);
  } catch (error) {
    next(error);
  }
};

// @desc    Update student
// @route   PUT /api/students/:id
// @access  Admin
const updateStudent = async (req, res, next) => {
  try {
    const { name, rollNumber, department, year, section, email, phone } = req.body;
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { name, rollNumber, department, year, section, email, phone },
      { new: true, runValidators: true }
    );
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.json(student);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete student (soft delete — preserves attendance history)
// @route   DELETE /api/students/:id
// @access  Admin
const deleteStudent = async (req, res, next) => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.json({ message: 'Student deactivated' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get distinct active department names
// @route   GET /api/students/departments
// @access  Private
const getDepartments = async (req, res, next) => {
  try {
    if (['teacher', 'hod'].includes(req.user.role) && req.user.department) {
      return res.json([req.user.department]);
    }
    const [studentDepartments, subjectDepartments, userDepartments, timetableDepartments] = await Promise.all([
      Student.distinct('department', { isActive: true }),
      Subject.distinct('department', { isActive: true }),
      User.distinct('department', { isActive: true }),
      Timetable.distinct('department', { department: { $exists: true } }),
    ]);
    res.json([...new Set([...studentDepartments, ...subjectDepartments, ...userDepartments, ...timetableDepartments].filter(Boolean))].sort());
  } catch (error) {
    next(error);
  }
};

const getSections = async (req, res, next) => {
  try {
    const departmentScope = ['teacher', 'hod'].includes(req.user.role) && req.user.department
      ? req.user.department
      : req.query.department;
    const filter = { isActive: true, ...(departmentScope && { department: departmentScope }) };
    res.json((await Student.distinct('section', filter)).filter(Boolean).sort());
  } catch (error) {
    next(error);
  }
};

module.exports = { getStudents, getStudent, createStudent, updateStudent, deleteStudent, getDepartments, getSections };
