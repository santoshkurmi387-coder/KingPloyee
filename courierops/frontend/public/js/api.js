/**
 * js/api.js — KingPloyee
 * Centralised API client. All HTTP calls go through here.
 * Handles: JWT auth headers, error normalisation, token storage.
 */

// In production, update this to your deployed backend URL
const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:5000/api'
  : '/api';

/* ── Token / session management ─────────────────────────────── */
const Auth = {
  getToken:   ()  => sessionStorage.getItem('kp_token'),
  setToken:   (t) => sessionStorage.setItem('kp_token', t),
  getUser:    ()  => { try { return JSON.parse(sessionStorage.getItem('kp_user')); } catch { return null; } },
  setUser:    (u) => sessionStorage.setItem('kp_user', JSON.stringify(u)),
  clear:      ()  => { sessionStorage.removeItem('kp_token'); sessionStorage.removeItem('kp_user'); },
  isLoggedIn: ()  => !!sessionStorage.getItem('kp_token'),
};

/* ── Core fetch wrapper ──────────────────────────────────────── */
async function request(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token   = Auth.getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const opts = { method, headers };
  if (body && method !== 'GET') opts.body = JSON.stringify(body);

  const res  = await fetch(`${API_BASE}${path}`, opts);
  const data = await res.json();

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
  report:        (month)       => get(`/salary/report?month=${month}`),
  listAdvances:  (params = {}) => get(`/salary/advances?${new URLSearchParams(params)}`),
  addAdvance:    (data)        => post('/salary/advances', data),
  updateAdvance: (id, data)    => put(`/salary/advances/${id}`, data),
  removeAdvance: (id)          => del(`/salary/advances/${id}`),
};
