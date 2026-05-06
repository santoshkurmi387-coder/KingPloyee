/**
 * routes/drs.js — KingPloyee
 * CRUD for Delivery Run Sheets.
 *
 *   GET    /api/drs              — list sheets (filterable by employee, month, date)
 *   POST   /api/drs              — upload a new run sheet (base64 file)
 *   DELETE /api/drs/:id          — delete a run sheet
 *
 * Files are stored as base64 strings directly in MongoDB.
 * This keeps the architecture simple (no S3/Cloudinary needed).
 * For very large files consider switching to GridFS or cloud storage.
 */

const router  = require('express').Router();
const { body, validationResult } = require('express-validator');
const DRS      = require('../models/DRS');
const Employee = require('../models/Employee');
const authMW   = require('../middleware/auth');

router.use(authMW);

// ── GET /api/drs ─────────────────────────────────────────────────
// Query: ?employeeId=xxx  &month=YYYY-MM  &date=YYYY-MM-DD
router.get('/', async (req, res) => {
  try {
    const filter = { createdBy: req.user._id };

    if (req.query.employeeId) filter.employee = req.query.employeeId;
    if (req.query.date)       filter.date     = req.query.date;
    else if (req.query.month) filter.date     = { $regex: `^${req.query.month}` };

    const records = await DRS
      .find(filter)
      .populate('employee', 'name empId role')
      .sort({ date: -1 })
      .select('-fileData');  // Don't send file data in list — only fetch when needed

    res.json({ success: true, count: records.length, data: records });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/drs/:id/file ─────────────────────────────────────────
// Returns the full record including base64 fileData (for viewing/downloading)
router.get('/:id/file', async (req, res) => {
  try {
    const record = await DRS.findOne({ _id: req.params.id, createdBy: req.user._id })
      .populate('employee', 'name empId role');
    if (!record) return res.status(404).json({ success: false, message: 'Run sheet not found.' });
    res.json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/drs/month-files ──────────────────────────────────────
// Returns full records (with fileData) for a specific employee + month
// Used for "Download Month PDF" button
router.get('/month-files', async (req, res) => {
  try {
    const { employeeId, month } = req.query;
    if (!employeeId || !month) {
      return res.status(400).json({ success: false, message: 'employeeId and month are required.' });
    }

    const filter = {
      createdBy: req.user._id,
      employee:  employeeId,
      date:      { $regex: `^${month}` },
    };

    const records = await DRS
      .find(filter)
      .populate('employee', 'name empId role')
      .sort({ date: 1 }); // ascending for month PDF

    res.json({ success: true, count: records.length, data: records });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/drs ─────────────────────────────────────────────────
// Body: { employeeId, date, fileName, fileType, fileData (base64), note? }
router.post('/', [
  body('employeeId').notEmpty().withMessage('Employee is required'),
  body('date').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Date must be YYYY-MM-DD'),
  body('fileName').notEmpty().withMessage('File name is required'),
  body('fileType').notEmpty().withMessage('File type is required'),
  body('fileData').notEmpty().withMessage('File data is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const { employeeId, date, fileName, fileType, fileData, note } = req.body;

  try {
    // Verify employee belongs to this admin
    const emp = await Employee.findOne({ _id: employeeId, createdBy: req.user._id, isActive: true });
    if (!emp) return res.status(404).json({ success: false, message: 'Employee not found.' });

    // Validate file type
    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowed.includes(fileType)) {
      return res.status(400).json({ success: false, message: 'Only PDF, JPG, and PNG files are allowed.' });
    }

    // Check file size — base64 string length * 0.75 ≈ actual bytes
    const approxBytes = fileData.length * 0.75;
    const maxBytes    = 10 * 1024 * 1024; // 10 MB limit
    if (approxBytes > maxBytes) {
      return res.status(400).json({ success: false, message: 'File too large. Maximum size is 10 MB.' });
    }

    const record = await DRS.create({
      createdBy: req.user._id,
      employee:  employeeId,
      date,
      fileName,
      fileType,
      fileData,
      note: note || '',
    });

    const populated = await record.populate('employee', 'name empId role');
    // Return without fileData to keep response small
    const { fileData: _, ...safeData } = populated.toObject();
    res.status(201).json({ success: true, data: safeData });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── DELETE /api/drs/:id ───────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const record = await DRS.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    if (!record) return res.status(404).json({ success: false, message: 'Run sheet not found.' });
    res.json({ success: true, message: 'Run sheet deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
