/**
 * models/User.js — KingPloyee
 * Simple auth: name + mobile number + password.
 * No OTP. Password is bcrypt-hashed.
 */

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters'],
  },
  mobile: {
    type: String,
    required: [true, 'Mobile number is required'],
    unique: true,
    match: [/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false,  // excluded from query results unless explicitly requested
  },
  role: {
    type: String,
    enum: ['Admin', 'Manager'],
    default: 'Admin',
  },
  branchName: {
    type: String,
    default: 'Main Branch',
    trim: true,
  },
}, { timestamps: true });

// Hash password before saving (only when modified)
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare a plain-text password to the stored hash
UserSchema.methods.checkPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model('User', UserSchema);
