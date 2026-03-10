const express = require('express');
const { body, validationResult } = require('express-validator');
const authController = require('../controllers/authController');
const { authLimiter } = require('../middleware/rateLimitMiddleware');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

router.post(
  '/register',
  authLimiter,
  [
    body('name').trim().isLength({ min: 1, max: 255 }).withMessage('Name required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  (req, res, next) => {
    const err = validationResult(req);
    if (!err.isEmpty()) return res.status(400).json({ errors: err.array() });
    authController.register(req, res, next);
  }
);

router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  (req, res, next) => {
    const err = validationResult(req);
    if (!err.isEmpty()) return res.status(400).json({ errors: err.array() });
    authController.login(req, res, next);
  }
);

router.get('/me', authMiddleware, authController.me);
router.post('/logout', authMiddleware, authController.logout);

router.post(
  '/send-verification',
  authLimiter,
  [body('email').isEmail().normalizeEmail()],
  (req, res, next) => {
    const err = validationResult(req);
    if (!err.isEmpty()) return res.status(400).json({ errors: err.array() });
    authController.sendVerification(req, res, next);
  }
);

router.post(
  '/verify',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('code').trim().isLength({ min: 6, max: 6 }).withMessage('Code must be 6 digits'),
  ],
  (req, res, next) => {
    const err = validationResult(req);
    if (!err.isEmpty()) return res.status(400).json({ errors: err.array() });
    authController.verify(req, res, next);
  }
);

module.exports = router;
