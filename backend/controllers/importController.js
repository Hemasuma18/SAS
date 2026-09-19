const XLSX = require('xlsx');
const pdfParse = require('pdf-parse');
const Student = require('../models/Student');
const logger = require('../utils/logger');
const { ensureStudentAccount } = require('../utils/studentAccount');

// ─── Field normalisation map ──────────────────────────────────────────────────
// Maps common header variants (lowercase, trimmed) → canonical field name
const HEADER_MAP = {
  name: 'name', fullname: 'name', 'full name': 'name', 'student name': 'name',
  rollnumber: 'rollNumber', roll: 'rollNumber', 'roll number': 'rollNumber',
  'roll no': 'rollNumber', rollno: 'rollNumber', 'roll no.': 'rollNumber',
  department: 'department', dept: 'department',
  year: 'year',
  section: 'section',
  email: 'email', 'email address': 'email',
  phone: 'phone', mobile: 'phone', 'phone number': 'phone',
};

const REQUIRED = ['name', 'rollNumber', 'department', 'year', 'section'];
const VALID_YEARS = [1, 2, 3, 4];

// ─── Row → normalised object ──────────────────────────────────────────────────
function normaliseRow(rawRow) {
  const out = {};
  for (const [key, val] of Object.entries(rawRow)) {
    const canonical = HEADER_MAP[key.trim().toLowerCase()];
    if (canonical && val !== undefined && val !== null && String(val).trim() !== '') {
      out[canonical] = String(val).trim();
    }
  }
  if (out.year) out.year = Number(out.year);
  if (out.rollNumber) out.rollNumber = out.rollNumber.toUpperCase();
  if (out.section) out.section = out.section.toUpperCase();
  if (out.email) out.email = out.email.toLowerCase();
  return out;
}

// ─── Validate a single normalised row ────────────────────────────────────────
function validateRow(row) {
  const errors = [];
  for (const f of REQUIRED) {
    if (!row[f] && row[f] !== 0) errors.push(`Missing ${f}`);
  }
  if (row.year && !VALID_YEARS.includes(row.year)) {
    errors.push(`Year must be 1–4 (got ${row.year})`);
  }
  return errors;
}

// ─── Parse CSV / Excel buffer ─────────────────────────────────────────────────
function parseSpreadsheet(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  // header:1 → first row as keys
  return XLSX.utils.sheet_to_json(ws, { defval: '' });
}

// ─── Parse PDF buffer → rows ──────────────────────────────────────────────────
// Strategy: extract text, split into lines, detect header row, parse data rows.
async function parsePDF(buffer) {
  const { text } = await pdfParse(buffer);
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  // Find the header line — must contain at least 3 of our known header words
  const knownWords = Object.keys(HEADER_MAP);
  let headerIdx = -1;
  let headers = [];

  for (let i = 0; i < lines.length; i++) {
    const cols = lines[i].split(/\s{2,}|\t/).map((c) => c.trim().toLowerCase());
    const matches = cols.filter((c) => knownWords.includes(c) || knownWords.includes(c.replace(/[.\s]/g, '')));
    if (matches.length >= 3) {
      headerIdx = i;
      headers = cols;
      break;
    }
  }

  if (headerIdx === -1) return [];

  const rows = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cols = lines[i].split(/\s{2,}|\t/).map((c) => c.trim());
    if (cols.length < 3) continue;
    const row = {};
    headers.forEach((h, idx) => { if (cols[idx]) row[h] = cols[idx]; });
    rows.push(row);
  }
  return rows;
}

// ─── POST /api/import/parse ───────────────────────────────────────────────────
// Accepts multipart file, parses it, validates rows, checks DB duplicates.
// Returns preview — does NOT write to DB.
const parseImport = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const { mimetype, originalname, buffer } = req.file;
    const ext = originalname.split('.').pop().toLowerCase();

    let rawRows = [];

    if (ext === 'pdf' || mimetype === 'application/pdf') {
      rawRows = await parsePDF(buffer);
      if (rawRows.length === 0) {
        return res.status(422).json({
          message: 'Could not detect a student table in this PDF. Ensure the PDF has a header row with columns like Name, Roll Number, Department, Year, Section separated by multiple spaces or tabs.',
        });
      }
    } else {
      // CSV or Excel
      rawRows = parseSpreadsheet(buffer);
    }

    if (rawRows.length === 0) {
      return res.status(422).json({ message: 'File is empty or has no data rows' });
    }

    // Normalise all rows
    const normalised = rawRows.map(normaliseRow);

    // Detect within-file duplicate roll numbers
    const seenRolls = new Map(); // rollNumber → first index
    const fileResults = normalised.map((row, idx) => {
      const validationErrors = validateRow(row);
      let isDuplicateInFile = false;

      if (row.rollNumber) {
        if (seenRolls.has(row.rollNumber)) {
          isDuplicateInFile = true;
          validationErrors.push(`Duplicate roll number in file (first seen at row ${seenRolls.get(row.rollNumber) + 1})`);
        } else {
          seenRolls.set(row.rollNumber, idx);
        }
      }

      return { row, errors: validationErrors, isDuplicateInFile };
    });

    // Check DB for existing roll numbers (only for rows that passed file-level validation)
    const candidateRolls = fileResults
      .filter((r) => r.errors.length === 0)
      .map((r) => r.row.rollNumber);

    const existingInDB = await Student.find(
      { rollNumber: { $in: candidateRolls } },
      { rollNumber: 1 }
    ).lean();
    const dbRollSet = new Set(existingInDB.map((s) => s.rollNumber));

    // Final classification
    const valid = [];
    const duplicates = [];
    const invalid = [];

    fileResults.forEach(({ row, errors, isDuplicateInFile }) => {
      if (errors.length > 0) {
        invalid.push({ ...row, _errors: errors });
      } else if (dbRollSet.has(row.rollNumber)) {
        duplicates.push({ ...row, _errors: ['Roll number already exists in database'] });
      } else {
        valid.push(row);
      }
    });

    logger.info(`Import parse: ${valid.length} valid, ${duplicates.length} duplicates, ${invalid.length} invalid from ${originalname}`);

    res.json({
      total: rawRows.length,
      validCount: valid.length,
      duplicateCount: duplicates.length,
      invalidCount: invalid.length,
      valid,
      duplicates,
      invalid,
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/import/confirm ─────────────────────────────────────────────────
// Receives the already-validated `valid` array from the frontend and inserts them.
// Re-validates server-side to prevent bypassing the preview step.
const confirmImport = async (req, res, next) => {
  try {
    const { records } = req.body;

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: 'No records to import' });
    }

    // Re-validate every record server-side
    const clean = [];
    const rejected = [];

    for (const rec of records) {
      const row = normaliseRow(rec); // re-normalise in case of tampering
      const errors = validateRow(row);
      if (errors.length > 0) {
        rejected.push({ rollNumber: row.rollNumber, errors });
        continue;
      }
      clean.push(row);
    }

    if (clean.length === 0) {
      return res.status(400).json({ message: 'All records failed server-side validation', rejected });
    }

    // Final DB duplicate check
    const rolls = clean.map((r) => r.rollNumber);
    const existing = await Student.find({ rollNumber: { $in: rolls } }, { rollNumber: 1 }).lean();
    const existingSet = new Set(existing.map((s) => s.rollNumber));

    const toInsert = clean.filter((r) => !existingSet.has(r.rollNumber));
    const dbDuplicates = clean.filter((r) => existingSet.has(r.rollNumber)).map((r) => r.rollNumber);

    if (toInsert.length === 0) {
      return res.status(400).json({ message: 'All records already exist in the database', duplicates: dbDuplicates });
    }

    // Insert — ordered:false so one failure doesn't abort the batch
    const inserted = await Student.insertMany(toInsert, { ordered: false });
    await Promise.all(inserted.map(ensureStudentAccount));

    logger.info(`Import confirmed by ${req.user.name}: ${inserted.length} students inserted`);

    res.status(201).json({
      message: `Successfully imported ${inserted.length} student${inserted.length !== 1 ? 's' : ''}`,
      inserted: inserted.length,
      skippedDuplicates: dbDuplicates.length,
      skippedInvalid: rejected.length,
    });
  } catch (error) {
    // insertMany partial duplicate (11000) — still report what was inserted
    if (error.code === 11000 || error.writeErrors) {
      const inserted = error.insertedDocs?.length ?? 0;
      return res.status(207).json({
        message: `Partial import: ${inserted} inserted, some duplicates skipped`,
        inserted,
      });
    }
    next(error);
  }
};

module.exports = { parseImport, confirmImport };
