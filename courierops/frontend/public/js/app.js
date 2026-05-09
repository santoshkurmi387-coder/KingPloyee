/**
 * js/app.js — KingPloyee
 * Frontend application logic.
 * Auth: simple register (name + mobile + password) and login.
 * No OTP system.
 */

/* ── State ───────────────────────────────────────────────────── */
let employees  = [];
let attendance = [];

/* ── Utilities ───────────────────────────────────────────────── */
const fmt   = n  => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 });
const ini   = n  => (n || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
const today = () => new Date().toISOString().slice(0, 10);
const curMo = () => new Date().toISOString().slice(0, 7);

function toHoursMin(dec) {
  const h = Math.floor(dec), m = Math.round((dec - h) * 60);
  return `${h}h ${m}m`;
}

function calcHoursFromTimes(ci, co) {
  if (!ci || !co) return 0;
  const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  let s = toMin(ci), e = toMin(co);
  if (e < s) e += 1440; // overnight
  return parseFloat(((e - s) / 60).toFixed(2));
}

/* ── Toast ───────────────────────────────────────────────────── */
function toast(msg, type = 'info') {
  const ic = { success:'fa-circle-check', error:'fa-circle-xmark', info:'fa-circle-info', warn:'fa-triangle-exclamation' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<i class="fas ${ic[type]||ic.info} toast-icon"></i><span>${msg}</span>`;
  document.getElementById('toasts').appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

/* ── Modal ───────────────────────────────────────────────────── */
function openModal(title, bodyHTML, onConfirm, label = 'Save') {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML    = bodyHTML;
  document.getElementById('modalConfirmBtn').textContent = label;
  document.getElementById('modalConfirmBtn').onclick = onConfirm;
  document.getElementById('modal').classList.add('open');
}
function closeModal() { document.getElementById('modal').classList.remove('open'); }

/* ── Loader ──────────────────────────────────────────────────── */
function setLoading(show, msg = 'Loading…') {
  document.getElementById('globalLoader').style.display = show ? 'flex' : 'none';
  document.getElementById('loaderMsg').textContent = msg;
}

/* ── Helpers ─────────────────────────────────────────────────── */
const v   = id => document.getElementById(id)?.value || '';
const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
const emptyState = (icon, h, p) =>
  `<div class="empty-state"><i class="fas ${icon}"></i><h3>${h}</h3><p>${p}</p></div>`;

function setBtnLoading(id, loading, label) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.disabled = loading;
  btn.innerHTML = loading ? '<i class="fas fa-spinner fa-spin"></i> Please wait…' : label;
}

/* ================================================================
   AUTH — Register / Login (no OTP)
================================================================ */

// Which auth panel is shown: 'login' or 'register'
let authMode = 'login';

function showAuthScreen() {
  document.getElementById('authScreen').style.display = 'flex';
  document.getElementById('appShell').classList.remove('on');
  renderAuthLogin();
}

function showAppShell() {
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('appShell').classList.add('on');
  const user = Auth.getUser();
  if (user) {
    document.getElementById('sbAvatar').textContent = ini(user.name);
    document.getElementById('sbName').textContent   = user.name;
    document.getElementById('sbRole').textContent   = (user.role || 'Admin') + ' · ' + (user.branchName || 'Branch');
  }
}

/* Render the login form */
function renderAuthLogin() {
  authMode = 'login';
  document.getElementById('authContent').innerHTML = `
    <div class="auth-heading">Welcome back</div>
    <div class="auth-sub">Sign in to your KingPloyee account</div>

    <div class="auth-form-group">
      <label>Mobile Number</label>
      <div class="auth-input-wrap">
        <span class="auth-prefix">+91</span>
        <input type="tel" id="authMobile" maxlength="10" placeholder="10-digit number"
               inputmode="numeric" onkeydown="if(event.key==='Enter')doLogin()"/>
      </div>
    </div>

    <div class="auth-form-group">
      <label>Password</label>
      <div style="position:relative">
        <input type="password" id="authPass" placeholder="Your password"
               onkeydown="if(event.key==='Enter')doLogin()"/>
        <button type="button" class="pwd-eye-btn" onclick="togglePassVis('authPass','eyeIcon1')">
          <i class="fas fa-eye" id="eyeIcon1"></i>
        </button>
      </div>
    </div>

    <div id="authErr" class="auth-err"></div>

    <button class="btn-auth" id="loginBtn" onclick="doLogin()">
      <i class="fas fa-arrow-right-to-bracket"></i> Sign In
    </button>

    <div class="auth-switch">
      Don't have an account?
      <button class="btn-auth-link" onclick="renderAuthRegister()">Register here</button>
    </div>`;
}

/* Render the registration form */
function renderAuthRegister() {
  authMode = 'register';
  document.getElementById('authContent').innerHTML = `
    <div class="auth-heading">Create Account</div>
    <div class="auth-sub">Register to start managing your branch</div>

    <div class="auth-form-group">
      <label>Full Name</label>
      <input type="text" id="regName" placeholder="e.g. Rajesh Kumar"/>
    </div>

    <div class="auth-form-group">
      <label>Mobile Number</label>
      <div class="auth-input-wrap">
        <span class="auth-prefix">+91</span>
        <input type="tel" id="regMobile" maxlength="10" placeholder="10-digit number" inputmode="numeric"/>
      </div>
    </div>

    <div class="auth-form-group">
      <label>Branch Name <span class="auth-optional">(optional)</span></label>
      <input type="text" id="regBranch" placeholder="e.g. Bhubaneswar Main Branch"/>
    </div>

    <div class="auth-form-group">
      <label>Password</label>
      <div style="position:relative">
        <input type="password" id="regPass" placeholder="At least 6 characters"
               onkeydown="if(event.key==='Enter')doRegister()"/>
        <button type="button" class="pwd-eye-btn" onclick="togglePassVis('regPass','eyeIcon2')">
          <i class="fas fa-eye" id="eyeIcon2"></i>
        </button>
      </div>
      <div class="form-hint" style="color:var(--text-muted);margin-top:4px">Minimum 6 characters</div>
    </div>

    <div id="authErr" class="auth-err"></div>

    <button class="btn-auth" id="registerBtn" onclick="doRegister()">
      <i class="fas fa-user-plus"></i> Create Account
    </button>

    <div class="auth-switch">
      Already have an account?
      <button class="btn-auth-link" onclick="renderAuthLogin()">Sign in</button>
    </div>`;
}

function togglePassVis(inputId, iconId) {
  const inp  = document.getElementById(inputId);
  const icon = document.getElementById(iconId);
  if (!inp) return;
  inp.type   = inp.type === 'password' ? 'text' : 'password';
  icon.className = inp.type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
}

/* Login handler */
async function doLogin() {
  const mobile = v('authMobile');
  const pass   = v('authPass');
  const errEl  = document.getElementById('authErr');
  errEl.textContent = '';

  if (!/^[6-9]\d{9}$/.test(mobile)) { errEl.textContent = 'Enter a valid 10-digit mobile number.'; return; }
  if (!pass)                          { errEl.textContent = 'Please enter your password.'; return; }

  const btn = document.getElementById('loginBtn');
  try {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in…';
    const res = await AuthAPI.login(mobile, pass);
    Auth.setToken(res.token);
    Auth.setUser(res.user);
    showAppShell();
    initApp();
    toast(`Welcome back, ${res.user.name}!`, 'success');
  } catch (err) {
    errEl.textContent = err.message;
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-arrow-right-to-bracket"></i> Sign In';
  }
}

/* Register handler */
async function doRegister() {
  const name   = v('regName').trim();
  const mobile = v('regMobile');
  const branch = v('regBranch').trim();
  const pass   = v('regPass');
  const errEl  = document.getElementById('authErr');
  errEl.textContent = '';

  if (!name)                          { errEl.textContent = 'Please enter your name.'; return; }
  if (!/^[6-9]\d{9}$/.test(mobile))  { errEl.textContent = 'Enter a valid 10-digit mobile number.'; return; }
  if (pass.length < 6)                { errEl.textContent = 'Password must be at least 6 characters.'; return; }

  const btn = document.getElementById('registerBtn');
  try {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account…';
    const res = await AuthAPI.register(name, mobile, pass, branch || 'Main Branch');
    Auth.setToken(res.token);
    Auth.setUser(res.user);
    showAppShell();
    initApp();
    toast(`Account created! Welcome, ${res.user.name}!`, 'success');
  } catch (err) {
    errEl.textContent = err.message;
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
  }
}

function doLogout() {
  if (!confirm('Sign out of KingPloyee?')) return;
  Auth.clear();
  showAuthScreen();
}

/* ================================================================
   NAVIGATION
================================================================ */
const META = {
  drs: { title: 'Run Sheets (DRS)', sub: 'Upload & manage daily delivery run sheets' },
  dashboard:  { title: 'Dashboard',       sub: 'Branch overview & quick stats' },
  attendance: { title: 'Log Attendance',  sub: 'Record daily in/out shifts' },
  employees:  { title: 'Employee List',   sub: 'Manage registered staff' },
  advances:   { title: 'Advance Salary',  sub: 'Track salary advances' },
  salary:     { title: 'Salary Reports',  sub: 'Monthly payroll computation' },
};

function switchTab(id, el) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('tab-' + id)?.classList.add('active');
  el?.classList.add('active');
  document.getElementById('pageTitle').textContent = META[id]?.title || id;
  document.getElementById('pageSub').textContent   = META[id]?.sub   || '';
  if (id === 'dashboard')  renderDashboard();
  if (id === 'attendance') { fillEmpDrops(); renderAttTable(); }
  if (id === 'employees')  renderEmpTable();
  if (id === 'advances')   { fillEmpDrops(); renderAdvancesTable(); }
  if (id === 'drs')        { drsFillDrops(); loadDRS(); }
  closeSidebar();
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sbOverlay').classList.toggle('active');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sbOverlay').classList.remove('active');
}

/* ================================================================
   EMPLOYEES
================================================================ */
async function loadEmployees() {
  try {
    const res = await EmployeesAPI.list();
    employees = res.data;
  } catch (err) { toast(err.message, 'error'); }
}

function renderEmpTable() {
  const tbody = document.getElementById('empBody');
  document.getElementById('empCount').textContent = `${employees.length} staff`;
  if (!employees.length) {
    tbody.innerHTML = `<tr><td colspan="6">${emptyState('fa-user-slash','No employees registered','Add your first employee above.')}</td></tr>`;
    return;
  }
  tbody.innerHTML = employees.map(e => `
    <tr>
      <td>
        <div class="emp-name-cell" style="cursor:pointer" onclick="openER('${e._id}')" title="View Report">
          <div class="emp-avatar">${ini(e.name)}</div>
          <span style="text-decoration:underline;text-underline-offset:3px;text-decoration-style:dotted">${e.name}</span>
        </div>
      </td>
      <td><span class="mono sm">${e.empId}</span></td>
      <td><span class="role-tag">${e.role}</span></td>
      <td><span class="mono">${fmt(e.wage)}/day</span></td>
      <td>${e.mobile || '—'}</td>
      <td class="no-print">
        <button class="btn-icon" style="color:#60a5fa;border-color:rgba(96,165,250,.3)" onclick="openER('${e._id}')" title="Attendance Report">
          <i class="fas fa-file-chart-column"></i>
        </button>
      </td>
      <td class="no-print">
        <div style="display:flex;gap:6px">
          <button class="btn-icon" onclick="editEmpModal('${e._id}')" title="Edit"><i class="fas fa-pen"></i></button>
          <button class="btn-icon danger" onclick="deleteEmp('${e._id}','${e.name}')" title="Delete"><i class="fas fa-trash-can"></i></button>
        </div>
      </td>
    </tr>`).join('');
}

async function addEmp() {
  const name = v('eName'), empId = v('eId'), role = v('eRole'), wage = v('eWage'), mob = v('eMob');
  if (!name || !empId || !wage) { toast('Name, ID and Wage are required.', 'error'); return; }
  try {
    setBtnLoading('addEmpBtn', true);
    await EmployeesAPI.create({ name, empId, role, wage: parseFloat(wage), mobile: mob });
    ['eName','eId','eWage','eMob'].forEach(id => set(id, ''));
    await loadEmployees();
    renderEmpTable();
    fillEmpDrops();
    updateCards();
    toast(`${name} registered!`, 'success');
  } catch (err) { toast(err.message, 'error'); }
  finally { setBtnLoading('addEmpBtn', false, '<i class="fas fa-user-plus"></i> Register Employee'); }
}

function editEmpModal(id) {
  const e = employees.find(x => x._id === id);
  if (!e) return;
  openModal('Edit Employee', `
    <div class="form-grid">
      <div class="form-group"><label>Full Name</label><input id="m_name" value="${e.name}"/></div>
      <div class="form-group"><label>Employee ID</label><input id="m_empId" value="${e.empId}"/></div>
      <div class="form-group"><label>Role</label>
        <select id="m_role">
          ${['Delivery Executive','Sorter','Dispatcher','Loader','Supervisor','Driver']
            .map(r => `<option ${r===e.role?'selected':''}>${r}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>Daily Wage (₹)</label><input type="number" id="m_wage" value="${e.wage}"/></div>
      <div class="form-group"><label>Mobile</label><input type="tel" id="m_mobile" value="${e.mobile||''}"/></div>
    </div>`, async () => {
    try {
      await EmployeesAPI.update(id, { name:v('m_name'), empId:v('m_empId'), role:v('m_role'), wage:parseFloat(v('m_wage')), mobile:v('m_mobile') });
      closeModal();
      await loadEmployees();
      renderEmpTable();
      fillEmpDrops();
      toast('Employee updated!', 'success');
    } catch (err) { toast(err.message, 'error'); }
  });
}

async function deleteEmp(id, name) {
  if (!confirm(`Delete ${name} and all their records?`)) return;
  try {
    await EmployeesAPI.remove(id);
    await loadEmployees();
    renderEmpTable();
    fillEmpDrops();
    updateCards();
    toast(`${name} removed.`, 'info');
  } catch (err) { toast(err.message, 'error'); }
}

/* ================================================================
   ATTENDANCE
================================================================ */
function toggleTime() {
  const s = v('aStatus'), show = s === 'Present' || s === 'Half-Day';
  ['grpIn','grpOut','grpHrs'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = show ? '' : 'none';
  });
  if (show) calcHrs(); else set('hrsDisplay', '—');
}

function calcHrs() {
  const ci = v('aIn'), co = v('aOut'), el = document.getElementById('hrsDisplay');
  if (!ci || !co) { if(el) el.textContent = '—'; return 0; }
  const hrs = calcHoursFromTimes(ci, co);
  if (el) el.textContent = toHoursMin(hrs);
  return hrs;
}

async function logAtt() {
  const empId = v('aEmp'), date = v('aDate'), status = v('aStatus'),
        ci = v('aIn'), co = v('aOut'), notes = v('aNotes');
  if (!empId || !date) { toast('Select employee and date.', 'error'); return; }
  try {
    setBtnLoading('saveAttBtn', true);
    await AttendanceAPI.create({ employeeId:empId, date, status, checkIn:ci, checkOut:co, notes });
    toast('Attendance saved!', 'success');
    resetAtt();
    await refreshAtt();
    updateCards();
  } catch (err) {
    if (err.message.includes('already exists')) {
      if (confirm('Record exists for this date. Overwrite?')) await overwriteAtt(empId, date, status, ci, co, notes);
    } else toast(err.message, 'error');
  } finally { setBtnLoading('saveAttBtn', false, '<i class="fas fa-circle-check"></i> Save Attendance'); }
}

async function overwriteAtt(empId, date, status, ci, co, notes) {
  try {
    const res = await AttendanceAPI.list({ employeeId:empId, date });
    const rec = res.data[0];
    if (!rec) return;
    await AttendanceAPI.update(rec._id, { employeeId:empId, date, status, checkIn:ci, checkOut:co, notes });
    toast('Attendance updated!', 'success');
    await refreshAtt(); updateCards();
  } catch (err) { toast(err.message, 'error'); }
}

function resetAtt() {
  set('aEmp',''); set('aDate', today()); set('aStatus','Present');
  set('aIn','09:00'); set('aOut','18:00'); set('aNotes','');
  toggleTime();
}

async function refreshAtt() {
  const fe = v('filterEmp'), fm = v('filterMo');
  const params = {};
  if (fe) params.employeeId = fe;
  if (fm) params.month = fm;
  try {
    const res = await AttendanceAPI.list(params);
    attendance = res.data;
    renderAttTable();
  } catch (err) { toast(err.message, 'error'); }
}

function renderAttTable() {
  const tbody = document.getElementById('attBody');
  if (!attendance.length) {
    tbody.innerHTML = `<tr><td colspan="8">${emptyState('fa-calendar-days','No records found','Log attendance above or adjust the filter.')}</td></tr>`;
    return;
  }
  const bc = s => ({Present:'badge-present',Absent:'badge-absent','Half-Day':'badge-halfday',Leave:'badge-leave'})[s]||'';
  tbody.innerHTML = attendance.map(a => `
    <tr>
      <td><div class="emp-name-cell"><div class="emp-avatar">${ini(a.employee?.name)}</div>${a.employee?.name||'—'}</div></td>
      <td><span class="role-tag">${a.employee?.role||'—'}</span></td>
      <td><span class="mono sm">${a.date}</span></td>
      <td><span class="badge ${bc(a.status)}">${a.status}</span></td>
      <td><span class="mono sm">${a.checkIn||'—'}</span></td>
      <td><span class="mono sm">${a.checkOut||'—'}</span></td>
      <td><span class="mono sm">${a.hoursWorked ? toHoursMin(a.hoursWorked) : '—'}</span></td>
      <td class="no-print">
        <div style="display:flex;gap:6px">
          <button class="btn-icon" onclick="editAttModal('${a._id}')" title="Edit"><i class="fas fa-pen"></i></button>
          <button class="btn-icon danger" onclick="deleteAtt('${a._id}')" title="Delete"><i class="fas fa-trash-can"></i></button>
        </div>
      </td>
    </tr>`).join('');
}

function editAttModal(id) {
  const a = attendance.find(x => x._id === id);
  if (!a) return;
  const empOpts = employees.map(e =>
    `<option value="${e._id}" ${e._id===a.employee?._id?'selected':''}>${e.name} (${e.empId})</option>`).join('');
  openModal('Edit Attendance', `
    <div class="form-grid">
      <div class="form-group"><label>Employee</label><select id="m_emp">${empOpts}</select></div>
      <div class="form-group"><label>Date</label><input type="date" id="m_date" value="${a.date}"/></div>
      <div class="form-group"><label>Status</label>
        <select id="m_status" onchange="toggleModalTime()">
          ${['Present','Absent','Half-Day','Leave'].map(s=>`<option ${s===a.status?'selected':''}>${s}</option>`).join('')}
        </select>
      </div>
      <div class="form-group" id="m_grpIn"><label>Check-In</label><input type="time" id="m_ci" value="${a.checkIn||'09:00'}" oninput="calcModalHrs()"/></div>
      <div class="form-group" id="m_grpOut"><label>Check-Out</label><input type="time" id="m_co" value="${a.checkOut||'18:00'}" oninput="calcModalHrs()"/></div>
      <div class="form-group"><label>Hours</label><div class="hours-display" id="m_hrs">${a.hoursWorked?toHoursMin(a.hoursWorked):'—'}</div></div>
      <div class="form-group" style="grid-column:1/-1"><label>Notes</label><input id="m_notes" value="${a.notes||''}"/></div>
    </div>`, async () => {
    try {
      await AttendanceAPI.update(id, { employeeId:v('m_emp'), date:v('m_date'), status:v('m_status'), checkIn:v('m_ci'), checkOut:v('m_co'), notes:v('m_notes') });
      closeModal(); await refreshAtt(); toast('Record updated!', 'success');
    } catch (err) { toast(err.message, 'error'); }
  });
  toggleModalTime();
}

function toggleModalTime() {
  const s = v('m_status'), show = s==='Present'||s==='Half-Day';
  ['m_grpIn','m_grpOut'].forEach(id => { const el=document.getElementById(id); if(el) el.style.display=show?'':'none'; });
}
function calcModalHrs() {
  const el = document.getElementById('m_hrs');
  if (el) el.textContent = toHoursMin(calcHoursFromTimes(v('m_ci'), v('m_co')));
}

async function deleteAtt(id) {
  if (!confirm('Delete this attendance record?')) return;
  try {
    await AttendanceAPI.remove(id); await refreshAtt(); updateCards(); toast('Record deleted.','info');
  } catch (err) { toast(err.message,'error'); }
}

/* ================================================================
   ADVANCE SALARY
================================================================ */
async function addAdvance() {
  const empId=v('advEmp'), amount=v('advAmount'), month=v('advMonth'), date=v('advDate'), note=v('advNote');
  if (!empId||!amount||!month||!date) { toast('All fields except note are required.','error'); return; }
  try {
    setBtnLoading('addAdvBtn', true);
    await SalaryAPI.addAdvance({ employeeId:empId, amount:parseFloat(amount), month, date, note });
    ['advAmount','advNote'].forEach(id => set(id,''));
    await renderAdvancesTable();
    toast('Advance recorded!','success');
  } catch (err) { toast(err.message,'error'); }
  finally { setBtnLoading('addAdvBtn', false, '<i class="fas fa-plus"></i> Add Advance'); }
}

async function renderAdvancesTable() {
  const fe=v('filterAdvEmp'), fm=v('filterAdvMo');
  const params={};
  if (fe) params.employeeId=fe;
  if (fm) params.month=fm;
  try {
    const res = await SalaryAPI.listAdvances(params);
    const tbody = document.getElementById('advBody');
    if (!res.data.length) {
      tbody.innerHTML=`<tr><td colspan="6">${emptyState('fa-money-bill-wave','No advance records','Add an advance using the form above.')}</td></tr>`;
      return;
    }
    tbody.innerHTML = res.data.map(a=>`
      <tr>
        <td><div class="emp-name-cell"><div class="emp-avatar">${ini(a.employee?.name)}</div>${a.employee?.name||'—'}</div></td>
        <td><span class="mono sm">${a.month}</span></td>
        <td><span class="mono sm">${a.date}</span></td>
        <td><span class="mono" style="color:var(--red)">${fmt(a.amount)}</span></td>
        <td>${a.note||'—'}</td>
        <td class="no-print">
          <div style="display:flex;gap:6px">
            <button class="btn-icon" onclick="editAdvModal('${a._id}','${a.amount}','${a.note||''}','${a.date}')" title="Edit"><i class="fas fa-pen"></i></button>
            <button class="btn-icon danger" onclick="deleteAdv('${a._id}')" title="Delete"><i class="fas fa-trash-can"></i></button>
          </div>
        </td>
      </tr>`).join('');
  } catch (err) { toast(err.message,'error'); }
}

function editAdvModal(id, amount, note, date) {
  openModal('Edit Advance', `
    <div class="form-grid">
      <div class="form-group"><label>Amount (₹)</label><input type="number" id="m_advAmt" value="${amount}" min="1"/></div>
      <div class="form-group"><label>Date Given</label><input type="date" id="m_advDate" value="${date}"/></div>
      <div class="form-group" style="grid-column:1/-1"><label>Note</label><input id="m_advNote" value="${note}"/></div>
    </div>`, async () => {
    try {
      await SalaryAPI.updateAdvance(id, { amount:parseFloat(v('m_advAmt')), note:v('m_advNote'), date:v('m_advDate') });
      closeModal(); await renderAdvancesTable(); toast('Advance updated!','success');
    } catch (err) { toast(err.message,'error'); }
  });
}

async function deleteAdv(id) {
  if (!confirm('Delete this advance record?')) return;
  try {
    await SalaryAPI.removeAdvance(id); await renderAdvancesTable(); toast('Advance deleted.','info');
  } catch (err) { toast(err.message,'error'); }
}

/* ================================================================
   SALARY REPORT
================================================================ */
async function genReport() {
  const month = v('repMo');
  if (!month) { toast('Select a month first.','error'); return; }
  try {
    setBtnLoading('genRepBtn', true);
    const res = await SalaryAPI.report(month);
    renderSalaryReport(res, month);
    toast('Report generated!','success');
  } catch (err) { toast(err.message,'error'); }
  finally { setBtnLoading('genRepBtn', false, '<i class="fas fa-chart-line"></i> Generate'); }
}

function renderSalaryReport(res, month) {
  const [yr,mo] = month.split('-');
  const label = new Date(yr, mo-1).toLocaleString('en-IN', {month:'long', year:'numeric'});
  document.getElementById('repLabel').textContent = label;

  if (!res.data.length) {
    document.getElementById('repContent').innerHTML = emptyState('fa-file-circle-question','No data','No employees or attendance for this month.');
    return;
  }

  const rows = res.data.map(r=>`
    <tr>
      <td><div class="emp-name-cell"><div class="emp-avatar">${ini(r.employee.name)}</div>${r.employee.name}</div></td>
      <td><span class="mono sm">${r.employee.empId}</span></td>
      <td><span class="role-tag">${r.employee.role}</span></td>
      <td><span class="mono">${fmt(r.employee.wage)}</span></td>
      <td style="text-align:center"><span class="badge badge-present">${r.presentCount}</span></td>
      <td style="text-align:center"><span class="badge badge-halfday">${r.halfDayCount}</span></td>
      <td style="text-align:center"><span class="badge badge-absent">${r.absentCount}</span></td>
      <td><span class="mono">${fmt(r.baseSalary)}</span></td>
      <td><span class="mono" style="color:var(--red)">${r.advanceTaken>0?'- '+fmt(r.advanceTaken):'—'}</span></td>
      <td><span class="mono" style="color:var(--green);font-weight:700">${fmt(r.finalPayable)}</span></td>
    </tr>`).join('');

  document.getElementById('repContent').innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Employee</th><th>ID</th><th>Role</th><th>Daily Wage</th>
            <th>Present</th><th>Half-Day</th><th>Absent</th>
            <th>Base Salary</th><th>Advance</th><th>Final Payable</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr class="salary-total-row">
            <td colspan="7"><strong>GRAND TOTAL — ${label}</strong></td>
            <td><span class="mono"><strong>${fmt(res.grandTotal)}</strong></span></td>
            <td><span class="mono" style="color:var(--red)"><strong>- ${fmt(res.grandAdvance)}</strong></span></td>
            <td><span class="mono" style="color:var(--green)"><strong>${fmt(res.grandPayable)}</strong></span></td>
          </tr>
        </tbody>
      </table>
    </div>
    <div style="margin-top:14px;font-size:12px;color:var(--text-muted)">
      <i class="fas fa-circle-info"></i>
      &nbsp;Present = full wage · Half-Day = 0.5× wage · Absent/Leave = ₹0 · Final Payable = Base − Advance
    </div>`;
}

/* ================================================================
   DASHBOARD
================================================================ */
async function renderDashboard() {
  try {
    setLoading(true,'Loading dashboard…');
    const todayRes = await AttendanceAPI.today();
    const todayLogs = todayRes.data;

    document.getElementById('cTotalEmp').textContent = employees.length;
    document.getElementById('todayBadge').textContent =
      new Date().toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});

    const pToday = todayLogs.filter(a=>a.status==='Present').length;
    document.getElementById('cPresent').textContent = pToday;
    const pctEl = document.getElementById('cPresentPct');
    if (employees.length) {
      const p = Math.round((pToday/employees.length)*100);
      pctEl.textContent = `${p}% attendance rate`;
      pctEl.className   = `stat-change ${p>=75?'up':'down'}`;
    } else { pctEl.textContent='—'; pctEl.className='stat-change'; }

    try {
      const repRes = await SalaryAPI.report(curMo());
      document.getElementById('cSalary').textContent  = fmt(repRes.grandPayable);
      document.getElementById('cAdvance').textContent = fmt(repRes.grandAdvance);
    } catch { document.getElementById('cSalary').textContent='—'; }

    const [yr,mo] = curMo().split('-');
    document.getElementById('cSalaryMo').textContent =
      new Date(yr,mo-1).toLocaleString('en-IN',{month:'long',year:'numeric'});

    const bc = s=>({Present:'badge-present',Absent:'badge-absent','Half-Day':'badge-halfday',Leave:'badge-leave'})[s]||'';
    const listEl = document.getElementById('todayList');
    listEl.innerHTML = todayLogs.length
      ? `<div style="display:flex;flex-direction:column;gap:10px">${todayLogs.map(l=>`
          <div class="today-row">
            <div class="emp-name-cell" style="gap:10px">
              <div class="emp-avatar">${ini(l.employee?.name)}</div>
              <div>
                <div style="font-weight:600;font-size:13px">${l.employee?.name||'?'}</div>
                <div style="font-size:11px;color:var(--text-muted)">${l.employee?.role||''}</div>
              </div>
            </div>
            <div style="text-align:right">
              <span class="badge ${bc(l.status)}">${l.status}</span>
              ${l.checkIn?`<div class="mono sm" style="color:var(--text-muted);margin-top:4px">${l.checkIn} → ${l.checkOut}</div>`:''}
            </div>
          </div>`).join('')}</div>`
      : emptyState('fa-calendar-xmark','No logs today','Go to "Log Attendance" to record today\'s shifts.');

    renderRoleBars(todayLogs);
  } catch (err) { toast(err.message,'error'); }
  finally { setLoading(false); }
}

function renderRoleBars(logs) {
  const el = document.getElementById('attBars');
  if (!employees.length) { el.innerHTML=emptyState('fa-users-slash','No employees','Register employees first.'); return; }
  const roles  = [...new Set(employees.map(e=>e.role))];
  const colors = ['var(--accent)','var(--green)','var(--red)','var(--purple)','var(--accent2)','var(--amber)'];
  el.innerHTML = roles.map((r,i) => {
    const total   = employees.filter(e=>e.role===r).length;
    const present = logs.filter(l=>l.employee?.role===r&&l.status==='Present').length;
    const pct     = total ? Math.round((present/total)*100) : 0;
    return `
      <div class="att-bar-row">
        <div class="att-bar-label">${r.split(' ')[0]}</div>
        <div class="att-bar-track"><div class="att-bar-fill" style="width:${pct}%;background:${colors[i%colors.length]}"></div></div>
        <div class="att-bar-pct">${pct}%</div>
      </div>
      <div style="font-size:11px;color:var(--text-muted);margin-left:92px;margin-top:-6px">${present}/${total} present</div>`;
  }).join('');
}

async function updateCards() {
  try {
    const repRes = await SalaryAPI.report(curMo());
    document.getElementById('cSalary').textContent  = fmt(repRes.grandPayable);
    document.getElementById('cAdvance').textContent = fmt(repRes.grandAdvance);
  } catch { /**/ }
  try {
    const todayRes = await AttendanceAPI.today();
    document.getElementById('cPresent').textContent = todayRes.data.filter(a=>a.status==='Present').length;
  } catch { /**/ }
  document.getElementById('cTotalEmp').textContent = employees.length;
}

function fillEmpDrops() {
  const opts = employees.map(e=>`<option value="${e._id}">${e.name} (${e.empId})</option>`).join('');
  const all  = `<option value="">All Employees</option>`;
  ['aEmp','advEmp'].forEach(id=>{ const el=document.getElementById(id); if(el) el.innerHTML=`<option value="">— Select Employee —</option>${opts}`; });
  ['filterEmp','filterAdvEmp'].forEach(id=>{ const el=document.getElementById(id); if(el) el.innerHTML=all+opts; });
}

/* ================================================================
   PWA INSTALL
================================================================ */
let deferredPrompt;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); deferredPrompt = e;
  document.getElementById('installBanner')?.classList.add('visible');
});
function installApp() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then(() => {
    deferredPrompt = null;
    document.getElementById('installBanner')?.classList.remove('visible');
  });
}

/* ================================================================
   APP INIT
================================================================ */
async function initApp() {
  document.getElementById('curDate').textContent =
    new Date().toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short',year:'numeric'});

  set('aDate', today()); set('filterMo', curMo()); set('filterAdvMo', curMo());
  set('advMonth', curMo()); set('advDate', today()); set('repMo', curMo());
  set('drsDate', today()); set('drsFilterMo', curMo());

  toggleTime(); calcHrs();

  setLoading(true,'Loading employees…');
  await loadEmployees();
  setLoading(false);
  fillEmpDrops();
  renderEmpTable();
  renderDashboard();
}

/* ================================================================
   BOOT
================================================================ */
window.addEventListener('DOMContentLoaded', () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
      .catch(err => console.warn('SW failed:', err));
  }

  window.addEventListener('kp:logout', showAuthScreen);

  document.getElementById('modal')?.addEventListener('click', e => {
    if (e.target === document.getElementById('modal')) closeModal();
  });

  if (Auth.isLoggedIn()) { showAppShell(); initApp(); }
  else { showAuthScreen(); }
});

/* ================================================================
   FEATURE 1 — EMPLOYEE ATTENDANCE REPORT MODAL
================================================================ */

function openER(empId) {
  const emp = employees.find(e => e._id === empId);
  if (!emp) return;
  const modal = document.getElementById('erModal');
  modal.dataset.empId = empId;
  document.getElementById('erAvatar').textContent = ini(emp.name);
  document.getElementById('erName').textContent   = emp.name;
  document.getElementById('erMeta').textContent   = emp.empId + ' · ' + emp.role + ' · ₹' + emp.wage + '/day';
  document.getElementById('erMonth').value = curMo();
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  fetchER(emp, curMo());
}

function closeER() {
  document.getElementById('erModal').style.display = 'none';
  document.body.style.overflow = '';
}

function erMonthChange() {
  const modal = document.getElementById('erModal');
  const emp   = employees.find(e => e._id === modal.dataset.empId);
  const month = document.getElementById('erMonth').value;
  if (emp) fetchER(emp, month);
}

async function fetchER(emp, month) {
  const body = document.getElementById('erBody');
  body.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8"><i class="fas fa-spinner fa-spin" style="font-size:24px"></i><div style="margin-top:12px;font-size:13px">Loading…</div></div>';

  try {
    const params = { employeeId: emp._id };
    if (month) params.month = month;

    const [attRes, advRes] = await Promise.all([
      AttendanceAPI.list(params),
      SalaryAPI.listAdvances({ employeeId: emp._id, month: month || undefined })
    ]);

    const recs = attRes.data || [];
    const advs = advRes.data || [];

    const present  = recs.filter(r => r.status === 'Present').length;
    const halfDay  = recs.filter(r => r.status === 'Half-Day').length;
    const absent   = recs.filter(r => r.status === 'Absent').length;
    const leave    = recs.filter(r => r.status === 'Leave').length;
    const totalHrs = recs.reduce((s, r) => s + (r.hoursWorked || 0), 0);
    const avgHrs   = recs.filter(r => r.hoursWorked > 0).length
      ? totalHrs / recs.filter(r => r.hoursWorked > 0).length : 0;
    const baseSal  = (present * emp.wage) + (halfDay * emp.wage * 0.5);
    const totalAdv = advs.reduce((s, a) => s + (a.amount || 0), 0);
    const netPay   = baseSal - totalAdv;

    const periodLabel = month
      ? new Date(month + '-01').toLocaleString('en-IN', { month: 'long', year: 'numeric' })
      : 'All Time';

    const statusColor = { Present: '#4ade80', Absent: '#f87171', 'Half-Day': '#fbbf24', Leave: '#60a5fa' };

    const tableRows = recs.length
      ? recs.sort((a, b) => b.date.localeCompare(a.date)).map(r =>
          '<tr>' +
          '<td style="font-family:monospace;font-size:11px;white-space:nowrap">' + r.date + '</td>' +
          '<td><span style="color:' + (statusColor[r.status] || '#e2e8f0') + ';font-weight:700;font-size:12px">' + r.status + '</span></td>' +
          '<td style="font-size:12px">' + (r.checkIn || '—') + '</td>' +
          '<td style="font-size:12px">' + (r.checkOut || '—') + '</td>' +
          '<td style="font-size:12px;font-family:monospace">' + (r.hoursWorked ? toHoursMin(r.hoursWorked) : '—') + '</td>' +
          '<td style="font-size:11px;color:#94a3b8">' + (r.notes || '—') + '</td>' +
          '</tr>'
        ).join('')
      : '<tr><td colspan="6" style="text-align:center;padding:24px;color:#94a3b8">No records for this period.</td></tr>';

    // Build full report HTML (no CSS vars — only real colors for PDF compat)
    const reportHTML =
      '<div style="margin-bottom:18px">' +
        '<div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px">Period: ' + periodLabel + '</div>' +
        '<div style="font-size:11px;color:#64748b">Generated: ' + new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) + '</div>' +
      '</div>' +

      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:18px">' +
        [['Present', present, '#4ade80'], ['Half-Day', halfDay, '#fbbf24'], ['Absent', absent, '#f87171'],
         ['Leave', leave, '#60a5fa'], ['Total Hrs', toHoursMin(totalHrs), '#a78bfa'], ['Avg Hrs/Day', toHoursMin(avgHrs), '#34d399']]
        .map(function(x) {
          return '<div style="background:#12122a;border:1px solid #2d2d44;border-radius:10px;padding:12px;text-align:center">' +
            '<div style="font-size:18px;font-weight:700;color:' + x[2] + ';font-family:monospace">' + x[1] + '</div>' +
            '<div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-top:4px">' + x[0] + '</div>' +
          '</div>';
        }).join('') +
      '</div>' +

      '<div style="background:#12122a;border:1px solid #2d2d44;border-radius:10px;padding:14px;margin-bottom:18px;display:flex;gap:16px;flex-wrap:wrap;align-items:center">' +
        '<div><div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px">Base Salary</div><div style="font-size:17px;font-weight:700;color:#e2e8f0;font-family:monospace">₹' + Number(baseSal).toLocaleString('en-IN', {minimumFractionDigits:2}) + '</div></div>' +
        '<div style="color:#475569;font-size:18px">−</div>' +
        '<div><div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px">Advance</div><div style="font-size:17px;font-weight:700;color:#f87171;font-family:monospace">₹' + Number(totalAdv).toLocaleString('en-IN', {minimumFractionDigits:2}) + '</div></div>' +
        '<div style="color:#475569;font-size:18px">=</div>' +
        '<div><div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px">Net Payable</div><div style="font-size:22px;font-weight:800;color:#4ade80;font-family:monospace">₹' + Number(netPay).toLocaleString('en-IN', {minimumFractionDigits:2}) + '</div></div>' +
      '</div>' +

      '<div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.7px;margin-bottom:8px">Attendance Records (' + recs.length + ')</div>' +
      '<div style="overflow-x:auto;border:1px solid #2d2d44;border-radius:8px">' +
        '<table style="width:100%;border-collapse:collapse;font-size:12px">' +
          '<thead><tr style="background:#12122a">' +
            '<th style="padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.4px;color:#94a3b8;border-bottom:1px solid #2d2d44">Date</th>' +
            '<th style="padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.4px;color:#94a3b8;border-bottom:1px solid #2d2d44">Status</th>' +
            '<th style="padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.4px;color:#94a3b8;border-bottom:1px solid #2d2d44">In</th>' +
            '<th style="padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.4px;color:#94a3b8;border-bottom:1px solid #2d2d44">Out</th>' +
            '<th style="padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.4px;color:#94a3b8;border-bottom:1px solid #2d2d44">Hours</th>' +
            '<th style="padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.4px;color:#94a3b8;border-bottom:1px solid #2d2d44">Notes</th>' +
          '</tr></thead>' +
          '<tbody>' + tableRows + '</tbody>' +
        '</table>' +
      '</div>';

    body.innerHTML = reportHTML;
    // Store for download
    document.getElementById('erModal').dataset.reportHtml = reportHTML;
    document.getElementById('erModal').dataset.empName    = emp.name;
    document.getElementById('erModal').dataset.period     = periodLabel;

  } catch (err) {
    body.innerHTML = '<div style="color:#f87171;padding:24px;text-align:center"><i class="fas fa-circle-xmark" style="font-size:28px;display:block;margin-bottom:12px"></i>' + err.message + '</div>';
  }
}

function downloadER() {
  const modal      = document.getElementById('erModal');
  const reportHtml = modal.dataset.reportHtml;
  const empName    = modal.dataset.empName || 'Employee';
  const period     = modal.dataset.period  || '';
  if (!reportHtml) { toast('Report not loaded yet.', 'error'); return; }

  const emp = employees.find(e => e._id === modal.dataset.empId);

  const fullPage = '<!DOCTYPE html><html><head>' +
    '<meta charset="utf-8"/>' +
    '<title>Report - ' + empName + ' - ' + period + '</title>' +
    '<style>' +
      'body{font-family:Arial,sans-serif;background:#fff;color:#111;padding:28px;margin:0}' +
      'table{width:100%;border-collapse:collapse}' +
      'th,td{padding:7px 10px;border:1px solid #e5e7eb;font-size:11px}' +
      'th{background:#f3f4f6;font-size:10px;text-transform:uppercase;letter-spacing:.4px}' +
      '.cover{text-align:center;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #e5e7eb}' +
      '.cover h1{font-size:22px;margin:0 0 4px}' +
      '.cover p{font-size:13px;color:#6b7280;margin:2px 0}' +
      '/* Override dark backgrounds for print */' +
      'div[style*="background:#12122a"]{background:#f9fafb!important;border-color:#e5e7eb!important}' +
      'div[style*="background:#1a1a"]{background:#f9fafb!important}' +
    '</style>' +
    '</head><body>' +
    '<div class="cover">' +
      '<h1>' + empName + '</h1>' +
      '<p>' + (emp ? emp.empId + ' · ' + emp.role + ' · ₹' + emp.wage + '/day' : '') + '</p>' +
      '<p><strong>Attendance Report — ' + period + '</strong></p>' +
      '<p style="font-size:11px;color:#9ca3af">KingPloyee · Generated ' + new Date().toLocaleDateString('en-IN') + '</p>' +
    '</div>' +
    reportHtml +
    '<script>window.onload=function(){window.print();}<\/script>' +
    '</body></html>';

  const blob = new Blob([fullPage], { type: 'text/html' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'Report_' + empName.replace(/\s+/g,'_') + '_' + period.replace(/\s+/g,'_') + '.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function(){ URL.revokeObjectURL(url); }, 3000);
  toast('Report downloaded! Open the file → browser will print/save as PDF.', 'success');
}

// Close modal on backdrop click
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('erModal')?.addEventListener('click', function(e) {
    if (e.target === document.getElementById('erModal')) closeER();
  });
});

/* ================================================================
   FEATURE 2 — DRS (Delivery Run Sheets) — Server based
================================================================ */

function drsFillDrops() {
  const opts = employees.map(e => '<option value="' + e._id + '">' + e.name + ' (' + e.empId + ')</option>').join('');
  var el;
  el = document.getElementById('drsEmp');
  if (el) el.innerHTML = '<option value="">— Select Employee —</option>' + opts;
  el = document.getElementById('drsFilterEmp');
  if (el) el.innerHTML = '<option value="">All Employees</option>' + opts;
  el = document.getElementById('drsFilterMo');
  if (el && !el.value) el.value = curMo();
}

function drsFileChosen(input) {
  const files = input.files;
  if (!files || !files.length) return;
  const span = document.getElementById('drsFileName');
  if (span) span.textContent = files.length === 1 ? files[0].name : files.length + ' files selected';
  const zone = document.getElementById('drsDropZone');
  if (zone) zone.style.borderColor = '#4ade80';
}

function fileToB64(file) {
  return new Promise(function(resolve, reject) {
    const reader = new FileReader();
    reader.onload  = function() { resolve(reader.result); };
    reader.onerror = function() { reject(new Error('File read failed')); };
    reader.readAsDataURL(file);
  });
}

async function saveDRS() {
  const empId     = v('drsEmp');
  const date      = v('drsDate');
  const note      = v('drsNote');
  const fileInput = document.getElementById('drsFile');
  const files     = fileInput ? fileInput.files : null;

  if (!empId)              { toast('Select an employee.', 'error'); return; }
  if (!date)               { toast('Select the date.', 'error'); return; }
  if (!files || !files.length) { toast('Choose at least one file.', 'error'); return; }

  setBtnLoading('saveDrsBtn', true);
  try {
    const emp = employees.find(e => e._id === empId);
    for (let i = 0; i < files.length; i++) {
      const file     = files[i];
      const fileData = await fileToB64(file);
      await DRSAPI.create({
        employeeId: empId,
        date:       date,
        fileName:   file.name,
        fileType:   file.type,
        fileData:   fileData,
        note:       files.length > 1 ? (note ? note + ' [' + (i+1) + '/' + files.length + ']' : 'File ' + (i+1) + '/' + files.length) : note,
      });
    }
    set('drsEmp', ''); set('drsDate', today()); set('drsNote', '');
    fileInput.value = '';
    var span = document.getElementById('drsFileName');
    if (span) span.textContent = 'Tap to choose · multiple files allowed';
    var zone = document.getElementById('drsDropZone');
    if (zone) zone.style.borderColor = '';
    await loadDRS();
    var nm = emp ? emp.name : 'employee';
    toast(files.length + ' sheet' + (files.length > 1 ? 's' : '') + ' for ' + nm + ' (' + date + ') saved!', 'success');
  } catch (err) {
    toast('Upload failed: ' + err.message, 'error');
  } finally {
    setBtnLoading('saveDrsBtn', false, '<i class="fas fa-floppy-disk"></i> Save Run Sheet');
  }
}

async function loadDRS() {
  const wrap = document.getElementById('drsListWrap');
  if (!wrap) return;

  const filterEmp  = v('drsFilterEmp');
  const filterMo   = v('drsFilterMo');
  const filterDate = v('drsFilterDate');

  wrap.innerHTML = '<div style="text-align:center;padding:32px;color:#94a3b8"><i class="fas fa-spinner fa-spin" style="font-size:20px"></i><div style="margin-top:10px;font-size:13px">Loading…</div></div>';

  try {
    const params = {};
    if (filterEmp)       params.employeeId = filterEmp;
    if (filterDate)      params.date       = filterDate;
    else if (filterMo)   params.month      = filterMo;

    const res  = await DRSAPI.list(params);
    const data = res.data || [];

    if (!data.length) {
      wrap.innerHTML = '<div class="empty-state"><i class="fas fa-truck-fast"></i><h3>No run sheets found</h3><p>Try different filters or upload above.</p></div>';
      return;
    }

    // Group by employee
    const byEmp = {};
    data.forEach(function(r) {
      const eid = (r.employee && r.employee._id) ? r.employee._id : r.employee;
      if (!byEmp[eid]) byEmp[eid] = { name: (r.employee && r.employee.name) || '—', role: (r.employee && r.employee.role) || '', records: [] };
      byEmp[eid].records.push(r);
    });

    const month = filterMo || curMo();

    wrap.innerHTML = Object.keys(byEmp).map(function(eid) {
      const grp = byEmp[eid];
      const rows = grp.records.map(function(r) {
        const isPdf = r.fileType === 'application/pdf';
        return '<div style="display:flex;align-items:center;justify-content:space-between;padding:11px 16px;border-bottom:1px solid var(--border);gap:8px">' +
          '<div style="display:flex;align-items:center;gap:10px">' +
            '<div style="width:34px;height:34px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0;background:' + (isPdf ? 'rgba(239,68,68,.15)' : 'rgba(59,130,246,.15)') + ';color:' + (isPdf ? '#f87171' : '#60a5fa') + '">' +
              '<i class="fas ' + (isPdf ? 'fa-file-pdf' : 'fa-file-image') + '"></i>' +
            '</div>' +
            '<div>' +
              '<div style="font-size:13px;font-weight:600">' + r.date + '</div>' +
              '<div style="font-size:11px;color:var(--text-muted)">' + r.fileName + (r.note ? ' · ' + r.note : '') + '</div>' +
            '</div>' +
          '</div>' +
          '<div style="display:flex;gap:6px;flex-shrink:0">' +
            '<button class="btn-icon" onclick="viewDRS(\'' + r._id + '\')" title="View"><i class="fas fa-eye"></i></button>' +
            '<button class="btn-icon" onclick="dlDRS(\'' + r._id + '\',\'' + r.fileName.replace(/'/g,"\\'") + '\')" title="Download"><i class="fas fa-download"></i></button>' +
            '<button class="btn-icon danger" onclick="delDRS(\'' + r._id + '\')" title="Delete"><i class="fas fa-trash-can"></i></button>' +
          '</div>' +
        '</div>';
      }).join('');

      return '<div style="border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;margin-bottom:16px">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:var(--surface2);border-bottom:1px solid var(--border);flex-wrap:wrap;gap:8px">' +
          '<div style="display:flex;align-items:center;gap:10px">' +
            '<div class="emp-avatar">' + ini(grp.name) + '</div>' +
            '<div>' +
              '<div style="font-weight:700;font-size:14px">' + grp.name + '</div>' +
              '<div style="font-size:11px;color:var(--text-muted)">' + grp.role + ' · ' + grp.records.length + ' sheet' + (grp.records.length !== 1 ? 's' : '') + '</div>' +
            '</div>' +
          '</div>' +
          '<button class="btn btn-secondary" style="font-size:12px;padding:7px 12px" onclick="dlMonthDRS(\'' + eid + '\',\'' + month + '\',\'' + grp.name.replace(/'/g,"\\'") + '\')">' +
            '<i class="fas fa-file-arrow-down"></i> Download Month PDF' +
          '</button>' +
        '</div>' +
        '<div>' + rows + '</div>' +
      '</div>';
    }).join('');

  } catch (err) {
    wrap.innerHTML = '<div style="color:var(--red);padding:24px;text-align:center"><i class="fas fa-circle-xmark" style="font-size:24px;display:block;margin-bottom:10px"></i>' + err.message + '</div>';
  }
}

async function viewDRS(id) {
  try {
    toast('Loading…', 'info');
    const res = await DRSAPI.getFile(id);
    const rec = res.data;
    if (rec.fileType === 'application/pdf') {
      // Download directly for PDF (mobile browsers can't embed)
      const a = document.createElement('a');
      a.href = rec.fileData;
      a.download = rec.fileName;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } else {
      const win = window.open('', '_blank');
      if (win) {
        win.document.write('<html><body style="margin:0;background:#111;display:flex;align-items:center;justify-content:center;min-height:100vh"><img src="' + rec.fileData + '" style="max-width:100%;max-height:100vh"/></body></html>');
      } else {
        const a = document.createElement('a');
        a.href = rec.fileData; a.download = rec.fileName;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
      }
    }
  } catch (err) { toast('Failed: ' + err.message, 'error'); }
}

async function dlDRS(id, fileName) {
  try {
    toast('Downloading…', 'info');
    const res = await DRSAPI.getFile(id);
    const rec = res.data;
    const a   = document.createElement('a');
    a.href     = rec.fileData;
    a.download = 'DRS_' + ((rec.employee && rec.employee.name) || '') + '_' + rec.date + '_' + fileName;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  } catch (err) { toast('Download failed: ' + err.message, 'error'); }
}

async function delDRS(id) {
  if (!confirm('Delete this run sheet?')) return;
  try {
    await DRSAPI.remove(id);
    await loadDRS();
    toast('Deleted.', 'info');
  } catch (err) { toast('Failed: ' + err.message, 'error'); }
}

async function dlMonthDRS(empId, month, empName) {
  try {
    toast('Fetching run sheets…', 'info');
    const res = await DRSAPI.monthFiles(empId, month);
    const all = res.data || [];
    if (!all.length) { toast('No run sheets for this month.', 'warn'); return; }

    const emp = employees.find(function(e) { return e._id === empId; });
    const parts = month.split('-');
    const monthLabel = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1)
      .toLocaleString('en-IN', { month: 'long', year: 'numeric' });
    const name = (emp && emp.name) || empName || 'Employee';

    // Build HTML with all sheets embedded
    const pages = all.sort(function(a,b){return a.date.localeCompare(b.date);}).map(function(r) {
      const header = '<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:8px 14px;margin-bottom:10px;font-size:12px;color:#374151"><strong>' + r.date + '</strong>' + (r.note ? ' · ' + r.note : '') + ' — ' + r.fileName + '</div>';
      if (r.fileType === 'application/pdf') {
        return '<div style="page-break-after:always;padding:12px">' + header +
          '<p style="text-align:center;padding:20px;color:#6b7280;border:1px dashed #d1d5db;border-radius:8px">PDF: <a href="' + r.fileData + '" download="' + r.fileName + '" style="color:#e63946;font-weight:700">Download ' + r.date + ' sheet</a></p>' +
          '</div>';
      }
      return '<div style="page-break-after:always;padding:12px">' + header +
        '<img src="' + r.fileData + '" style="max-width:100%;border-radius:6px;display:block;margin:0 auto"/>' +
        '</div>';
    }).join('');

    const fullHtml = '<!DOCTYPE html><html><head>' +
      '<meta charset="utf-8"/>' +
      '<title>DRS ' + name + ' ' + monthLabel + '</title>' +
      '<style>body{margin:0;font-family:Arial,sans-serif;background:#fff}' +
      '.cover{background:linear-gradient(135deg,#e63946,#1d4ed8);color:#fff;padding:48px 32px;text-align:center;page-break-after:always;min-height:90vh;display:flex;flex-direction:column;align-items:center;justify-content:center}' +
      '.cover h1{font-size:28px;margin:0 0 8px}.cover p{margin:4px 0;font-size:15px;opacity:.85}' +
      '@media print{*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style>' +
      '</head><body>' +
      '<div class="cover"><div style="font-size:52px;margin-bottom:16px">📦</div><h1>Delivery Run Sheets</h1><p style="font-size:18px;font-weight:700">' + name + '</p>' +
      '<p>' + ((emp && emp.empId) || '') + (emp && emp.role ? ' · ' + emp.role : '') + '</p>' +
      '<p>' + monthLabel + ' · ' + all.length + ' sheet' + (all.length !== 1 ? 's' : '') + '</p>' +
      '<p style="opacity:.6;font-size:13px;margin-top:12px">KingPloyee — Branch Management System</p></div>' +
      pages +
      '<script>window.onload=function(){window.print();}<\/script>' +
      '</body></html>';

    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'DRS_' + name.replace(/\s+/g, '_') + '_' + month + '.html';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(url); }, 5000);
    toast('Downloaded! Open the file in browser → Print → Save as PDF', 'success');
  } catch (err) { toast('Failed: ' + err.message, 'error'); }
}

/* drag-drop for DRS */
document.addEventListener('DOMContentLoaded', function() {
  const zone = document.getElementById('drsDropZone');
  if (zone) {
    zone.addEventListener('dragover', function(e){ e.preventDefault(); zone.style.borderColor='#e63946'; });
    zone.addEventListener('dragleave', function(){ zone.style.borderColor=''; });
    zone.addEventListener('drop', function(e){
      e.preventDefault(); zone.style.borderColor='';
      var input = document.getElementById('drsFile');
      if (e.dataTransfer.files.length && input) {
        try {
          var dt = new DataTransfer();
          Array.from(e.dataTransfer.files).forEach(function(f){ dt.items.add(f); });
          input.files = dt.files;
          drsFileChosen(input);
        } catch(ex) {}
      }
    });
  }
});
