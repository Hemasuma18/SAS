const express = require('express');
const multer = require('multer');
const { parseImport, confirmImport } = require('../controllers/importController');
const { parseAcademicImport, confirmAcademicImport } = require('../controllers/academicImportController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Memory storage — no files written to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (req, file, cb) => {
    const allowed = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/pdf',
    ];
    const ext = file.originalname.split('.').pop().toLowerCase();
    const allowedExts = ['csv', 'xls', 'xlsx', 'pdf'];
    if (allowed.includes(file.mimetype) || allowedExts.includes(ext)) {
      return cb(null, true);
    }
    cb(new Error('Only CSV, Excel (.xls/.xlsx), and PDF files are allowed'));
  },
});

// POST /api/import/parse  — parse + validate, no DB write
router.post('/parse', protect, authorize('admin'), upload.single('file'), parseImport);

// POST /api/import/confirm — insert valid records after admin confirmation
router.post('/confirm', protect, authorize('admin'), confirmImport);

// POST /api/import/academic/parse  — parse all 4 entity types, no DB write
router.post('/academic/parse', protect, authorize('admin'), upload.single('file'), parseAcademicImport);

// POST /api/import/academic/confirm — insert all valid academic records
router.post('/academic/confirm', protect, authorize('admin'), confirmAcademicImport);

module.exports = router;
