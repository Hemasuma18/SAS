require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const connectDB = require('./config/db');

const seed = async () => {
  await connectDB();

  const adminExists = await User.findOne({ email: 'admin@college.edu' });
  if (adminExists) {
    console.log('Admin already exists');
    process.exit(0);
  }

  await User.create({
    name: 'System Admin',
    email: 'admin@college.edu',
    password: 'Admin@123',
    role: 'admin',
    department: 'Administration',
  });

  console.log('✅ Admin user created: admin@college.edu / Admin@123');
  process.exit(0);
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
