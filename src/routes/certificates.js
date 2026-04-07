const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ctrl = require('../controllers/certificateController');
const { authenticate } = require('../middleware/auth');

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.csv', '.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only CSV and Excel files are allowed'));
  },
});

// Public route - no auth required
router.get('/verify/:certId', ctrl.verifyCertificate);

// All other routes require authentication
router.use(authenticate);

router.post('/', ctrl.generateCertificate);
router.post('/batch', upload.single('file'), ctrl.batchGenerate);
router.get('/', ctrl.getAllCertificates);
router.get('/stats', ctrl.getStats);
router.get('/:id', ctrl.getCertificate);
router.get('/:id/download', ctrl.downloadCertificate);
router.delete('/:id', ctrl.deleteCertificate);

module.exports = router;
