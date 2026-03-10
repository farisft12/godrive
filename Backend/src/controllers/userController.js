const User = require('../models/User');
const Activity = require('../models/Activity');
const bcrypt = require('bcrypt');
const { pool } = require('../config/database');

const SALT_ROUNDS = 12;

async function getProfile(req, res, next) {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { password, ...rest } = user;
    res.json({
      ...rest,
      storage_quota: Number(user.storage_quota),
      storage_used: Number(user.storage_used),
      phone: user.phone ?? '',
      role: user.role || 'user',
    });
  } catch (err) {
    next(err);
  }
}

async function getActivity(req, res, next) {
  try {
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 100);
    const activities = await Activity.findByUser(req.userId, limit);
    res.json({ activities });
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const { name, email, phone } = req.body || {};
    if (email !== undefined) {
      const existing = await User.findByEmail(email);
      if (existing && existing.id !== req.userId) {
        return res.status(409).json({ error: 'Email already in use' });
      }
    }
    const updated = await User.updateProfile(req.userId, { name, email, phone });
    if (!updated) return res.status(404).json({ error: 'User not found' });
    res.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      phone: updated.phone ?? '',
      storage_quota: Number(updated.storage_quota),
      storage_used: Number(updated.storage_used),
      created_at: updated.created_at,
      updated_at: updated.updated_at,
      role: updated.role || 'user',
    });
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const { current_password, new_password } = req.body || {};
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'current_password and new_password required' });
    }
    if (String(new_password).length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }
    const user = await User.findByIdWithPassword(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const valid = await bcrypt.compare(String(current_password), user.password);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });
    const hash = await bcrypt.hash(String(new_password), SALT_ROUNDS);
    await pool.query('UPDATE users SET password = $2 WHERE id = $1', [req.userId, hash]);
    res.json({ message: 'Password updated' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getProfile, getActivity, updateProfile, changePassword };
