const express = require('express');
const { body } = require('express-validator');
const {
  getSubjects, getSubject, createSubject, updateSubject, deleteSubject,
} = require('../controllers/subjectController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

const subjectValidation = [
  body('subjectName').trim().notEmpty().withMessage('Subject name is required'),
  body('subjectCode').trim().notEmpty().withMessage('Subject code is required'),
  body('department').trim().notEmpty().withMessage('Department is required'),
  body('year').isInt({ min: 1, max: 4 }).withMessage('Year must be between 1 and 4'),
  body('teacherId').notEmpty().withMessage('Teacher is required'),
];

router.route('/')
  .get(protect, getSubjects)
  .post(protect, authorize('admin'), subjectValidation, createSubject);

router.route('/:id')
  .get(protect, getSubject)
  .put(protect, authorize('admin'), updateSubject)
  .delete(protect, authorize('admin'), deleteSubject);

module.exports = router;
