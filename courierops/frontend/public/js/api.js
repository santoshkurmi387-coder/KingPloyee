/**
 * js/api.js — KingPloyee
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  STEP 1 — PASTE YOUR RENDER BACKEND URL BELOW               ║
 * ║  Example: 'https://kingployee-abc123.onrender.com/api'      ║
 * ║  Find it in your Render dashboard → your service → URL       ║
 * ╚══════════════════════════════════════════════════════════════╝
 */
const RENDER_BACKEND_URL = 'https://kingployee.onrender.com/api';

/* ── Smart API base selection ────────────────────────────────── */
function getAPIBase() {
  const { hostname, protocol } = window.location;

  // Local development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:5000/api';
  }

  // Opened as a raw file — point at backend directly
  if (protocol === 'file:') {
    return RENDER_BACKEND_URL;
  }

  // On Vercel (or any deployed domain) — use the Render backend URL directly.
  // This avoids needing the Vercel proxy to work.
  return RENDER_BACKEND_URL;
}

const API_BASE = getAPIBase();

/* ── Token / session management ─────────────────────────────── */
const Auth = {
  getToken:   ()  => sessionStorage.getItem('kp_token'),
  setToken:   (t) => sessionStorage.setItem('kp_token', t),
  getUser:    ()  => {
    try { return JSON.parse(sessionStorage.getItem('kp_user')); }
    catch { return null; }
  },
  setUser:    (u) => sessionStorage.setItem('kp_user', JSON.stringify(u)),
  clear:      ()  => {
    sessionStorage.removeItem('kp_token');
    sessionStorage.removeItem('kp_user');
  },
  isLoggedIn: ()  => !!sessionStorage.getItem('kp_token'),
};

/* ── Core fetch wrapper ──────────────────────────────────────── */
async function request(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token   = Auth.getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const opts = { method, headers };
  if (body && method !== 'GET') opts.body = JSON.stringify(body);

  let res, data;

  try {
    res = await fetch(`${API_BASE}${path}`, opts);
  } catch (networkErr) {
    throw new Error(
      'Cannot reach the server. ' +
      (API_BASE.includes('onrender.com')
        ? 'Your Render backend may be sleeping — wait 30 seconds and try again.'
        : 'Make sure the backend is running: cd backend && npm run dev')
    );
  }

  // Handle non-JSON responses (e.g. Render splash pages, Vercel 404s)
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(
      `Server returned HTML instead of JSON (status ${res.status}). ` +
      'Check that your RENDER_BACKEND_URL in api.js is correct and the backend is deployed.'
    );
  }

  data = await res.json();

  // Auto-logout on expired/invalid token
  if (res.status === 401) {
    Auth.clear();
    window.dispatchEvent(new Event('kp:logout'));
    throw new Error(data.message || 'Session expired. Please log in again.');
  }

  if (!data.success) {
    const msg = data.message || data.errors?.[0]?.msg || 'Request failed.';
    throw new Error(msg);
  }

  return data;
}

const get  = (path)       => request('GET',    path);
const post = (path, body) => request('POST',   path, body);
const put  = (path, body) => request('PUT',    path, body);
const del  = (path)       => request('DELETE', path);

/* ── Auth API ────────────────────────────────────────────────── */
const AuthAPI = {
  register: (name, mobile, password, branchName) =>
    post('/auth/register', { name, mobile, password, branchName }),
  login: (mobile, password) =>
    post('/auth/login', { mobile, password }),
  getMe: () => get('/auth/me'),
};

/* ── Employees API ───────────────────────────────────────────── */
const EmployeesAPI = {
  list:   ()         => get('/employees'),
  create: (data)     => post('/employees', data),
  update: (id, data) => put(`/employees/${id}`, data),
  remove: (id)       => del(`/employees/${id}`),
};

/* ── Attendance API ──────────────────────────────────────────── */
const AttendanceAPI = {
  list:   (params = {}) => get(`/attendance?${new URLSearchParams(params)}`),
  today:  ()            => get('/attendance/today'),
  create: (data)        => post('/attendance', data),
  update: (id, data)    => put(`/attendance/${id}`, data),
  remove: (id)          => del(`/attendance/${id}`),
};

/* ── Salary API ──────────────────────────────────────────────── */
const SalaryAPI = {
  report:        (month)        => get(`/salary/report?month=${month}`),
  listAdvances:  (params = {})  => get(`/salary/advances?${new URLSearchParams(params)}`),
  addAdvance:    (data)         => post('/salary/advances', data),
  updateAdvance: (id, data)     => put(`/salary/advances/${id}`, data),
  removeAdvance: (id)           => del(`/salary/advances/${id}`),
};
