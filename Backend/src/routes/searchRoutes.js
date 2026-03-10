const express = require('express');
const searchController = require('../controllers/searchController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { apiLimiter } = require('../middleware/rateLimitMiddleware');

const router = express.Router();

router.use(authMiddleware);
router.use(apiLimiter);

router.get('/', searchController.search);

module.exports = router;
