/* FalconSec Certificate Platform – Public Page JS */
const API = '/api';
let lastGeneratedCert = null;
let lastPdfDownloadId = null;

// ─── HTML Escaping (XSS prevention) ──────────────────────────────────────
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// ─── Toast Notifications ───────────────────────────────────────────────────
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  const icons = { success: 'check-circle', error: 'times-circle', info: 'info-circle', warning: 'exclamation-circle' };
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<i class="fa fa-${icons[type] || 'info-circle'}"></i> ${escHtml(message)}`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => toast.remove(), 300); }, 4000);
}

// ─── Live Preview ──────────────────────────────────────────────────────────
function updatePreview() {
  const name = document.getElementById('recipientName').value || 'Your Name Here';
  const course = document.getElementById('courseName').value || 'Course Name';
  const previewName = document.getElementById('previewName');
  const previewCourse = document.getElementById('previewCourse');
  if (previewName) previewName.textContent = name;
  if (previewCourse) previewCourse.textContent = course;
}

// ─── Load Templates ────────────────────────────────────────────────────────
async function loadTemplates() {
  try {
    const token = localStorage.getItem('falconsec_token');
    if (!token) return;
    const res = await fetch(`${API}/templates`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return;
    const { data } = await res.json();
    const select = document.getElementById('templateSelect');
    if (select && data) {
      data.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = t.name;
        select.appendChild(opt);
      });
    }
  } catch (e) { /* silently fail for unauthenticated users */ }
}

// ─── Generate Certificate ──────────────────────────────────────────────────
document.getElementById('certForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('generateBtn');
  const downloadBtn = document.getElementById('downloadBtn');

  const formData = new FormData(e.target);
  const body = Object.fromEntries(formData.entries());

  // Clean empty fields
  Object.keys(body).forEach(k => { if (!body[k]) delete body[k]; });

  btn.disabled = true;
  btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Generating...';

  try {
    const token = localStorage.getItem('falconsec_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API}/certificates`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Failed to generate certificate');
    }

    lastGeneratedCert = data.data;
    lastPdfDownloadId = data.data.id;

    showToast('Certificate generated successfully!', 'success');
    showSuccessModal(data.data);
    downloadBtn.style.display = 'flex';

  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa fa-file-pdf"></i> Generate Certificate';
  }
});

// ─── Show Success Modal ────────────────────────────────────────────────────
function showSuccessModal(cert) {
  const modal = document.getElementById('successModal');
  const body = document.getElementById('modalBody');
  body.innerHTML = `
    <div style="text-align:center; padding:1rem 0">
      <p style="font-size:1.1rem; font-weight:600; color:#2d3748; margin-bottom:1rem">${escHtml(cert.recipient_name)}</p>
      <p style="color:#718096; margin-bottom:0.5rem">${escHtml(cert.course_name)}</p>
      <p style="font-size:0.8rem; color:#a0aec0; font-family:monospace">${escHtml(cert.cert_id)}</p>
    </div>
    <div style="background:#f5f6fa; border-radius:8px; padding:1rem; font-size:0.85rem">
      <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem">
        <span style="color:#718096">Status</span>
        <span class="badge badge-active">Active</span>
      </div>
      <div style="display:flex; justify-content:space-between">
        <span style="color:#718096">Certificate ID</span>
        <code style="font-size:0.8rem">${escHtml(cert.cert_id)}</code>
      </div>
    </div>
  `;

  document.getElementById('modalDownloadBtn').onclick = () => downloadPdf(cert.id, cert.cert_id);
  modal.style.display = 'flex';
}

// ─── Download PDF ──────────────────────────────────────────────────────────
async function downloadPdf(id, certId) {
  try {
    const token = localStorage.getItem('falconsec_token');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API}/certificates/${id}/download`, { headers });
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
    showToast('Failed to download PDF: ' + err.message, 'error');
  }
}

document.getElementById('downloadBtn').addEventListener('click', () => {
  if (lastGeneratedCert) downloadPdf(lastGeneratedCert.id, lastGeneratedCert.cert_id);
});

// ─── Verify Certificate ────────────────────────────────────────────────────
document.getElementById('verifyForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const certId = document.getElementById('certIdInput').value.trim();
  const resultDiv = document.getElementById('verifyResult');

  if (!certId) { showToast('Please enter a Certificate ID', 'warning'); return; }

  resultDiv.style.display = 'none';
  resultDiv.className = 'verify-result';

  try {
    const res = await fetch(`${API}/certificates/verify/${encodeURIComponent(certId)}`);
    const data = await res.json();

    if (res.status === 404 || !data.success) {
      resultDiv.className = 'verify-result invalid';
      resultDiv.innerHTML = `
        <h3><i class="fa fa-times-circle"></i> Certificate Not Found</h3>
        <p>No certificate found with ID: <strong>${escHtml(certId)}</strong></p>
      `;
    } else {
      const cert = data.data;
      const isValid = cert.is_valid;
      resultDiv.className = `verify-result ${isValid ? 'valid' : 'invalid'}`;
      resultDiv.innerHTML = `
        <h3><i class="fa fa-${isValid ? 'check-circle' : 'exclamation-circle'}"></i>
          ${isValid ? 'Valid Certificate' : `Certificate ${escHtml(cert.status)}`}
        </h3>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; margin-top:1rem; font-size:0.9rem">
          <div><strong>Recipient:</strong><br/>${escHtml(cert.recipient_name)}</div>
          <div><strong>Course:</strong><br/>${escHtml(cert.course_name)}</div>
          <div><strong>Issue Date:</strong><br/>${escHtml(cert.issue_date)}</div>
          <div><strong>Issued By:</strong><br/>${escHtml(cert.issued_by || 'FalconSec Intelligence')}</div>
        </div>
      `;
    }
    resultDiv.style.display = 'block';
  } catch (err) {
    showToast('Verification failed: ' + err.message, 'error');
  }
});

// ─── Init ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Set today as default date
  const dateInput = document.getElementById('issueDate');
  if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

  // Live preview
  document.getElementById('recipientName').addEventListener('input', updatePreview);
  document.getElementById('courseName').addEventListener('input', updatePreview);

  // Load templates if authenticated
  loadTemplates();

  // Check URL for cert ID to verify
  const urlParams = new URLSearchParams(window.location.search);
  const verifyCertId = urlParams.get('verify') || window.location.pathname.match(/\/verify\/(.+)/)?.[1];
  if (verifyCertId) {
    document.getElementById('certIdInput').value = verifyCertId;
    document.getElementById('verify').scrollIntoView({ behavior: 'smooth' });
    document.getElementById('verifyForm').dispatchEvent(new Event('submit'));
  }
});
