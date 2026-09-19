const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema(
  {
    day: {
      type: String,
      required: true,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    },
    hour: { type: Number, required: true, min: 1, max: 8 }, // period number
    startTime: { type: String, required: true },             // "09:00"
    endTime: { type: String, required: true },               // "09:55"
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
    subjectCode: { type: String, trim: true, uppercase: true },
    facultyName: { type: String, trim: true },
    type: { type: String, enum: ['theory', 'lab', 'activity', 'break', 'free'], default: 'theory' },
    room: { type: String },
    department: { type: String, trim: true },
    section: { type: String, required: true, trim: true, uppercase: true },
    academicYear: { type: String, default: '2025-2026' },
    semester: { type: Number, default: 6 },
    note: { type: String }, // e.g. "23004/5" for lab room
  },
  { timestamps: true }
);

timetableSchema.index({ department: 1, section: 1, day: 1, hour: 1 }, { unique: true, sparse: true });
timetableSchema.index({ subjectCode: 1 });

module.exports = mongoose.model('Timetable', timetableSchema);
