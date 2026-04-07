const crypto = require('crypto');

function generateCertId() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `CERT-${year}${month}-${random}`;
}

function generateSerialNumber() {
  return crypto.randomBytes(8).toString('hex').toUpperCase();
}

function formatDate(date) {
  const parts = String(date).split('T')[0].split('-');
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1;
  const day = parseInt(parts[2]);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${months[month]} ${String(day).padStart(2, '0')}, ${year}`;
}

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
}

function paginate(page = 1, limit = 20) {
  const p = Math.max(1, parseInt(page));
  const l = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (p - 1) * l;
  return { page: p, limit: l, offset };
}

module.exports = { generateCertId, generateSerialNumber, formatDate, sanitizeFilename, paginate };
