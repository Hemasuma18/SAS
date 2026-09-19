const User = require('../models/User');
const Student = require('../models/Student');

const INITIAL_STUDENT_PASSWORD = 'student@123';

const ensureStudentAccount = async (student) => {
  if (!student?._id || !student.isActive) return null;

  let existing = await User.findOne({ studentId: student._id });

  // Link legacy student accounts created before studentId was stored.
  if (!existing) {
    existing = await User.findOne({ rollNumber: student.rollNumber, role: 'student' });
  }

  if (existing) {
    existing.name = student.name;
    existing.rollNumber = student.rollNumber;
    existing.department = student.department;
    existing.studentId = student._id;
    await existing.save();
    return existing;
  }

  return User.create({
    name: student.name,
    rollNumber: student.rollNumber,
    department: student.department,
    studentId: student._id,
    password: INITIAL_STUDENT_PASSWORD,
    role: 'student',
    isActive: true,
  });
};

const syncStudentAccounts = async () => {
  const students = await Student.find({ isActive: true });
  let createdOrLinked = 0;

  for (const student of students) {
    await ensureStudentAccount(student);
    createdOrLinked++;
  }

  return createdOrLinked;
};

module.exports = { ensureStudentAccount, syncStudentAccounts, INITIAL_STUDENT_PASSWORD };