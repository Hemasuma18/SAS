const express = require('express');
const { body } = require('express-validator');
const { register, login, getMe, getUsers, updateUser, deleteUser } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email')
    .if((value, { req }) => req.body.role !== 'student_cr')
    .isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['admin', 'teacher', 'hod', 'student_cr']).withMessage('Invalid role'),
];

const loginValidation = [
  body('password').notEmpty().withMessage('Password is required'),
  body('email')
    .if((value, { req }) => !req.body.rollNumber)
    .isEmail().withMessage('Valid email is required'),
];

router.post('/register', protect, authorize('admin'), registerValidation, register);
router.post('/login', loginValidation, login);
router.get('/me', protect, getMe);
router.get('/users', protect, authorize('admin', 'hod'), getUsers);
router.put('/users/:id', protect, authorize('admin'), updateUser);
router.delete('/users/:id', protect, authorize('admin'), deleteUser);

module.exports = router;
