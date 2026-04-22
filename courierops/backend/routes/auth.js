/**
 * routes/auth.js — KingPloyee
 * Simple authentication:
 *   POST /api/auth/register  — create account (name, mobile, password, branchName)
 *   POST /api/auth/login     — sign in (mobile + password) → JWT
 *   GET  /api/auth/me        — get current user (protected)
 *   PATCH /api/auth/profile  — update name / branchName (protected)
 */

const router  = require('express').Router();
const jwt     = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User    = require('../models/User');
const authMW  = require('../middleware/auth');

// Sign a JWT for a given user ID
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

// Shape the user object sent to the client (never expose password)
const publicUser = (u) => ({
  id:         u._id,
  name:       u.name,
  mobile:     u.mobile,
  role:       u.role,
  branchName: u.branchName,
});

// ── POST /api/auth/register ──────────────────────────────────────
// Body: { name, mobile, password, branchName? }
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('mobile').matches(/^[6-9]\d{9}$/).withMessage('Enter a valid 10-digit mobile number'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('branchName').optional().trim(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { name, mobile, password, branchName } = req.body;

  try {
    // Check for duplicate mobile
    const exists = await User.findOne({ mobile });
    if (exists) {
      return res.status(409).json({ success: false, message: 'An account with this mobile number already exists. Please log in.' });
    }

    const user = await User.create({
      name:       name.trim(),
      mobile,
      password,
      branchName: branchName?.trim() || 'Main Branch',
      role:       'Admin',
    });

    const token = signToken(user._id);

    res.status(201).json({
      success: true,
      message: `Welcome to KingPloyee, ${user.name}!`,
      token,
      user: publicUser(user),
    });
  } catch (err) {
    console.error('register error:', err);
    res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
  }
});

// ── POST /api/auth/login ─────────────────────────────────────────
// Body: { mobile, password }
router.post('/login', [
  body('mobile').matches(/^[6-9]\d{9}$/).withMessage('Enter a valid 10-digit mobile number'),
  body('password').notEmpty().withMessage('Password is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { mobile, password } = req.body;

  try {
    // Must explicitly select password since it's excluded by default
    const user = await User.findOne({ mobile }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'No account found with this mobile number.' });
    }

    const match = await user.checkPassword(password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Incorrect password. Please try again.' });
    }

    const token = signToken(user._id);

    res.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      token,
      user: publicUser(user),
    });
  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
  }
});

// ── GET /api/auth/me ─────────────────────────────────────────────
router.get('/me', authMW, (req, res) => {
  res.json({ success: true, user: publicUser(req.user) });
});

// ── PATCH /api/auth/profile ──────────────────────────────────────
router.patch('/profile', authMW, [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('branchName').optional().trim(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const { name, branchName } = req.body;
  if (name)       req.user.name       = name;
  if (branchName) req.user.branchName = branchName;
  await req.user.save();

  res.json({ success: true, user: publicUser(req.user) });
});

module.exports = router;
