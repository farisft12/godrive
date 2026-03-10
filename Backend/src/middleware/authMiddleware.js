const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET;

function ensureSecret() {
  if (!JWT_SECRET || String(JWT_SECRET).trim() === '') {
    const err = new Error('JWT_SECRET is not set. Set it in .env before running in production.');
    err.code = 'JWT_SECRET_MISSING';
    throw err;
  }
}

function signToken(payload, expiresIn = '7d') {
  ensureSecret();
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

function verifyToken(token) {
  ensureSecret();
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const user = await User.findById(decoded.userId);
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  if (user.role === 'suspended') {
    return res.status(403).json({ error: 'Account suspended' });
  }

  req.user = user;
  req.userId = user.id;
  next();
}

module.exports = {
  signToken,
  verifyToken,
  authMiddleware,
  JWT_SECRET,
};
