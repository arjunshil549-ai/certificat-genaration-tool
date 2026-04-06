/* FalconSec Certificate Platform – Admin Dashboard JS */
const API = '/api';
let authToken = null;
let currentUser = null;
let currentSection = 'dashboard';
let certsPage = 1;
let statusChart = null;

// ─── Auth ──────────────────────────────────────────────────────────────────
function getToken() {
  return authToken || localStorage.getItem('falconsec_token');
}

function setToken(token, user) {
  authToken = token;
  localStorage.setItem('falconsec_token', token);
  if (user) {
    currentUser = user;
    localStorage.setItem('falconsec_user', JSON.stringify(user));
  }
}

function clearAuth() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem('falconsec_token');
  localStorage.removeItem('falconsec_user');
}

function apiHeaders(extra = {}) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, ...extra };
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: { ...apiHeaders(), ...options.headers },
  });
  const data = await res.json();
  if (res.status === 401) { logout(); return null; }
  return { ok: res.ok, status: res.status, data };
}

// ─── Toast ──────────────────────────────────────────────────────────────────
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  const allowedTypes = { success: 'check-circle', error: 'times-circle', info: 'info-circle', warning: 'exclamation-circle' };
  const safeType = allowedTypes[type] ? type : 'info';
  const icon = allowedTypes[safeType];
  toast.className = `toast toast-${safeType}`;
  toast.innerHTML = `<i class="fa fa-${icon}"></i> ${escHtml(message)}`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => toast.remove(), 300); }, 4000);
}

// ─── Login ─────────────────────────────────────────────────────────────────
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('loginBtn');
  const errDiv = document.getElementById('loginError');
  errDiv.style.display = 'none';
  btn.disabled = true;
  btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Signing in...';

  try {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: document.getElementById('loginUsername').value,
        password: document.getElementById('loginPassword').value,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Login failed');

    setToken(data.data.token, data.data.user);
    showApp();
  } catch (err) {
    errDiv.textContent = err.message;
    errDiv.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa fa-sign-in-alt"></i> Sign In';
  }
});

function logout() {
  clearAuth();
  document.getElementById('adminApp').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
}

document.getElementById('logoutBtn').addEventListener('click', (e) => { e.preventDefault(); logout(); });

// ─── Show App ──────────────────────────────────────────────────────────────
function showApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('adminApp').style.display = 'flex';

  const user = currentUser || JSON.parse(localStorage.getItem('falconsec_user') || '{}');
  document.getElementById('sidebarUsername').textContent = user.username || '';
  document.getElementById('sidebarRole').textContent = user.role || '';

  // Hide admin-only items for non-admins
  if (user.role !== 'admin') {
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
  }

  // Load templates into admin cert form
  loadTemplatesForForm();
  showSection('dashboard');
}

// ─── Navigation ─────────────────────────────────────────────────────────────
document.querySelectorAll('.nav-item[data-section]').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    showSection(item.dataset.section);
    // Close sidebar on mobile
    document.querySelector('.sidebar').classList.remove('open');
  });
});

document.getElementById('sidebarToggle').addEventListener('click', () => {
  document.querySelector('.sidebar').classList.toggle('open');
});

const AdminApp = {
  showSection: (s) => showSection(s),
};

function showSection(section) {
  currentSection = section;
  document.querySelectorAll('.admin-section').forEach(s => s.style.display = 'none');
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));

  const sectionEl = document.getElementById(`section-${section}`);
  if (sectionEl) sectionEl.style.display = 'block';

  const navItem = document.querySelector(`.nav-item[data-section="${section}"]`);
  if (navItem) navItem.classList.add('active');

  const titles = {
    dashboard: 'Dashboard', certificates: 'Certificates', batch: 'Batch Upload',
    templates: 'Templates', users: 'Users', emailLogs: 'Email Logs',
  };
  document.getElementById('pageTitle').textContent = titles[section] || section;

  switch (section) {
    case 'dashboard': loadDashboard(); break;
    case 'certificates': loadCertificates(); break;
    case 'templates': loadTemplates(); break;
    case 'users': loadUsers(); break;
    case 'emailLogs': loadEmailLogs(); break;
  }
}

// ─── Dashboard ──────────────────────────────────────────────────────────────
async function loadDashboard() {
  try {
    const r = await apiFetch('/stats/dashboard');
    if (!r || !r.data.success) return;
    const { certificates, emails, users } = r.data.data;
    document.getElementById('statTotal').textContent = certificates.total;
    document.getElementById('statMonth').textContent = certificates.thisMonth;
    document.getElementById('statEmails').textContent = emails.sent;
    document.getElementById('statUsers').textContent = users.active;

    // Chart
    renderStatusChart(certificates);

    // Recent certs
    loadRecentCerts();
  } catch (e) { console.error(e); }
}

function renderStatusChart(stats) {
  const ctx = document.getElementById('statusChart').getContext('2d');
  if (statusChart) statusChart.destroy();
  statusChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Active', 'Revoked', 'Expired'],
      datasets: [{
        data: [stats.active || 0, stats.revoked || 0, (stats.total - stats.active - stats.revoked) || 0],
        backgroundColor: ['#2e7d32', '#c62828', '#f57c00'],
        borderWidth: 0,
      }],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 12 } } },
      },
    },
  });
}

async function loadRecentCerts() {
  const r = await apiFetch('/certificates?limit=5');
  if (!r || !r.data.success) return;
  const certs = r.data.data.certificates;
  const container = document.getElementById('recentCerts');
  if (!certs.length) { container.innerHTML = '<p class="text-muted text-sm">No certificates yet.</p>'; return; }
  container.innerHTML = certs.map(c => `
    <div class="recent-item">
      <div class="recent-item-icon"><i class="fa fa-certificate"></i></div>
      <div class="recent-item-info">
        <div class="recent-item-name">${escHtml(c.recipient_name)}</div>
        <div class="recent-item-course">${escHtml(c.course_name)}</div>
      </div>
      <span class="badge badge-${c.status}">${c.status}</span>
    </div>
  `).join('');
}

// ─── Certificates ────────────────────────────────────────────────────────────
let certSearchTimeout;
document.getElementById('certSearch').addEventListener('input', (e) => {
  clearTimeout(certSearchTimeout);
  certSearchTimeout = setTimeout(() => { certsPage = 1; loadCertificates(); }, 400);
});
document.getElementById('certStatusFilter').addEventListener('change', () => { certsPage = 1; loadCertificates(); });

async function loadCertificates() {
  const search = document.getElementById('certSearch').value;
  const status = document.getElementById('certStatusFilter').value;
  const params = new URLSearchParams({ page: certsPage, limit: 20 });
  if (search) params.set('search', search);
  if (status) params.set('status', status);

  const r = await apiFetch(`/certificates?${params}`);
  if (!r || !r.data.success) return;

  const { certificates, pagination } = r.data.data;
  renderCertsTable(certificates);
  renderPagination(pagination, (p) => { certsPage = p; loadCertificates(); });
}

function renderCertsTable(certs) {
  const tbody = document.getElementById('certsTableBody');
  if (!certs.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="loading-cell">No certificates found.</td></tr>';
    return;
  }
  tbody.innerHTML = certs.map(c => `
    <tr>
      <td><code style="font-size:0.75rem">${escHtml(c.cert_id)}</code></td>
      <td>
        <div style="font-weight:600">${escHtml(c.recipient_name)}</div>
        <div style="font-size:0.75rem; color:var(--text-muted)">${escHtml(c.recipient_email)}</div>
      </td>
      <td>${escHtml(c.course_name)}</td>
      <td style="font-size:0.8rem">${escHtml(c.issue_date)}</td>
      <td><span class="badge badge-${escHtml(c.status)}">${escHtml(c.status)}</span></td>
      <td>
        <div class="row-actions">
          <button class="btn btn-sm btn-secondary cert-download-btn" data-id="${Number(c.id)}" data-cert-id="${escHtml(c.cert_id)}">
            <i class="fa fa-download"></i>
          </button>
          <button class="btn btn-sm btn-danger cert-delete-btn" data-id="${Number(c.id)}">
            <i class="fa fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');

  // Attach event listeners after rendering (event delegation alternative)
  tbody.querySelectorAll('.cert-download-btn').forEach(btn => {
    btn.addEventListener('click', () => downloadCert(btn.dataset.id, btn.dataset.certId));
  });
  tbody.querySelectorAll('.cert-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteCert(btn.dataset.id));
  });
}

function renderPagination(pagination, onPage) {
  const container = document.getElementById('certsPagination');
  if (!pagination || pagination.pages <= 1) { container.innerHTML = ''; return; }
  const buttons = [];
  for (let i = 1; i <= pagination.pages; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    if (i === pagination.page) btn.className = 'active';
    btn.addEventListener('click', () => onPage(i));
    buttons.push(btn);
  }
  container.innerHTML = '';
  buttons.forEach(b => container.appendChild(b));
}

// New cert form toggle
document.getElementById('newCertBtn').addEventListener('click', () => {
  const form = document.getElementById('newCertForm');
  form.style.display = form.style.display === 'none' ? 'block' : 'none';
});

document.getElementById('cancelCertBtn').addEventListener('click', () => {
  document.getElementById('newCertForm').style.display = 'none';
  document.getElementById('adminCertForm').reset();
});

document.getElementById('adminCertForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const body = Object.fromEntries(formData.entries());
  Object.keys(body).forEach(k => { if (!body[k]) delete body[k]; });

  const r = await apiFetch('/certificates', { method: 'POST', body: JSON.stringify(body) });
  if (!r) return;
  if (!r.data.success) { showToast(r.data.message || 'Failed', 'error'); return; }

  showToast('Certificate generated!', 'success');
  document.getElementById('newCertForm').style.display = 'none';
  document.getElementById('adminCertForm').reset();
  loadCertificates();
  loadDashboard();
});

async function downloadCert(id, certId) {
  try {
    const res = await fetch(`${API}/certificates/${id}/download`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) throw new Error('Download failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `certificate-${certId}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    showToast('Download failed: ' + err.message, 'error');
  }
}

async function deleteCert(id) {
  if (!confirm('Delete this certificate?')) return;
  const r = await apiFetch(`/certificates/${id}`, { method: 'DELETE' });
  if (!r) return;
  if (r.data.success) { showToast('Certificate deleted', 'success'); loadCertificates(); loadDashboard(); }
  else showToast(r.data.message || 'Failed', 'error');
}

// ─── Batch Upload ─────────────────────────────────────────────────────────
const dropZone = document.getElementById('dropZone');
const batchFile = document.getElementById('batchFile');
const fileNameEl = document.getElementById('fileName');

document.querySelector('.file-drop-zone .link')?.addEventListener('click', () => batchFile.click());
batchFile.addEventListener('change', () => {
  if (batchFile.files[0]) fileNameEl.textContent = batchFile.files[0].name;
});

dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) {
    const dt = new DataTransfer();
    dt.items.add(file);
    batchFile.files = dt.files;
    fileNameEl.textContent = file.name;
  }
});

document.getElementById('batchForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const file = batchFile.files[0];
  if (!file) { showToast('Please select a file', 'warning'); return; }

  const btn = document.getElementById('batchSubmitBtn');
  const progress = document.getElementById('batchProgress');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');

  btn.disabled = true;
  btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Processing...';
  progress.style.display = 'block';
  progressBar.style.width = '30%';
  progressText.textContent = 'Uploading and processing...';

  try {
    const fd = new FormData();
    fd.append('file', file);
    const issuedBy = document.getElementById('batchIssuedBy').value;
    if (issuedBy) fd.append('issued_by', issuedBy);

    progressBar.style.width = '60%';

    const res = await fetch(`${API}/certificates/batch`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: fd,
    });

    progressBar.style.width = '90%';

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.message || 'Batch generation failed');
    }

    const total = res.headers.get('X-Total-Generated') || '?';
    progressBar.style.width = '100%';
    progressText.textContent = `Done! Generated ${total} certificates.`;

    // Auto-download zip
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `certificates-batch-${Date.now()}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(`Generated ${total} certificates!`, 'success');
    batchFile.value = '';
    fileNameEl.textContent = 'No file selected';
    loadDashboard();
  } catch (err) {
    showToast(err.message, 'error');
    progress.style.display = 'none';
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa fa-cogs"></i> Generate All Certificates';
  }
});

// ─── Templates ────────────────────────────────────────────────────────────
async function loadTemplates() {
  const r = await apiFetch('/templates');
  if (!r || !r.data.success) return;

  const grid = document.getElementById('templatesGrid');
  const templates = r.data.data;

  if (!templates.length) {
    grid.innerHTML = '<div class="loading-state">No templates found.</div>';
    return;
  }

  grid.innerHTML = templates.map(t => `
    <div class="template-card">
      <h4>${escHtml(t.name)}</h4>
      <p>${escHtml(t.description || 'No description')}</p>
      <div class="template-colors">
        <div class="color-swatch" style="background:${escHtml(t.config?.primaryColor || '#1a237e')}" title="Primary"></div>
        <div class="color-swatch" style="background:${escHtml(t.config?.accentColor || '#c62828')}" title="Accent"></div>
      </div>
      <div class="template-actions">
        <span class="badge ${t.is_active ? 'badge-active' : 'badge-revoked'}">${t.is_active ? 'Active' : 'Inactive'}</span>
        <button class="btn btn-sm btn-danger template-delete-btn" data-id="${Number(t.id)}">
          <i class="fa fa-trash"></i>
        </button>
      </div>
    </div>
  `).join('');

  // Attach event listeners after rendering
  grid.querySelectorAll('.template-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteTemplate(btn.dataset.id));
  });
}

async function deleteTemplate(id) {
  if (!confirm('Delete this template?')) return;
  const r = await apiFetch(`/templates/${id}`, { method: 'DELETE' });
  if (!r) return;
  if (r.data.success) { showToast('Template deleted', 'success'); loadTemplates(); }
  else showToast(r.data.message || 'Failed', 'error');
}

async function loadTemplatesForForm() {
  const r = await apiFetch('/templates');
  if (!r || !r.data.success) return;
  const select = document.getElementById('adminTemplateSelect');
  r.data.data.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = t.name;
    select.appendChild(opt);
  });
}

// ─── Users ────────────────────────────────────────────────────────────────
async function loadUsers() {
  const r = await apiFetch('/users');
  if (!r || !r.data.success) return;

  const tbody = document.getElementById('usersTableBody');
  const users = r.data.data;

  if (!users.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="loading-cell">No users found.</td></tr>';
    return;
  }

  tbody.innerHTML = users.map(u => `
    <tr>
      <td style="font-weight:600">${escHtml(u.username)}</td>
      <td>${escHtml(u.email)}</td>
      <td><span class="badge badge-${escHtml(u.role)}">${escHtml(u.role)}</span></td>
      <td><span class="badge ${u.is_active ? 'badge-active' : 'badge-revoked'}">${u.is_active ? 'Active' : 'Inactive'}</span></td>
      <td style="font-size:0.8rem">${u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}</td>
      <td>
        <button class="btn btn-sm btn-danger user-delete-btn" data-id="${Number(u.id)}" ${u.id === (currentUser?.id) ? 'disabled' : ''}>
          <i class="fa fa-trash"></i>
        </button>
      </td>
    </tr>
  `).join('');

  // Attach event listeners after rendering
  tbody.querySelectorAll('.user-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteUser(btn.dataset.id));
  });
}

async function deleteUser(id) {
  if (!confirm('Delete this user?')) return;
  const r = await apiFetch(`/users/${id}`, { method: 'DELETE' });
  if (!r) return;
  if (r.data.success) { showToast('User deleted', 'success'); loadUsers(); }
  else showToast(r.data.message || 'Failed', 'error');
}

// ─── Email Logs ────────────────────────────────────────────────────────────
async function loadEmailLogs() {
  const r = await apiFetch('/email/logs');
  if (!r || !r.data.success) return;

  const tbody = document.getElementById('emailLogsBody');
  const logs = r.data.data;

  if (!logs.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="loading-cell">No email logs yet.</td></tr>';
    return;
  }

  tbody.innerHTML = logs.map(l => `
    <tr>
      <td>${l.id}</td>
      <td>${escHtml(l.recipient_email)}</td>
      <td><span class="badge badge-${l.status}">${l.status}</span></td>
      <td style="font-size:0.8rem">${l.sent_at ? new Date(l.sent_at).toLocaleString() : '—'}</td>
      <td style="font-size:0.75rem; color:var(--danger)">${l.error_msg ? escHtml(l.error_msg) : '—'}</td>
    </tr>
  `).join('');
}

// ─── Utility ────────────────────────────────────────────────────────────────
function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── Init ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('falconsec_token');
  if (token) {
    const user = JSON.parse(localStorage.getItem('falconsec_user') || '{}');
    authToken = token;
    currentUser = user;
    showApp();
  }
});
