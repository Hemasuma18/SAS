const express = require('express');
const { getTimetable, getTimetableGrouped, getSections, upsertSlot, deleteSlot } = require('../controllers/timetableController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/sections', protect, getSections);
router.get('/', protect, getTimetable);
router.get('/grouped', protect, getTimetableGrouped);
router.put('/', protect, authorize('admin'), upsertSlot);
router.delete('/:id', protect, authorize('admin'), deleteSlot);

module.exports = router;
