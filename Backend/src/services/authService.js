const bcrypt = require('bcrypt');
const User = require('../models/User');
const Activity = require('../models/Activity');
const { signToken } = require('../middleware/authMiddleware');
const fonnteService = require('./fonnteService');

const SALT_ROUNDS = 12;
const CODE_EXPIRY_MINUTES = 10;

function generateVerificationCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendVerificationToUser(user, code) {
  const message = `Kode verifikasi GoDrive Anda: ${code}. Berlaku ${CODE_EXPIRY_MINUTES} menit. Jangan bagikan kode ini.`;
  if (user.phone && fonnteService.isConfigured()) {
    await fonnteService.sendMessage(user.phone, message);
  }
  // TODO: optional email send via nodemailer/sendgrid
}

async function register({ name, email, password, storageQuota, phone }) {
  const existing = await User.findByEmail(email);
  if (existing) {
    const err = new Error('Email already registered');
    err.statusCode = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({
    name,
    email,
    passwordHash,
    storageQuota: storageQuota || 1073741824,
    phone: phone || null,
  });

  const code = generateVerificationCode();
  const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);
  await User.setVerificationCode(user.id, code, expiresAt);
  await sendVerificationToUser({ ...user, phone: phone || null }, code);

  await Activity.log({
    userId: user.id,
    action: 'register',
    resourceType: 'user',
    resourceId: user.id,
    details: { email: user.email },
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      storage_quota: Number(user.storage_quota),
      storage_used: Number(user.storage_used),
      created_at: user.created_at,
      role: user.role || 'user',
    },
    requiresVerification: true,
  };
}

async function sendVerification(email) {
  const user = await User.findByEmailForVerification(email);
  if (!user) {
    const err = new Error('Email not found');
    err.statusCode = 404;
    throw err;
  }
  if (user.email_verified_at) {
    return { message: 'Already verified' };
  }
  const code = generateVerificationCode();
  const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);
  await User.setVerificationCode(user.id, code, expiresAt);
  await sendVerificationToUser(user, code);
  return { message: 'Verification code sent' };
}

async function verifyEmail(email, code) {
  const user = await User.findByEmailForVerification(email);
  if (!user) {
    const err = new Error('Email not found');
    err.statusCode = 404;
    throw err;
  }
  const updated = await User.verifyAndClearCode(user.id, code);
  if (!updated) {
    const err = new Error('Invalid or expired verification code');
    err.statusCode = 400;
    throw err;
  }
  return { message: 'Email verified successfully' };
}

async function login(email, password) {
  const userByEmail = await User.findByEmail(email);
  if (!userByEmail) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  const fullUser = await User.findByIdWithPassword(userByEmail.id);
  if (!fullUser) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }
  const valid = await bcrypt.compare(password, fullUser.password);
  if (!valid) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  if (!fullUser.email_verified_at) {
    const err = new Error('Email belum diverifikasi. Cek WhatsApp/email untuk kode verifikasi.');
    err.statusCode = 403;
    throw err;
  }

  const token = signToken({ userId: fullUser.id });
  return {
    user: {
      id: fullUser.id,
      name: fullUser.name,
      email: fullUser.email,
      storage_quota: Number(fullUser.storage_quota),
      storage_used: Number(fullUser.storage_used),
      created_at: fullUser.created_at,
      role: fullUser.role || 'user',
    },
    token,
  };
}

async function me(userId) {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    storage_quota: Number(user.storage_quota),
    storage_used: Number(user.storage_used),
    created_at: user.created_at,
    updated_at: user.updated_at,
    role: user.role || 'user',
  };
}

module.exports = { register, login, me, sendVerification, verifyEmail };
