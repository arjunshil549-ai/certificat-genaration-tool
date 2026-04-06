const express = require('express');
const router = express.Router();
const { login, register, getProfile, changePassword, logout } = require('../controllers/authController');
const { authenticate, requireRole } = require('../middleware/auth');

router.post('/login', login);
router.post('/register', authenticate, requireRole('admin'), register);
router.get('/profile', authenticate, getProfile);
router.post('/change-password', authenticate, changePassword);
router.post('/logout', authenticate, logout);

module.exports = router;
