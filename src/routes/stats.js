const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const CertificateModel = require('../models/Certificate');
const User = require('../models/User');
const { getDb } = require('../database/db');

router.use(authenticate);

router.get('/dashboard', (req, res, next) => {
  try {
    const certStats = CertificateModel.getStats();
    const db = getDb();
    const emailSent = db.prepare("SELECT COUNT(*) as count FROM email_logs WHERE status = 'sent'").get();
    const emailPending = db.prepare("SELECT COUNT(*) as count FROM email_logs WHERE status = 'pending'").get();
    const users = User.findAll();

    res.json({
      success: true,
      data: {
        certificates: certStats,
        emails: { sent: emailSent.count, pending: emailPending.count },
        users: { total: users.length, active: users.filter(u => u.is_active).length },
      },
    });
  } catch (err) { next(err); }
});

module.exports = router;
