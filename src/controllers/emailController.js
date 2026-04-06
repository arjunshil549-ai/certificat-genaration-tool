const CertificateModel = require('../models/Certificate');
const TemplateModel = require('../models/Template');
const { sendCertificateEmail } = require('../services/emailService');
const { generateCertificate } = require('../services/pdfService');
const { formatDate } = require('../utils/helpers');
const { getDb } = require('../database/db');
const logger = require('../utils/logger');

const sendEmail = async (req, res, next) => {
  try {
    const cert = CertificateModel.findByCertId(req.params.certId);
    if (!cert) return res.status(404).json({ success: false, message: 'Certificate not found' });

    const template = cert.template_id ? TemplateModel.findById(cert.template_id) : null;
    const certData = { ...cert, issue_date_formatted: formatDate(cert.issue_date) };
    const pdfBuffer = await generateCertificate(certData, template);
    const result = await sendCertificateEmail(certData, pdfBuffer);

    res.json({ success: result.success, message: result.message });
  } catch (err) { next(err); }
};

const bulkSendEmail = async (req, res, next) => {
  try {
    const { cert_ids } = req.body;
    if (!cert_ids || !Array.isArray(cert_ids)) {
      return res.status(400).json({ success: false, message: 'cert_ids array required' });
    }

    const results = [];
    for (const certId of cert_ids) {
      const cert = CertificateModel.findByCertId(certId);
      if (!cert) { results.push({ certId, success: false, message: 'Not found' }); continue; }
      const template = cert.template_id ? TemplateModel.findById(cert.template_id) : null;
      const certData = { ...cert, issue_date_formatted: formatDate(cert.issue_date) };
      const pdfBuffer = await generateCertificate(certData, template);
      const result = await sendCertificateEmail(certData, pdfBuffer);
      results.push({ certId, ...result });
    }

    res.json({ success: true, data: results });
  } catch (err) { next(err); }
};

const getEmailLogs = async (req, res, next) => {
  try {
    const db = getDb();
    const logs = db.prepare('SELECT * FROM email_logs ORDER BY sent_at DESC LIMIT 100').all();
    res.json({ success: true, data: logs });
  } catch (err) { next(err); }
};

module.exports = { sendEmail, bulkSendEmail, getEmailLogs };
