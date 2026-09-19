const express = require('express');
const { getTimetable, getTimetableGrouped, getSections, upsertSlot, deleteSlot } = require('../controllers/timetableController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/sections', protect, authorize('admin', 'teacher', 'hod', 'student_cr'), getSections);
router.get('/', protect, authorize('admin', 'teacher', 'hod', 'student_cr'), getTimetable);
router.get('/grouped', protect, authorize('admin', 'teacher', 'hod', 'student_cr'), getTimetableGrouped);
router.put('/', protect, authorize('admin'), upsertSlot);
router.delete('/:id', protect, authorize('admin'), deleteSlot);

module.exports = router;
