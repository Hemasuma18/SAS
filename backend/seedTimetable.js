require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const Subject = require('./models/Subject');
const Timetable = require('./models/Timetable');

// ─── FACULTY DATA ────────────────────────────────────────────────────────────
const facultyData = [
  { name: 'Mr. P. Saravana Kumar',       email: 'saravana.kumar@college.edu',    department: 'Computer Science' },
  { name: 'Dr. P. Kiran Kumar',          email: 'kiran.kumar@college.edu',       department: 'Computer Science' },
  { name: 'Mr. T. Gopu',                 email: 't.gopu@college.edu',            department: 'Computer Science' },
  { name: 'Mr. P. Srinivasa Reddi',      email: 'srinivasa.reddi@college.edu',   department: 'Computer Science' },
  { name: 'Dr. K. Uma',                  email: 'k.uma@college.edu',             department: 'Computer Science' },
  { name: 'Dr. Chandra Mouli M',         email: 'chandra.mouli@college.edu',     department: 'Computer Science' },
  { name: 'Ms. G. Vijaya Lakshmi',       email: 'vijaya.lakshmi@college.edu',    department: 'Computer Science' },
  { name: 'Mr. J. V. Ramaiah',           email: 'jv.ramaiah@college.edu',        department: 'Computer Science' },
  { name: 'Mrs. K. Yasoda',              email: 'k.yasoda@college.edu',          department: 'Computer Science' },
  { name: 'Mr. S. Oyyathevan',           email: 's.oyyathevan@college.edu',      department: 'Computer Science' },
];

// ─── SUBJECT DATA ─────────────────────────────────────────────────────────────
// teacherEmail maps to facultyData above
const subjectData = [
  {
    subjectName: 'Compiler Design',
    subjectCode: '23CTCTT6010',
    department: 'Computer Science', year: 3, semester: 6,
    teacherEmail: 'saravana.kumar@college.edu',
  },
  {
    subjectName: 'Cloud Computing',
    subjectCode: '23CTCTT6020',
    department: 'Computer Science', year: 3, semester: 6,
    teacherEmail: 'kiran.kumar@college.edu',
  },
  {
    subjectName: 'Cryptography & Network Security',
    subjectCode: '23CTCTT6030',
    department: 'Computer Science', year: 3, semester: 6,
    teacherEmail: 'srinivasa.reddi@college.edu',
  },
  {
    subjectName: 'Machine Learning',
    subjectCode: '23CTCTP604D',
    department: 'Computer Science', year: 3, semester: 6,
    teacherEmail: 'k.uma@college.edu',
  },
  {
    subjectName: 'Software Project Management',
    subjectCode: '23CTCTP605A',
    department: 'Computer Science', year: 3, semester: 6,
    teacherEmail: 'chandra.mouli@college.edu',
  },
  {
    subjectName: 'Microprocessors & Microcontrollers',
    subjectCode: '23CTECO606D',
    department: 'Computer Science', year: 3, semester: 6,
    teacherEmail: 't.gopu@college.edu',
  },
  {
    subjectName: 'Cloud Computing Lab',
    subjectCode: '23CTCTL6070',
    department: 'Computer Science', year: 3, semester: 6,
    teacherEmail: 't.gopu@college.edu',
  },
  {
    subjectName: 'Cryptography & Network Security Lab',
    subjectCode: '23CTCTL6090',
    department: 'Computer Science', year: 3, semester: 6,
    teacherEmail: 'saravana.kumar@college.edu',
  },
  {
    subjectName: 'Soft Skills',
    subjectCode: '23CTAHS6090',
    department: 'Computer Science', year: 3, semester: 6,
    teacherEmail: 'vijaya.lakshmi@college.edu',
  },
  {
    subjectName: 'Technical Paper Writing & IPR',
    subjectCode: '23CTCTN6100',
    department: 'Computer Science', year: 3, semester: 6,
    teacherEmail: 'jv.ramaiah@college.edu',
  },
];

// ─── PERIOD TIME SLOTS ────────────────────────────────────────────────────────
const periods = [
  { hour: 1, startTime: '09:00', endTime: '09:55' },
  { hour: 2, startTime: '09:55', endTime: '10:50' },
  { hour: 3, startTime: '11:00', endTime: '11:55' },
  { hour: 4, startTime: '11:55', endTime: '12:50' },
  { hour: 5, startTime: '12:50', endTime: '13:45' },
  { hour: 6, startTime: '13:45', endTime: '14:40' },
  { hour: 7, startTime: '14:40', endTime: '15:35' },
  { hour: 8, startTime: '15:35', endTime: '16:30' },
];

// ─── TIMETABLE SLOTS ──────────────────────────────────────────────────────────
// Extracted from the timetable image
// type: theory | lab | activity | free
// note: extra info (lab room, combined groups etc.)
const timetableRaw = [
  // MONDAY
  { day: 'Monday',    hour: 1, code: 'CD',          type: 'theory',   faculty: 'saravana.kumar@college.edu' },
  { day: 'Monday',    hour: 2, code: 'SPM',         type: 'theory',   faculty: 'chandra.mouli@college.edu' },
  { day: 'Monday',    hour: 3, code: '23CTCTL6090', type: 'lab',      faculty: 'saravana.kumar@college.edu', room: '23004/5', note: 'CC/C&NS LAB' },
  { day: 'Monday',    hour: 4, code: '23CTCTL6090', type: 'lab',      faculty: 'saravana.kumar@college.edu', room: '23004/5', note: 'CC/C&NS LAB (cont.)' },
  { day: 'Monday',    hour: 5, code: 'CC',          type: 'theory',   faculty: 'kiran.kumar@college.edu' },
  { day: 'Monday',    hour: 6, code: 'CNS',         type: 'theory',   faculty: 'srinivasa.reddi@college.edu' },
  { day: 'Monday',    hour: 7, code: 'TPIPR',       type: 'activity', faculty: 'jv.ramaiah@college.edu',    note: 'TP/IPR' },
  { day: 'Monday',    hour: 8, code: 'FREE',        type: 'free',     note: 'UNCB' },

  // TUESDAY
  { day: 'Tuesday',   hour: 1, code: 'CC',          type: 'theory',   faculty: 'kiran.kumar@college.edu' },
  { day: 'Tuesday',   hour: 2, code: 'ML',          type: 'theory',   faculty: 'k.uma@college.edu' },
  { day: 'Tuesday',   hour: 3, code: 'SS',          type: 'activity', faculty: 'vijaya.lakshmi@college.edu', note: 'Soft Skills' },
  { day: 'Tuesday',   hour: 4, code: 'SPM',         type: 'theory',   faculty: 'chandra.mouli@college.edu' },
  { day: 'Tuesday',   hour: 5, code: 'CNS',         type: 'theory',   faculty: 'srinivasa.reddi@college.edu' },
  { day: 'Tuesday',   hour: 6, code: '23CTCTL6070', type: 'lab',      faculty: 't.gopu@college.edu',        room: '23004/5', note: 'TLP' },
  { day: 'Tuesday',   hour: 7, code: '23CTCTL6070', type: 'lab',      faculty: 't.gopu@college.edu',        room: '23004/5', note: 'TLP/NCC (cont.)' },

  // WEDNESDAY
  { day: 'Wednesday', hour: 1, code: 'CNS',         type: 'theory',   faculty: 'srinivasa.reddi@college.edu' },
  { day: 'Wednesday', hour: 2, code: 'MPMC',        type: 'theory',   faculty: 't.gopu@college.edu' },
  { day: 'Wednesday', hour: 3, code: 'CD',          type: 'theory',   faculty: 'saravana.kumar@college.edu' },
  { day: 'Wednesday', hour: 4, code: 'ML',          type: 'theory',   faculty: 'k.uma@college.edu' },
  { day: 'Wednesday', hour: 5, code: '23CTCTL6090', type: 'lab',      faculty: 'srinivasa.reddi@college.edu', room: '23004/5', note: 'C&NS/CC LAB' },
  { day: 'Wednesday', hour: 6, code: '23CTCTL6090', type: 'lab',      faculty: 'srinivasa.reddi@college.edu', room: '23004/5', note: 'C&NS/CC LAB (cont.)' },
  { day: 'Wednesday', hour: 7, code: 'SPM',         type: 'theory',   faculty: 'chandra.mouli@college.edu' },

  // THURSDAY
  { day: 'Thursday',  hour: 1, code: 'ML',          type: 'theory',   faculty: 'k.uma@college.edu' },
  { day: 'Thursday',  hour: 2, code: 'CC',          type: 'theory',   faculty: 'kiran.kumar@college.edu' },
  { day: 'Thursday',  hour: 3, code: 'TPIPR',       type: 'activity', faculty: 'jv.ramaiah@college.edu',    note: 'TP/IPR' },
  { day: 'Thursday',  hour: 4, code: 'MPMC',        type: 'theory',   faculty: 't.gopu@college.edu' },
  { day: 'Thursday',  hour: 5, code: 'FREE',        type: 'free',     note: 'H (Holiday buffer)' },
  { day: 'Thursday',  hour: 6, code: 'CD',          type: 'theory',   faculty: 'saravana.kumar@college.edu' },
  { day: 'Thursday',  hour: 7, code: 'CNS',         type: 'theory',   faculty: 'srinivasa.reddi@college.edu' },
  { day: 'Thursday',  hour: 8, code: 'SPM',         type: 'theory',   faculty: 'chandra.mouli@college.edu' },

  // FRIDAY
  { day: 'Friday',    hour: 1, code: 'SPM',         type: 'theory',   faculty: 'chandra.mouli@college.edu' },
  { day: 'Friday',    hour: 2, code: 'CD',          type: 'theory',   faculty: 'saravana.kumar@college.edu' },
  { day: 'Friday',    hour: 3, code: 'MPMC',        type: 'theory',   faculty: 't.gopu@college.edu' },
  { day: 'Friday',    hour: 4, code: 'CNS',         type: 'theory',   faculty: 'srinivasa.reddi@college.edu' },
  { day: 'Friday',    hour: 5, code: 'FREE',        type: 'free',     note: 'L/S (Library/Seminar)' },
  { day: 'Friday',    hour: 6, code: 'SS',          type: 'activity', faculty: 'vijaya.lakshmi@college.edu', room: '23004/5', note: 'S.S Lab' },
  { day: 'Friday',    hour: 7, code: 'SS',          type: 'activity', faculty: 'vijaya.lakshmi@college.edu', room: '23004/5', note: 'S.S Lab (cont.)' },

  // SATURDAY
  { day: 'Saturday',  hour: 1, code: 'MPMC',        type: 'theory',   faculty: 't.gopu@college.edu' },
  { day: 'Saturday',  hour: 2, code: 'CC',          type: 'theory',   faculty: 'kiran.kumar@college.edu' },
  { day: 'Saturday',  hour: 3, code: 'APT',         type: 'activity', note: 'Aptitude' },
  { day: 'Saturday',  hour: 4, code: 'ML',          type: 'theory',   faculty: 'k.uma@college.edu' },
  { day: 'Saturday',  hour: 5, code: '23CTCTL6070', type: 'lab',      faculty: 'saravana.kumar@college.edu', room: '23004/5', note: 'TLP' },
  { day: 'Saturday',  hour: 6, code: '23CTCTL6070', type: 'lab',      faculty: 'saravana.kumar@college.edu', room: '23004/5', note: 'TLP (cont.)' },
];

// Short code → full subject code map
const codeMap = {
  CD:    '23CTCTT6010',
  CC:    '23CTCTT6020',
  CNS:   '23CTCTT6030',
  ML:    '23CTCTP604D',
  SPM:   '23CTCTP605A',
  MPMC:  '23CTECO606D',
  SS:    '23CTAHS6090',
  TPIPR: '23CTCTN6100',
  APT:   null,   // no subject code — activity only
  FREE:  null,
};

// ─── CR ACCOUNTS ─────────────────────────────────────────────────────────────
const crData = [
  { name: 'Basava Jaya Krishna',  rollNumber: '23K61A0606', email: 'cr1.23k61a0606@college.edu', password: 'CR@0606' },
  { name: 'Pujari Swathisree',    rollNumber: '23K61A0650', email: 'cr2.23k61a0650@college.edu', password: 'CR@0650' },
];

// ─── SEED ─────────────────────────────────────────────────────────────────────
const seed = async () => {
  await connectDB();

  // 1. Insert faculty
  console.log('\n📌 Seeding faculty...');
  const facultyMap = {}; // email → _id
  for (const f of facultyData) {
    let user = await User.findOne({ email: f.email });
    if (!user) {
      user = await User.create({
        name: f.name,
        email: f.email,
        password: 'Faculty@123',
        role: 'teacher',
        department: f.department,
      });
      console.log(`  ✅ Created: ${f.name}`);
    } else {
      console.log(`  ⏭  Exists:  ${f.name}`);
    }
    facultyMap[f.email] = user._id;
  }

  // 2. Insert subjects
  console.log('\n📌 Seeding subjects...');
  const subjectMap = {}; // subjectCode → _id
  for (const s of subjectData) {
    const teacherId = facultyMap[s.teacherEmail];
    if (!teacherId) { console.warn(`  ⚠️  No teacher found for ${s.subjectCode}`); continue; }

    let subject = await Subject.findOne({ subjectCode: s.subjectCode });
    if (!subject) {
      subject = await Subject.create({
        subjectName: s.subjectName,
        subjectCode: s.subjectCode,
        department: s.department,
        year: s.year,
        semester: s.semester,
        teacherId,
      });
      console.log(`  ✅ Created: ${s.subjectName} (${s.subjectCode})`);
    } else {
      console.log(`  ⏭  Exists:  ${s.subjectName}`);
    }
    subjectMap[s.subjectCode] = subject._id;
  }

  // 3. Insert timetable slots
  console.log('\n📌 Seeding timetable...');
  let ttInserted = 0, ttSkipped = 0;
  for (const slot of timetableRaw) {
    const { day, hour, code, type, faculty, room, note } = slot;
    const { startTime, endTime } = periods.find((p) => p.hour === hour);

    // Resolve full subject code
    const fullCode = codeMap[code] !== undefined ? codeMap[code] : code;
    const subjectId = fullCode ? subjectMap[fullCode] : undefined;
    const facultyName = faculty
      ? facultyData.find((f) => f.email === faculty)?.name
      : undefined;

    const existing = await Timetable.findOne({ day, hour, section: 'CSE-A' });
    if (existing) { ttSkipped++; continue; }

    await Timetable.create({
      day, hour, startTime, endTime,
      subjectCode: fullCode || code,
      subjectId,
      facultyName,
      type,
      room: room || '23009',
      section: 'CSE-A',
      academicYear: '2025-2026',
      semester: 6,
      note,
    });
    ttInserted++;
  }
  console.log(`  ✅ ${ttInserted} slots inserted, ${ttSkipped} already existed.`);

  // 4. Insert CR accounts
  console.log('\n📌 Seeding CR accounts...');
  for (const cr of crData) {
    const exists = await User.findOne({ rollNumber: cr.rollNumber });
    if (exists) { console.log(`  ⏭  CR exists: ${cr.name}`); continue; }
    await User.create({
      name: cr.name,
      email: cr.email,
      password: cr.password,
      role: 'student_cr',
      department: 'Computer Science',
      rollNumber: cr.rollNumber,
    });
    console.log(`  ✅ CR created: ${cr.name} (${cr.rollNumber})`);
  }

  console.log('\n🎉 Seed complete!\n');
  console.log('─────────────────────────────────────────');
  console.log('Faculty login password : Faculty@123');
  console.log('CR 1 login (roll)      : 23K61A0606 / CR@0606');
  console.log('CR 2 login (roll)      : 23K61A0650 / CR@0650');
  console.log('─────────────────────────────────────────\n');
  process.exit(0);
};

seed().catch((err) => { console.error(err); process.exit(1); });
