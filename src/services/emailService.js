const nodemailer = require('nodemailer');
const config = require('../config/config');
const { getDb } = require('../database/db');
const logger = require('../utils/logger');

function createTransporter() {
  if (!config.email.user || !config.email.pass) {
    return null;
  }
  return nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.secure,
    auth: { user: config.email.user, pass: config.email.pass },
  });
}

async function sendCertificateEmail(certData, pdfBuffer) {
  const transporter = createTransporter();
  if (!transporter) {
    logger.warn('Email not configured, skipping email send');
    return { success: false, message: 'Email not configured' };
  }

  const maxAttempts = 3;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:#1a237e;padding:20px;text-align:center;">
            <h1 style="color:#fff;margin:0;">FalconSec Intelligence</h1>
          </div>
          <div style="padding:30px;background:#f9f9f9;">
            <h2 style="color:#1a237e;">Your Certificate is Ready!</h2>
            <p>Dear <strong>${certData.recipient_name}</strong>,</p>
            <p>Congratulations on completing <strong>${certData.course_name}</strong>!</p>
            <p>Your certificate is attached to this email.</p>
            <p>Certificate ID: <strong>${certData.cert_id}</strong></p>
            <p>Verify at: <a href="${config.appUrl}/api/certificates/verify/${certData.cert_id}">
              ${config.appUrl}/api/certificates/verify/${certData.cert_id}
            </a></p>
          </div>
          <div style="background:#c62828;padding:10px;text-align:center;">
            <p style="color:#fff;margin:0;font-size:12px;">© FalconSec Intelligence</p>
          </div>
        </div>
      `;

      await transporter.sendMail({
        from: config.email.from,
        to: certData.recipient_email,
        subject: `Your FalconSec Certificate - ${certData.course_name}`,
        html,
        attachments: [{
          filename: `certificate-${certData.cert_id}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        }],
      });

      logEmailResult(certData.id, certData.recipient_email, 'sent');
      return { success: true, message: 'Email sent successfully' };
    } catch (err) {
      lastError = err;
      logger.warn(`Email attempt ${attempt} failed: ${err.message}`);
      if (attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    }
  }

  logEmailResult(certData.id, certData.recipient_email, 'failed', lastError.message);
  return { success: false, message: lastError.message };
}

function logEmailResult(certId, email, status, errorMsg = null) {
  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO email_logs (certificate_id, recipient_email, status, sent_at, error_msg)
      VALUES (?, ?, ?, datetime('now'), ?)
    `).run(certId, email, status, errorMsg);
  } catch (e) {
    logger.error('Failed to log email result:', e);
  }
}

module.exports = { sendCertificateEmail };
