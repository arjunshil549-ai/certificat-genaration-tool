const fs = require('fs');
const { parse } = require('csv-parse/sync');
const ExcelJS = require('exceljs');
const archiver = require('archiver');
const { generateCertificate } = require('./pdfService');
const { generateQR } = require('./qrService');
const CertificateModel = require('../models/Certificate');
const TemplateModel = require('../models/Template');
const { generateCertId, formatDate } = require('../utils/helpers');
const logger = require('../utils/logger');
const config = require('../config/config');

function processCSV(filePath) {
  // filePath is validated by the caller before being passed here
  const content = fs.readFileSync(filePath, { encoding: 'utf8', flag: 'r' });
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
  return normalizeRecords(records);
}

async function processExcel(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];

  const records = [];
  let headers = [];

  worksheet.eachRow((row, rowNumber) => {
    const values = row.values.slice(1); // ExcelJS rows are 1-indexed; index 0 is undefined
    if (rowNumber === 1) {
      headers = values.map(v => (v ? String(v).trim() : ''));
    } else {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = values[i] !== undefined ? String(values[i]).trim() : ''; });
      records.push(obj);
    }
  });

  return normalizeRecords(records);
}

function normalizeRecords(records) {
  return records.map(r => ({
    recipient_name: r.name || r.recipientName || r.recipient_name || r['Recipient Name'] || '',
    recipient_email: r.email || r.recipientEmail || r.recipient_email || r['Email'] || '',
    course_name: r.course || r.courseName || r.course_name || r['Course Name'] || '',
    issued_by: r.issuedBy || r.issued_by || r['Issued By'] || 'FalconSec Intelligence',
    issue_date: r.issueDate || r.issue_date || r['Issue Date'] || new Date().toISOString().split('T')[0],
  }));
}

function validateBatch(data) {
  const valid = [];
  const errors = [];
  data.forEach((row, index) => {
    const rowErrors = [];
    if (!row.recipient_name) rowErrors.push('Missing recipient name');
    if (!row.recipient_email || !/\S+@\S+\.\S+/.test(row.recipient_email)) rowErrors.push('Invalid email');
    if (!row.course_name) rowErrors.push('Missing course name');
    if (rowErrors.length > 0) {
      errors.push({ row: index + 1, data: row, errors: rowErrors });
    } else {
      valid.push(row);
    }
  });
  return { valid, errors };
}

async function generateBatch(data, templateId, issuedBy, createdBy) {
  const maxBatch = config.maxBatchSize || 1000;
  if (data.length > maxBatch) throw new Error(`Batch size exceeds maximum of ${maxBatch}`);

  const template = templateId
    ? TemplateModel.findById(templateId)
    : (TemplateModel.findActive()[0] || null);

  const results = [];

  for (const row of data) {
    try {
      const certId = generateCertId();
      const issueDate = row.issue_date || new Date().toISOString().split('T')[0];
      const verifyUrl = `${config.appUrl}/api/certificates/verify/${certId}`;
      const qrCode = await generateQR(verifyUrl);

      const certData = {
        cert_id: certId,
        recipient_name: row.recipient_name,
        recipient_email: row.recipient_email,
        course_name: row.course_name,
        issue_date: issueDate,
        issue_date_formatted: formatDate(issueDate),
        expiry_date: null,
        issued_by: row.issued_by || issuedBy || 'FalconSec Intelligence',
        template_id: template ? template.id : null,
        pdf_path: null,
        qr_code: qrCode,
        status: 'active',
        created_by: createdBy || null,
      };

      const pdfBuffer = await generateCertificate(certData, template);
      const cert = CertificateModel.create(certData);
      results.push({ cert, pdfBuffer });
    } catch (err) {
      logger.error(`Batch cert error for ${row.recipient_email}: ${err.message}`);
      results.push({ error: err.message, row });
    }
  }

  return results;
}

function createZipArchive(items) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.on('data', chunk => chunks.push(chunk));
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', reject);

    items.forEach(({ cert, pdfBuffer }) => {
      if (cert && pdfBuffer) {
        archive.append(pdfBuffer, { name: `${cert.cert_id}.pdf` });
      }
    });

    archive.finalize();
  });
}

module.exports = { processCSV, processExcel, validateBatch, generateBatch, createZipArchive };
