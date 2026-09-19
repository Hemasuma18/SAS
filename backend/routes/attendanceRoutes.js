const express = require('express');
const {
  markAttendance,
  getAttendanceByDate,
  getAttendanceByStudent,
  getReport,
  getDashboardStats,
  checkAttendance,
  getCalculator,
} = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/mark', protect, authorize('teacher', 'admin', 'student_cr'), markAttendance);
router.get('/dashboard', protect, getDashboardStats);
router.get('/check', protect, checkAttendance);
router.get('/calculator', protect, getCalculator);
router.get('/report', protect, authorize('teacher', 'admin', 'hod'), getReport);
router.get('/date/:date', protect, getAttendanceByDate);
router.get('/student/:id', protect, getAttendanceByStudent);

module.exports = router;
