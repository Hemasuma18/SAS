const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema(
  {
    subjectName: { type: String, required: true, trim: true },
    subjectCode: { type: String, required: true, unique: true, trim: true, uppercase: true },
    department: { type: String, required: true, trim: true },
    year: { type: Number, required: true, min: 1, max: 4 },
    semester: { type: Number, min: 1, max: 8 },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

subjectSchema.index({ department: 1, year: 1 });
subjectSchema.index({ teacherId: 1 });

module.exports = mongoose.model('Subject', subjectSchema);
