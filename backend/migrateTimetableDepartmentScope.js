require('dotenv').config();
const mongoose = require('mongoose');
const Timetable = require('./models/Timetable');
const Subject = require('./models/Subject');

const migrate = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const subjects = await Subject.find({}, { subjectCode: 1, department: 1 }).lean();
  let backfilled = 0;
  for (const subject of subjects) {
    const result = await Timetable.updateMany(
      {
        subjectCode: subject.subjectCode,
        $or: [{ department: { $exists: false } }, { subjectId: { $exists: false } }, { subjectId: null }],
      },
      { $set: { department: subject.department, subjectId: subject._id } }
    );
    backfilled += result.modifiedCount;
  }

  const indexes = await Timetable.collection.indexes();
  const legacyIndex = indexes.find((index) => index.name === 'day_1_hour_1_section_1');
  if (legacyIndex) await Timetable.collection.dropIndex(legacyIndex.name);
  await Timetable.createIndexes();

  console.log(`Backfilled ${backfilled} timetable record(s)`);
  console.log('Timetable department-scoped index is ready');
  await mongoose.disconnect();
};

migrate().catch(async (error) => {
  console.error(error.message);
  await mongoose.disconnect();
  process.exitCode = 1;
});
