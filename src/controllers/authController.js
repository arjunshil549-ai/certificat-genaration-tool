const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/config');
const { getDb } = require('../database/db');
const logger = require('../utils/logger');

const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password required' });
    }

    const user = User.findByUsername(username);
    if (!user || !user.is_active) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    User.updateLastLogin(user.id);

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    try {
      getDb().prepare(
        "INSERT INTO activity_logs (user_id, action, details, ip_address) VALUES (?, 'login', 'User logged in', ?)"
      ).run(user.id, req.ip);
    } catch (e) {
      // Non-critical
    }

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: { id: user.id, username: user.username, email: user.email, role: user.role },
      },
    });
  } catch (err) {
    next(err);
  }
};

const register = async (req, res, next) => {
  try {
    const { username, email, password, role } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'Username, email and password required' });
    }

    const existingUser = User.findByUsername(username) || User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Username or email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = User.create({ username, email, password_hash: passwordHash, role: role || 'user' });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { id: user.id, username: user.username, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const user = User.findById(req.user.id);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new password required' });
    }

    const user = User.findByUsername(req.user.username);
    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    User.update(req.user.id, { password_hash: newHash });

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
};

const logout = (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
};

module.exports = { login, register, getProfile, changePassword, logout };
