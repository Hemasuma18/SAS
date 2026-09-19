const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    rollNumber: { type: String, required: true, unique: true, trim: true },
    department: { type: String, required: true, trim: true },
    year: { type: Number, required: true, min: 1, max: 4 },
    section: { type: String, required: true, trim: true, uppercase: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

studentSchema.index({ department: 1, year: 1, section: 1 });

module.exports = mongoose.model('Student', studentSchema);
