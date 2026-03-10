const express = require('express');
const streamController = require('../controllers/streamController');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);
router.use(streamController);

module.exports = router;
