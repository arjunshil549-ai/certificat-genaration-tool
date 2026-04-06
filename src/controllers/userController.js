const bcrypt = require('bcryptjs');
const User = require('../models/User');

const getUsers = async (req, res, next) => {
  try {
    const users = User.findAll(req.query);
    res.json({ success: true, data: users });
  } catch (err) { next(err); }
};

const getUser = async (req, res, next) => {
  try {
    const user = User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
};

const createUser = async (req, res, next) => {
  try {
    const { username, email, password, role } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'username, email, and password required' });
    }
    const existing = User.findByUsername(username) || User.findByEmail(email);
    if (existing) return res.status(409).json({ success: false, message: 'User already exists' });
    const password_hash = await bcrypt.hash(password, 10);
    const user = User.create({ username, email, password_hash, role: role || 'user' });
    res.status(201).json({ success: true, data: user });
  } catch (err) { next(err); }
};

const updateUser = async (req, res, next) => {
  try {
    const user = User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const { password, ...rest } = req.body;
    if (password) rest.password_hash = await bcrypt.hash(password, 10);
    const updated = User.update(req.params.id, rest);
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
};

const deleteUser = async (req, res, next) => {
  try {
    const user = User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (req.user.id === parseInt(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Cannot delete yourself' });
    }
    User.delete(req.params.id);
    res.json({ success: true, message: 'User deleted' });
  } catch (err) { next(err); }
};

module.exports = { getUsers, getUser, createUser, updateUser, deleteUser };
