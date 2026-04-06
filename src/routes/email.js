const express = require('express');
const router = express.Router();
const { sendEmail, bulkSendEmail, getEmailLogs } = require('../controllers/emailController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.post('/send/:certId', sendEmail);
router.post('/bulk-send', bulkSendEmail);
router.get('/logs', getEmailLogs);

module.exports = router;
