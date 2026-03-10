const express = require('express');
const systemController = require('../controllers/systemController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { adminMiddleware } = require('../middleware/adminMiddleware');
const { apiLimiter } = require('../middleware/rateLimitMiddleware');

const router = express.Router();

router.use(authMiddleware);
router.use(apiLimiter);

// System storage (disk usage) - admin only
router.get('/storage', adminMiddleware, systemController.getStorage);

module.exports = router;
