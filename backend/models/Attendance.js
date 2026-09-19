const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    status: { type: String, enum: ['Present', 'Absent'], required: true },
  },
  { timestamps: true }
);

// Performance indexes
attendanceSchema.index({ date: 1, subjectId: 1 });
attendanceSchema.index({ studentId: 1, subjectId: 1 });
attendanceSchema.index({ studentId: 1, date: 1 });
// Prevent duplicate attendance for same student/subject/date
attendanceSchema.index({ studentId: 1, subjectId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
