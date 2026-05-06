/**
 * models/DRS.js — KingPloyee
 * Stores Delivery Run Sheets per employee per day.
 * File content stored as base64 string in MongoDB.
 */

const mongoose = require('mongoose');

const DRSSchema = new mongoose.Schema({
  // Admin/branch who uploaded this run sheet
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // Which employee this run sheet belongs to
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
  // Date of the delivery run (YYYY-MM-DD)
  date: {
    type: String,
    required: [true, 'Date is required'],
    match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'],
  },
  // Original file name for display/download
  fileName: {
    type: String,
    required: true,
    trim: true,
  },
  // MIME type e.g. application/pdf, image/jpeg, image/png
  fileType: {
    type: String,
    required: true,
  },
  // Base64 encoded file data (data URI format: data:type;base64,...)
  fileData: {
    type: String,
    required: true,
  },
  // Optional note
  note: {
    type: String,
    trim: true,
    default: '',
  },
}, { timestamps: true });

// Index for fast queries by employee + date
DRSSchema.index({ createdBy: 1, employee: 1, date: -1 });
DRSSchema.index({ createdBy: 1, date: -1 });

module.exports = mongoose.model('DRS', DRSSchema);
