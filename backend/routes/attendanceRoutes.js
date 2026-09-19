const express = require('express');
const {
  markAttendance,
  getAttendanceByDate,
  getAttendanceByStudent,
  getMyAttendance,
  getReport,
  getDashboardStats,
  checkAttendance,
  getCalculator,
} = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/mark', protect, authorize('teacher', 'admin', 'student_cr'), markAttendance);
router.get('/my', protect, authorize('student'), getMyAttendance);
router.get('/dashboard', protect, authorize('admin', 'teacher', 'hod', 'student_cr'), getDashboardStats);
router.get('/check', protect, authorize('admin', 'teacher', 'student_cr'), checkAttendance);
router.get('/calculator', protect, authorize('admin', 'teacher', 'hod', 'student_cr'), getCalculator);
router.get('/report', protect, authorize('teacher', 'admin', 'hod'), getReport);
router.get('/date/:date', protect, authorize('admin', 'teacher', 'hod', 'student_cr'), getAttendanceByDate);
router.get('/student/:id', protect, authorize('admin', 'teacher', 'hod', 'student_cr'), getAttendanceByStudent);

module.exports = router;
