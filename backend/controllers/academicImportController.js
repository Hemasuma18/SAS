const XLSX = require('xlsx');
const bcrypt = require('bcryptjs');
const pdfParse = require('pdf-parse');
const User = require('../models/User');
const Subject = require('../models/Subject');
const Timetable = require('../models/Timetable');
const Student = require('../models/Student');
const logger = require('../utils/logger');

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const VALID_YEARS = [1, 2, 3, 4];
const VALID_TYPES = ['theory', 'lab', 'activity', 'break', 'free'];

// ─── Sheet name detection ─────────────────────────────────────────────────────

const SHEET_ALIASES = {
  faculty:   ['faculty', 'teachers', 'staff', 'faculties'],
  subjects:  ['subjects', 'subject', 'courses', 'course'],
  timetable: ['timetable', 'time table', 'schedule', 'timetables'],
  students:  ['students', 'student', 'pupils'],
};

function detectSheetType(name) {
  const lower = name.trim().toLowerCase();
  for (const [type, aliases] of Object.entries(SHEET_ALIASES)) {
    if (aliases.some((a) => lower.includes(a))) return type;
  }
  return null;
}

// ─── Header normalisation maps ────────────────────────────────────────────────

const FACULTY_HEADERS = {
  name: 'name', fullname: 'name', 'full name': 'name', 'faculty name': 'name', 'teacher name': 'name',
  employeeid: 'employeeId', 'employee id': 'employeeId', 'faculty id': 'employeeId',
  email: 'email', 'email address': 'email', 'email id': 'email',
  password: 'password', pass: 'password',
  role: 'role',
  department: 'department', dept: 'department',
};

const SUBJECT_HEADERS = {
  subjectname: 'subjectName', 'subject name': 'subjectName', subject: 'subjectName', name: 'subjectName',
  subjectcode: 'subjectCode', 'subject code': 'subjectCode', code: 'subjectCode',
  department: 'department', dept: 'department',
  year: 'year',
  semester: 'semester', sem: 'semester',
  teacherid: 'teacherId', 'teacher id': 'teacherId', 'faculty id': 'teacherId', 'faculty code': 'teacherId',
  teacheremail: 'teacherEmail', 'teacher email': 'teacherEmail', 'teacher email id': 'teacherEmail',
  facultyemail: 'teacherEmail', 'faculty email': 'teacherEmail', 'faculty email id': 'teacherEmail',
  teachername: 'teacherEmail', 'teacher name': 'teacherEmail',
  facultyname: 'teacherEmail', 'faculty name': 'teacherEmail',
  instructor: 'teacherEmail', 'instructor name': 'teacherEmail',
  teacher: 'teacherEmail', faculty: 'teacherEmail',
};

const TIMETABLE_HEADERS = {
  day: 'day',
  hour: 'hour', period: 'hour', 'period no': 'hour', 'hour no': 'hour', 'period number': 'hour',
  starttime: 'startTime', 'start time': 'startTime', start: 'startTime', 'start_time': 'startTime',
  endtime: 'endTime', 'end time': 'endTime', end: 'endTime', 'end_time': 'endTime',
  subjectcode: 'subjectCode', 'subject code': 'subjectCode', code: 'subjectCode', 'subject_code': 'subjectCode',
  facultyname: 'facultyName', 'faculty name': 'facultyName', faculty: 'facultyName', teacher: 'facultyName', 'faculty_name': 'facultyName',
  type: 'type',
  room: 'room',
  department: 'department', dept: 'department',
  teacherid: 'teacherId', 'teacher id': 'teacherId',
  section: 'section',
  academicyear: 'academicYear', 'academic year': 'academicYear', 'academic_year': 'academicYear',
  semester: 'semester', sem: 'semester',
  note: 'note',
};

const STUDENT_HEADERS = {
  name: 'name', fullname: 'name', 'full name': 'name', 'student name': 'name',
  rollnumber: 'rollNumber', roll: 'rollNumber', 'roll number': 'rollNumber',
  'roll no': 'rollNumber', rollno: 'rollNumber', 'roll no.': 'rollNumber',
  department: 'department', dept: 'department',
  year: 'year',
  section: 'section',
  email: 'email', 'email address': 'email',
  phone: 'phone', mobile: 'phone', 'phone number': 'phone',
};

// ─── Generic row normaliser ───────────────────────────────────────────────────

function normaliseRow(rawRow, headerMap) {
  const out = {};
  for (const [key, val] of Object.entries(rawRow)) {
    const canonical = headerMap[key.trim().toLowerCase()];
    if (canonical && val !== undefined && val !== null && String(val).trim() !== '') {
      out[canonical] = String(val).trim();
    }
  }
  return out;
}

// ─── Parse a single worksheet into raw row objects ────────────────────────────

function sheetToRows(ws) {
  return XLSX.utils.sheet_to_json(ws, { defval: '' });
}

// ─── PDF text → rows (best-effort, tab/multi-space delimited) ─────────────────

async function parsePDFSheet(buffer, headerMap) {
  const { text } = await pdfParse(buffer);
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const knownHeaders = Object.keys(headerMap);

  let headerIdx = -1;
  let headers = [];
  for (let i = 0; i < lines.length; i++) {
    const cols = lines[i].split(/\s{2,}|\t/).map((c) => c.trim().toLowerCase());
    const matches = cols.filter((c) => knownHeaders.includes(c));
    if (matches.length >= 2) { headerIdx = i; headers = cols; break; }
  }
  if (headerIdx === -1) return [];

  const rows = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cols = lines[i].split(/\s{2,}|\t/).map((c) => c.trim());
    if (cols.length < 2) continue;
    const row = {};
    headers.forEach((h, idx) => { if (cols[idx]) row[h] = cols[idx]; });
    rows.push(row);
  }
  return rows;
}

// ─── Validators ───────────────────────────────────────────────────────────────

function validateFaculty(row) {
  const errors = [];
  if (!row.name) errors.push('Missing name');
  if (!row.email) errors.push('Missing email');
  if (!row.password) errors.push('Missing password');
  if (row.password && row.password.length < 6) errors.push('Password must be at least 6 characters');
  if (row.role && !['teacher', 'hod', 'admin', 'student_cr'].includes(row.role.toLowerCase())) {
    errors.push(`Invalid role "${row.role}"`);
  }
  return errors;
}

function validateSubject(row) {
  const errors = [];
  if (!row.subjectName) errors.push('Missing subjectName');
  if (!row.subjectCode) errors.push('Missing subjectCode');
  if (!row.department) errors.push('Missing department');
  if (!row.year) errors.push('Missing year');
  else if (!VALID_YEARS.includes(Number(row.year))) errors.push(`Year must be 1–4 (got ${row.year})`);
  return errors;
}

function validateTimetable(row) {
  const errors = [];
  if (!row.day) errors.push('Missing day');
  else if (!DAYS.includes(row.day)) errors.push(`Invalid day "${row.day}"`);
  if (row.hour === undefined || row.hour === null || row.hour === '') errors.push('Missing hour');
  else if (isNaN(Number(row.hour)) || Number(row.hour) < 1 || Number(row.hour) > 8) errors.push('Hour must be 1–8');
  if (!row.startTime) errors.push('Missing startTime');
  if (!row.endTime) errors.push('Missing endTime');
  if (!row.department) errors.push('Missing department');
  if (!row.section) errors.push('Missing section');
  if (row.type && !VALID_TYPES.includes(row.type.toLowerCase())) errors.push(`Invalid type "${row.type}"`);
  return errors;
}

function validateStudent(row) {
  const errors = [];
  if (!row.name) errors.push('Missing name');
  if (!row.rollNumber) errors.push('Missing rollNumber');
  if (!row.department) errors.push('Missing department');
  if (!row.year) errors.push('Missing year');
  else if (!VALID_YEARS.includes(Number(row.year))) errors.push(`Year must be 1–4 (got ${row.year})`);
  if (!row.section) errors.push('Missing section');
  return errors;
}

// ─── Normalise faculty row values ─────────────────────────────────────────────

function normaliseFaculty(row) {
  const r = { ...row };
  if (r.email) r.email = r.email.toLowerCase();
  if (r.role) r.role = r.role.toLowerCase(); else r.role = 'teacher';
  return r;
}

function normaliseSubject(row) {
  const r = { ...row };
  if (r.subjectCode) r.subjectCode = r.subjectCode.toUpperCase();
  if (r.year) r.year = Number(r.year);
  if (r.semester) r.semester = Number(r.semester);
  if (r.teacherEmail) r.teacherEmail = r.teacherEmail.toLowerCase();
  return r;
}

function personKey(value) {
  return String(value || '').trim().toLowerCase();
}

function resolveSubjectTeacherReferences(parsed) {
  const facultyByEmployeeId = new Map();

  parsed.faculty.forEach((rawFaculty) => {
    const faculty = normaliseFaculty(rawFaculty);
    if (faculty.employeeId) facultyByEmployeeId.set(personKey(faculty.employeeId), faculty);
  });

  parsed.subjects = parsed.subjects.map((rawSubject) => {
    if (rawSubject.teacherEmail || !rawSubject.teacherId) return rawSubject;

    const faculty = facultyByEmployeeId.get(personKey(rawSubject.teacherId));
    if (!faculty) return rawSubject;

    return {
      ...rawSubject,
      teacherEmail: faculty.email || faculty.name,
    };
  });

  return parsed;
}

// Convert Excel fractional time (0.375 = 09:00) to "HH:MM" string
function excelTimeToHHMM(val) {
  const n = Number(val);
  if (isNaN(n) || n < 0 || n >= 1) return String(val).trim(); // already a string like "09:00"
  const totalMins = Math.round(n * 24 * 60);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Expand common day abbreviations to full names expected by the schema
const DAY_ALIASES = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday',
  thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
  thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday',
};

// Maps startTime "HH:MM" → hour number (1-based, 09:00 = 1)
const START_TIME_TO_HOUR = {
  '09:00': 1, '10:00': 2, '11:00': 3, '12:00': 4,
  '13:00': 5, '14:00': 6, '15:00': 7, '16:00': 8,
};

function normaliseTimetable(row) {
  const r = { ...row };
  if (r.semester) r.semester = Number(r.semester);
  if (r.subjectCode) r.subjectCode = r.subjectCode.toUpperCase();
  if (r.section) r.section = r.section.toUpperCase();
  if (r.type) r.type = r.type.toLowerCase(); else r.type = 'theory';
  if (r.day) r.day = DAY_ALIASES[r.day.trim().toLowerCase()] || r.day;
  if (r.startTime) r.startTime = excelTimeToHHMM(r.startTime);
  if (r.endTime)   r.endTime   = excelTimeToHHMM(r.endTime);
  // Derive hour from startTime if not provided
  if (r.hour !== undefined && r.hour !== '') {
    r.hour = Number(r.hour);
  } else if (r.startTime && START_TIME_TO_HOUR[r.startTime]) {
    r.hour = START_TIME_TO_HOUR[r.startTime];
  }
  return r;
}

function normaliseStudent(row) {
  const r = { ...row };
  if (r.rollNumber) r.rollNumber = r.rollNumber.toUpperCase();
  if (r.section) r.section = r.section.toUpperCase();
  if (r.email) r.email = r.email.toLowerCase();
  if (r.year) r.year = Number(r.year);
  return r;
}

// ─── Parse workbook into categorised sheets ───────────────────────────────────

function parseWorkbook(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const result = { faculty: [], subjects: [], timetable: [], students: [] };

  for (const sheetName of wb.SheetNames) {
    const type = detectSheetType(sheetName);
    if (!type) continue;
    const ws = wb.Sheets[sheetName];
    const rawRows = sheetToRows(ws);

    const headerMap = { faculty: FACULTY_HEADERS, subjects: SUBJECT_HEADERS, timetable: TIMETABLE_HEADERS, students: STUDENT_HEADERS }[type];
    result[type] = rawRows.map((r) => normaliseRow(r, headerMap));
  }

  return result;
}

// ─── Parse single-sheet CSV/Excel (auto-detect type from headers) ─────────────

function parseSingleSheet(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rawRows = sheetToRows(ws);
  if (rawRows.length === 0) return { faculty: [], subjects: [], timetable: [], students: [] };

  // Detect type by which header map has the most matches
  const firstRowKeys = Object.keys(rawRows[0]).map((k) => k.trim().toLowerCase());
  const scores = {
    faculty:   Object.keys(FACULTY_HEADERS).filter((h) => firstRowKeys.includes(h)).length,
    subjects:  Object.keys(SUBJECT_HEADERS).filter((h) => firstRowKeys.includes(h)).length,
    timetable: Object.keys(TIMETABLE_HEADERS).filter((h) => firstRowKeys.includes(h)).length,
    students:  Object.keys(STUDENT_HEADERS).filter((h) => firstRowKeys.includes(h)).length,
  };
  const detected = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];

  const headerMap = { faculty: FACULTY_HEADERS, subjects: SUBJECT_HEADERS, timetable: TIMETABLE_HEADERS, students: STUDENT_HEADERS }[detected];
  const result = { faculty: [], subjects: [], timetable: [], students: [] };
  result[detected] = rawRows.map((r) => normaliseRow(r, headerMap));
  return result;
}

// ─── Classify rows into valid/duplicate/invalid ───────────────────────────────

function classifyRows(rows, validateFn, normaliseFn, dedupeKey) {
  const seen = new Map();
  const valid = [], duplicates = [], invalid = [];

  rows.forEach((raw, idx) => {
    const row = normaliseFn(raw);
    const errors = validateFn(row);
    if (errors.length > 0) {
      invalid.push({ ...row, _errors: errors });
      return;
    }
    const key = dedupeKey ? row[dedupeKey] : null;
    if (key && seen.has(key)) {
      duplicates.push({ ...row, _errors: [`Duplicate ${dedupeKey} in file (first at row ${seen.get(key) + 1})`] });
      return;
    }
    if (key) seen.set(key, idx);
    valid.push(row);
  });

  return { valid, duplicates, invalid };
}

// ─── Detect department from parsed data ───────────────────────────────────────

function detectDepartment(parsed) {
  const sources = [...parsed.students, ...parsed.subjects];
  const depts = sources.map((r) => r.department).filter(Boolean);
  if (depts.length === 0) return null;
  // Return the most frequent department string
  const freq = {};
  depts.forEach((d) => { freq[d] = (freq[d] || 0) + 1; });
  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
}

// ─── POST /api/import/academic/parse ─────────────────────────────────────────

const parseAcademicImport = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const { mimetype, originalname, buffer } = req.file;
    const ext = originalname.split('.').pop().toLowerCase();

    let parsed;

    if (ext === 'pdf' || mimetype === 'application/pdf') {
      // PDF: try to detect all four entity types from the single text stream
      const [fRows, sRows, ttRows, stRows] = await Promise.all([
        parsePDFSheet(buffer, FACULTY_HEADERS),
        parsePDFSheet(buffer, SUBJECT_HEADERS),
        parsePDFSheet(buffer, TIMETABLE_HEADERS),
        parsePDFSheet(buffer, STUDENT_HEADERS),
      ]);
      parsed = {
        faculty:   fRows.map((r) => normaliseRow(r, FACULTY_HEADERS)),
        subjects:  sRows.map((r) => normaliseRow(r, SUBJECT_HEADERS)),
        timetable: ttRows.map((r) => normaliseRow(r, TIMETABLE_HEADERS)),
        students:  stRows.map((r) => normaliseRow(r, STUDENT_HEADERS)),
      };
    } else {
      // Multi-sheet Excel → try named sheets first, fall back to single-sheet detection
      const wb = XLSX.read(buffer, { type: 'buffer' });
      const hasNamedSheets = wb.SheetNames.some((n) => detectSheetType(n));
      parsed = hasNamedSheets ? parseWorkbook(buffer) : parseSingleSheet(buffer);
    }

    resolveSubjectTeacherReferences(parsed);

    const department = detectDepartment(parsed);

    // Classify each entity type
    const faculty   = classifyRows(parsed.faculty,   validateFaculty,   normaliseFaculty,   'email');
    const subjects  = classifyRows(parsed.subjects,  validateSubject,   normaliseSubject,   'subjectCode');
    const timetable = classifyRows(parsed.timetable, validateTimetable, normaliseTimetable, null);
    const students  = classifyRows(parsed.students,  validateStudent,   normaliseStudent,   'rollNumber');

    // DB duplicate checks (only for valid rows, guard empty arrays to avoid $in/$or errors)
    const [existingEmails, existingCodes, existingRolls, existingSlots] = await Promise.all([
      faculty.valid.length  > 0 ? User.find({ email:       { $in: faculty.valid.map((r) => r.email) } },       { email: 1 }).lean()       : [],
      subjects.valid.length > 0 ? Subject.find({ subjectCode: { $in: subjects.valid.map((r) => r.subjectCode) } }, { subjectCode: 1 }).lean() : [],
      students.valid.length > 0 ? Student.find({ rollNumber:  { $in: students.valid.map((r) => r.rollNumber) } }, { rollNumber: 1, name: 1, department: 1, year: 1, section: 1 }).lean()  : [],
      timetable.valid.length > 0
        ? Timetable.find({ $or: timetable.valid.flatMap((r) => [
          { day: r.day, hour: Number(r.hour), section: r.section, department: r.department },
          { day: r.day, hour: Number(r.hour), section: r.section, subjectCode: r.subjectCode },
        ]) }, { day: 1, hour: 1, section: 1, department: 1, subjectCode: 1 }).lean()
        : [],
    ]);

    const dbEmailSet = new Set(existingEmails.map((u) => u.email));
    const dbCodeSet  = new Set(existingCodes.map((s) => s.subjectCode));
    const dbRollMap  = new Map(existingRolls.map((s) => [s.rollNumber, s]));
    const dbSlotSet = new Set(existingSlots.map((s) => [
      `${s.day}|${s.hour}|${s.section}|${s.department || ''}`,
      `${s.day}|${s.hour}|${s.section}|${s.subjectCode || ''}`,
    ]));

    // Move DB duplicates out of valid
    const moveToDuplicates = (arr, keyFn, dbSet, label) => {
      const newValid = [], newDups = [];
      arr.valid.forEach((r) => {
        if (dbSet.has(keyFn(r))) newDups.push({ ...r, _errors: [`${label} already exists in database`] });
        else newValid.push(r);
      });
      arr.valid = newValid;
      arr.duplicates = [...arr.duplicates, ...newDups];
    };

    moveToDuplicates(faculty,   (r) => r.email,                                    dbEmailSet, 'Email');
    moveToDuplicates(subjects,  (r) => r.subjectCode,                              dbCodeSet,  'Subject code');
    moveToDuplicates(
      timetable,
      (r) => [`${r.day}|${Number(r.hour)}|${r.section}|${r.department || ''}`, `${r.day}|${Number(r.hour)}|${r.section}|${r.subjectCode || ''}`],
      { has: (keys) => keys.some((key) => [...dbSlotSet].some((existing) => existing.includes(key))) },
      'Timetable slot'
    );

    // Students: exact match → alreadyExists (valid), field conflict → duplicate
    {
      const newValid = [], newDups = [];
      students.valid.forEach((r) => {
        const existing = dbRollMap.get(r.rollNumber);
        if (!existing) { newValid.push(r); return; }
        const exactMatch =
          existing.name.trim().toLowerCase() === r.name.toLowerCase() &&
          existing.department === r.department &&
          Number(existing.year) === Number(r.year) &&
          existing.section.toUpperCase() === r.section.toUpperCase();
        if (exactMatch) newValid.push({ ...r, _alreadyExists: true });
        else newDups.push({ ...r, _errors: ['Roll number exists with different details'] });
      });
      students.valid = newValid;
      students.duplicates = [...students.duplicates, ...newDups];
    }

    logger.info(`Academic import parse: dept="${department}" faculty=${faculty.valid.length} subjects=${subjects.valid.length} timetable=${timetable.valid.length} students=${students.valid.length} from ${originalname}`);

    res.json({
      department,
      faculty:   { validCount: faculty.valid.length,   duplicateCount: faculty.duplicates.length,   invalidCount: faculty.invalid.length,   valid: faculty.valid,   duplicates: faculty.duplicates,   invalid: faculty.invalid },
      subjects:  { validCount: subjects.valid.length,  duplicateCount: subjects.duplicates.length,  invalidCount: subjects.invalid.length,  valid: subjects.valid,  duplicates: subjects.duplicates,  invalid: subjects.invalid },
      timetable: { validCount: timetable.valid.length, duplicateCount: timetable.duplicates.length, invalidCount: timetable.invalid.length, valid: timetable.valid, duplicates: timetable.duplicates, invalid: timetable.invalid },
      students:  { validCount: students.valid.length,  duplicateCount: students.duplicates.length,  invalidCount: students.invalid.length,  valid: students.valid,  duplicates: students.duplicates,  invalid: students.invalid },
      missing: {
        faculty:   parsed.faculty.length === 0,
        subjects:  parsed.subjects.length === 0,
        timetable: parsed.timetable.length === 0,
        students:  parsed.students.length === 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/import/academic/confirm ───────────────────────────────────────

const confirmAcademicImport = async (req, res, next) => {
  try {
    const { faculty: fRows = [], subjects: sRows = [], timetable: ttRows = [], students: stRows = [] } = req.body;

    const results = { faculty: 0, subjects: 0, timetable: 0, students: 0, errors: [] };

    // ── 1. Faculty ────────────────────────────────────────────────────────────
    if (fRows.length > 0) {
      const clean = fRows.map(normaliseFaculty).filter((r) => validateFaculty(r).length === 0);
      const existingEmails = new Set(
        (await User.find({ email: { $in: clean.map((r) => r.email) } }, { email: 1 }).lean()).map((u) => u.email)
      );
      const toInsert = clean.filter((r) => !existingEmails.has(r.email));

      if (toInsert.length > 0) {
        const hashed = await Promise.all(
          toInsert.map(async (r) => ({
            name:       r.name,
            email:      r.email,
            password:   await bcrypt.hash(r.password, 12),
            role:       r.role || 'teacher',
            department: r.department || null,
            isActive:   true,
          }))
        );
        try {
          const inserted = await User.insertMany(hashed, { ordered: false });
          results.faculty = inserted.length;
        } catch (e) {
          results.faculty = e.insertedDocs?.length ?? 0;
          if (e.writeErrors) results.errors.push(`Faculty: ${e.writeErrors.length} duplicate(s) skipped`);
        }
      }
    }

    // ── 2. Build email → _id map for subject linking ──────────────────────────
    const facultyRefs = sRows.map((r) => normaliseSubject(r).teacherEmail).filter(Boolean);
    const facultyDocs = facultyRefs.length > 0
      ? await User.find({ isActive: true }, { email: 1, name: 1 }).lean()
      : [];
    const facultyRefToId = {};
    facultyDocs.forEach((u) => {
      facultyRefToId[personKey(u.email)] = u._id;
      facultyRefToId[personKey(u.name)] = u._id;
    });

    // ── 3. Subjects ───────────────────────────────────────────────────────────
    if (sRows.length > 0) {
      const clean = sRows.map(normaliseSubject).filter((r) => validateSubject(r).length === 0);
      const existingCodes = new Set(
        (await Subject.find({ subjectCode: { $in: clean.map((r) => r.subjectCode) } }, { subjectCode: 1 }).lean()).map((s) => s.subjectCode)
      );
      const toInsert = clean.filter((r) => !existingCodes.has(r.subjectCode));

      if (toInsert.length > 0) {
        const docs = toInsert.map((r) => {
          const teacherId = r.teacherEmail ? facultyRefToId[personKey(r.teacherEmail)] : null;
          if (!teacherId) {
            results.errors.push(`Subject ${r.subjectCode}: teacher reference "${r.teacherEmail}" not found — skipped`);
            return null;
          }
          return {
            subjectName: r.subjectName,
            subjectCode: r.subjectCode,
            department:  r.department,
            year:        r.year,
            semester:    r.semester || null,
            teacherId,
            isActive:    true,
          };
        }).filter(Boolean);

        if (docs.length > 0) {
          try {
            const inserted = await Subject.insertMany(docs, { ordered: false });
            results.subjects = inserted.length;
          } catch (e) {
            results.subjects = e.insertedDocs?.length ?? 0;
            if (e.writeErrors) results.errors.push(`Subjects: ${e.writeErrors.length} duplicate(s) skipped`);
          }
        }
      }
    }

    // ── 4. Build subjectCode → _id map for timetable linking ─────────────────
    const allCodes = ttRows.map((r) => normaliseTimetable(r).subjectCode).filter(Boolean);
    const subjectDocs = allCodes.length > 0
      ? await Subject.find({ subjectCode: { $in: allCodes }, isActive: true }, { subjectCode: 1 }).lean()
      : [];
    const codeToId = {};
    subjectDocs.forEach((s) => { codeToId[s.subjectCode] = s._id; });

    // ── 5. Timetable ──────────────────────────────────────────────────────────
    if (ttRows.length > 0) {
      const clean = ttRows.map(normaliseTimetable).filter((r) => validateTimetable(r).length === 0);

      const ops = clean.map((r) => ({
        updateOne: {
          filter: { day: r.day, hour: r.hour, section: r.section, department: r.department },
          update: {
            $set: {
              day:          r.day,
              hour:         r.hour,
              section:      r.section,
              department:   r.department || null,
              startTime:    r.startTime,
              endTime:      r.endTime,
              subjectCode:  r.subjectCode || null,
              subjectId:    r.subjectCode ? (codeToId[r.subjectCode] || null) : null,
              facultyName:  r.facultyName || null,
              type:         r.type || 'theory',
              room:         r.room || null,
              academicYear: r.academicYear || '2025-2026',
              semester:     r.semester || null,
              note:         r.note || null,
            },
          },
          upsert: true,
        },
      }));

      if (ops.length > 0) {
        const ttResult = await Timetable.bulkWrite(ops, { ordered: false });
        results.timetable = (ttResult.upsertedCount || 0) + (ttResult.modifiedCount || 0);
      }
    }

    // ── 6. Students ───────────────────────────────────────────────────────────
    if (stRows.length > 0) {
      const clean = stRows.map(normaliseStudent).filter((r) => validateStudent(r).length === 0);
      const existingRolls = new Set(
        (await Student.find({ rollNumber: { $in: clean.map((r) => r.rollNumber) } }, { rollNumber: 1 }).lean()).map((s) => s.rollNumber)
      );
      const toInsert = clean.filter((r) => !existingRolls.has(r.rollNumber));

      if (toInsert.length > 0) {
        try {
          const inserted = await Student.insertMany(toInsert, { ordered: false });
          results.students = inserted.length;
        } catch (e) {
          results.students = e.insertedDocs?.length ?? 0;
          if (e.writeErrors) results.errors.push(`Students: ${e.writeErrors.length} duplicate(s) skipped`);
        }
      }
    }

    logger.info(`Academic import confirmed by ${req.user.name}: faculty=${results.faculty} subjects=${results.subjects} timetable=${results.timetable} students=${results.students}`);

    res.status(201).json({
      message: `Import complete — Faculty: ${results.faculty}, Subjects: ${results.subjects}, Timetable: ${results.timetable}, Students: ${results.students}`,
      ...results,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { parseAcademicImport, confirmAcademicImport };
