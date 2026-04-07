const express = require('express');
const router = express.Router();
const {
  createTemplate, getTemplates, getTemplate, updateTemplate, deleteTemplate,
} = require('../controllers/templateController');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);

router.get('/', getTemplates);
router.get('/:id', getTemplate);
router.post('/', requireRole(['admin', 'manager']), createTemplate);
router.put('/:id', requireRole(['admin', 'manager']), updateTemplate);
router.delete('/:id', requireRole('admin'), deleteTemplate);

module.exports = router;
