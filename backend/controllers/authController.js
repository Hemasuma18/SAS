const { validationResult } = require('express-validator');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const logger = require('../utils/logger');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Admin only
const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, email, password, role, department, rollNumber } = req.body;

    // Check email uniqueness for non-CR users
    if (email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) return res.status(400).json({ message: 'Email already in use' });
    }

    // Check rollNumber uniqueness for CR users
    if (rollNumber) {
      const rollExists = await User.findOne({ rollNumber: rollNumber.trim().toUpperCase() });
      if (rollExists) return res.status(400).json({ message: 'Roll number already registered' });
    }

    const user = await User.create({ name, email, password, role, department, rollNumber });
    logger.info(`New user registered: ${user.email} (${user.role})`);

    res.status(201).json({ user, token: generateToken(user._id, user.role) });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, rollNumber, password } = req.body;

    // CR login via roll number, everyone else via email
    const query = rollNumber ? { rollNumber: rollNumber.trim().toUpperCase() } : { email };
    const user = await User.findOne(query);

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    if (!user.isActive) return res.status(401).json({ message: 'Account is deactivated' });

    // Block regular students — only faculty, admin, hod, student_cr allowed
    const allowedRoles = ['admin', 'teacher', 'hod', 'student_cr'];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ message: 'Access denied. Only faculty and CRs can log in.' });
    }

    logger.info(`User logged in: ${user.email || user.rollNumber} (${user.role})`);
    res.json({ user, token: generateToken(user._id, user.role) });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  res.json(req.user);
};

// @desc    Get all users (teachers list)
// @route   GET /api/auth/users
// @access  Admin/HOD
const getUsers = async (req, res, next) => {
  try {
    const { role, department } = req.query;
    const filter = {
      isActive: true,
      ...(role && { role }),
      ...((req.user.role === 'hod' && req.user.department) ? { department: req.user.department } : (department && { department })),
    };
    const users = await User.find(filter).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    next(error);
  }
};

// @desc    Update user
// @route   PUT /api/auth/users/:id
// @access  Admin
const updateUser = async (req, res, next) => {
  try {
    const { name, email, role, department, isActive } = req.body;

    // Prevent escalating to admin via API if caller is not admin
    // (caller is always admin here due to authorize middleware, but guard anyway)
    const allowedRoles = ['admin', 'teacher', 'hod', 'student_cr'];
    if (role && !allowedRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, role, department, isActive },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user (soft delete — preserves attendance history)
// @route   DELETE /api/auth/users/:id
// @access  Admin
const deleteUser = async (req, res, next) => {
  try {
    // Prevent deleting yourself
    if (String(req.params.id) === String(req.user._id)) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    ).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deactivated' });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getMe, getUsers, updateUser, deleteUser };
