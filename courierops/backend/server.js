/**
 * server.js — KingPloyee Backend
 * Express + MongoDB REST API
 */

require('dotenv').config();
const express   = require('express');
const mongoose  = require('mongoose');
const cors      = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();

// ── CORS ──────────────────────────────────────────────────────────
// Explicitly list every origin that is allowed to call this API.
const ALLOWED_ORIGINS = [
  'https://kingployee.vercel.app',   // production frontend
  'http://localhost:3000',            // local frontend dev server
  'http://localhost:5500',            // VS Code Live Server
  'http://127.0.0.1:5500',
];

// Also allow whatever is set in FRONTEND_URL env var (for custom domains)
if (process.env.FRONTEND_URL) {
  ALLOWED_ORIGINS.push(process.env.FRONTEND_URL);
}

const corsOptions = {
  origin: (origin, callback) => {
    // No origin = direct API call (Postman, mobile app, curl) → allow
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    // Unknown origin
    console.warn(`CORS blocked origin: ${origin}`);
    callback(new Error(`CORS policy does not allow origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // handle preflight for all routes

// ── Middleware ────────────────────────────────────────────────────
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please slow down.' },
});
app.use('/api/', limiter);

// ── Routes ────────────────────────────────────────────────────────
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/employees',  require('./routes/employees'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/salary',     require('./routes/salary'));

// Health check — open this in browser to confirm backend is alive:
// https://kingployee.onrender.com/api/health
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'KingPloyee API is running!',
    time: new Date(),
    env: process.env.NODE_ENV,
  });
});

// 404 — always return JSON (never HTML)
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found.` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({ success: false, message: 'Internal server error.', detail: err.message });
});

// ── Start ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅  MongoDB connected');
    app.listen(PORT, () => {
      console.log(`🚀  KingPloyee API running on port ${PORT}`);
      console.log(`🌐  Health check: https://kingployee.onrender.com/api/health`);
    });
  })
  .catch(err => {
    console.error('❌  MongoDB connection failed:', err.message);
    process.exit(1);
  });
