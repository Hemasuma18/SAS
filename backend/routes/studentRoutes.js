const express = require('express');
const { body } = require('express-validator');
const {
  getStudents, getStudent, createStudent, updateStudent, deleteStudent, getDepartments, getSections,
} = require('../controllers/studentController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

const studentValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('rollNumber').trim().notEmpty().withMessage('Roll number is required'),
  body('department').trim().notEmpty().withMessage('Department is required'),
  body('year').isInt({ min: 1, max: 4 }).withMessage('Year must be between 1 and 4'),
  body('section').trim().notEmpty().withMessage('Section is required'),
];

router.get('/departments', protect, authorize('admin', 'teacher', 'hod', 'student_cr'), getDepartments);
router.get('/sections', protect, authorize('admin', 'teacher', 'hod', 'student_cr'), getSections);

router.route('/')
  .get(protect, authorize('admin', 'teacher', 'hod', 'student_cr'), getStudents)
  .post(protect, authorize('admin'), studentValidation, createStudent);

router.route('/:id')
  .get(protect, authorize('admin', 'teacher', 'hod', 'student_cr'), getStudent)
  .put(protect, authorize('admin'), updateStudent)
  .delete(protect, authorize('admin'), deleteStudent);

module.exports = router;
