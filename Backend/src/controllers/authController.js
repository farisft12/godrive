const authService = require('../services/authService');

async function register(req, res, next) {
  try {
    const { name, email, password, storage_quota, phone } = req.body;
    const result = await authService.register({
      name,
      email,
      password,
      storageQuota: storage_quota,
      phone,
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = await authService.me(req.userId);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

async function sendVerification(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    const result = await authService.sendVerification(email);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function verify(req, res, next) {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'Email and code required' });
    const result = await authService.verifyEmail(email, code);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, me, sendVerification, verify, logout };
