const CertificateModel = require('../models/Certificate');
const TemplateModel = require('../models/Template');
const { generateCertificate } = require('../services/pdfService');
const { generateQR } = require('../services/qrService');
const { processCSV, processExcel, validateBatch, generateBatch, createZipArchive } = require('../services/batchService');
const { generateCertId, formatDate, paginate } = require('../utils/helpers');
const config = require('../config/config');
const logger = require('../utils/logger');
const fs = require('fs');

const generateCertificateHandler = async (req, res, next) => {
  try {
    const { recipient_name, recipient_email, course_name, issue_date, expiry_date, issued_by, template_id } = req.body;

    if (!recipient_name || !recipient_email || !course_name) {
      return res.status(400).json({
        success: false,
        message: 'recipient_name, recipient_email, and course_name are required',
      });
    }

    const certId = generateCertId();
    const issueDate = issue_date || new Date().toISOString().split('T')[0];
    const verifyUrl = `${config.appUrl}/api/certificates/verify/${certId}`;
    const qrCode = await generateQR(verifyUrl);

    const template = template_id
      ? TemplateModel.findById(template_id)
      : (TemplateModel.findActive()[0] || null);

    const certData = {
      cert_id: certId,
      recipient_name,
      recipient_email,
      course_name,
      issue_date: issueDate,
      issue_date_formatted: formatDate(issueDate),
      expiry_date: expiry_date || null,
      issued_by: issued_by || 'FalconSec Intelligence',
      template_id: template ? template.id : null,
      pdf_path: null,
      qr_code: qrCode,
      status: 'active',
      created_by: req.user ? req.user.id : null,
    };

    const pdfBuffer = await generateCertificate(certData, template);
    const cert = CertificateModel.create(certData);

    if (req.query.download === 'true') {
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="certificate-${certId}.pdf"`,
        'Content-Length': pdfBuffer.length,
      });
      return res.send(pdfBuffer);
    }

    res.json({
      success: true,
      message: 'Certificate generated successfully',
      data: { ...cert, pdf_available: true },
    });
  } catch (err) {
    next(err);
  }
};

const batchGenerate = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const { template_id, issued_by } = req.body;
    const filePath = req.file.path;
    const originalname = req.file.originalname.toLowerCase();
    const mimetype = req.file.mimetype;

    // Validate that the file path is within the uploads directory (path injection prevention)
    const uploadDir = path.resolve(process.cwd(), 'uploads');
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(uploadDir + path.sep) && resolvedPath !== uploadDir) {
      try { fs.unlinkSync(filePath); } catch (e) { /* ignore */ }
      return res.status(400).json({ success: false, message: 'Invalid file path' });
    }

    let records;
    if (originalname.endsWith('.csv') || mimetype === 'text/csv') {
      records = processCSV(filePath);
    } else if (
      originalname.endsWith('.xlsx') || originalname.endsWith('.xls') ||
      mimetype.includes('excel') || mimetype.includes('spreadsheet')
    ) {
      records = await processExcel(filePath);
    } else {
      return res.status(400).json({ success: false, message: 'Unsupported file format. Use CSV or Excel.' });
    }

    const { valid, errors } = validateBatch(records);
    if (valid.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid records found', data: { errors } });
    }

    const results = await generateBatch(valid, template_id, issued_by, req.user ? req.user.id : null);
    const successful = results.filter(r => r.cert);

    try { fs.unlinkSync(filePath); } catch (e) { /* ignore */ }

    if (successful.length === 0) {
      return res.status(500).json({ success: false, message: 'Failed to generate any certificates' });
    }

    const zipBuffer = await createZipArchive(successful);

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="certificates-batch-${Date.now()}.zip"`,
      'Content-Length': zipBuffer.length,
      'X-Total-Generated': successful.length,
      'X-Total-Errors': errors.length + (results.length - successful.length),
    });
    res.send(zipBuffer);
  } catch (err) {
    next(err);
  }
};

const getCertificate = async (req, res, next) => {
  try {
    const cert = CertificateModel.findById(req.params.id);
    if (!cert) return res.status(404).json({ success: false, message: 'Certificate not found' });
    res.json({ success: true, data: cert });
  } catch (err) {
    next(err);
  }
};

const getAllCertificates = async (req, res, next) => {
  try {
    const { page, limit, status, course_name, recipient_email, search } = req.query;
    const { page: p, limit: l, offset } = paginate(page, limit);

    let certs;
    let total;
    if (search) {
      certs = CertificateModel.search(search, { status });
      total = certs.length;
    } else {
      const filters = {};
      if (status) filters.status = status;
      if (course_name) filters.course_name = course_name;
      if (recipient_email) filters.recipient_email = recipient_email;
      certs = CertificateModel.findAll(filters, { limit: l, offset });
      total = CertificateModel.count(filters);
    }

    res.json({
      success: true,
      data: {
        certificates: certs,
        pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
      },
    });
  } catch (err) {
    next(err);
  }
};

const verifyCertificate = async (req, res, next) => {
  try {
    const cert = CertificateModel.findByCertId(req.params.certId);
    if (!cert) {
      return res.status(404).json({ success: false, message: 'Certificate not found' });
    }
    res.json({
      success: true,
      message: cert.status === 'active' ? 'Certificate is valid' : `Certificate is ${cert.status}`,
      data: {
        cert_id: cert.cert_id,
        recipient_name: cert.recipient_name,
        course_name: cert.course_name,
        issue_date: cert.issue_date,
        issued_by: cert.issued_by,
        status: cert.status,
        is_valid: cert.status === 'active',
      },
    });
  } catch (err) {
    next(err);
  }
};

const downloadCertificate = async (req, res, next) => {
  try {
    const cert = CertificateModel.findById(req.params.id);
    if (!cert) return res.status(404).json({ success: false, message: 'Certificate not found' });

    const template = cert.template_id ? TemplateModel.findById(cert.template_id) : null;
    const certData = { ...cert, issue_date_formatted: formatDate(cert.issue_date) };
    const pdfBuffer = await generateCertificate(certData, template);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="certificate-${cert.cert_id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
};

const deleteCertificate = async (req, res, next) => {
  try {
    const cert = CertificateModel.findById(req.params.id);
    if (!cert) return res.status(404).json({ success: false, message: 'Certificate not found' });
    CertificateModel.delete(req.params.id);
    res.json({ success: true, message: 'Certificate deleted' });
  } catch (err) {
    next(err);
  }
};

const getStats = async (req, res, next) => {
  try {
    const stats = CertificateModel.getStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  generateCertificate: generateCertificateHandler,
  batchGenerate,
  getCertificate,
  getAllCertificates,
  verifyCertificate,
  downloadCertificate,
  deleteCertificate,
  getStats,
};
