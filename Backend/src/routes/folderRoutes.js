const express = require('express');
const folderController = require('../controllers/folderController');
const { body } = require('express-validator');
const { validationResult } = require('express-validator');
const { authMiddleware } = require('../middleware/authMiddleware');
const { apiLimiter } = require('../middleware/rateLimitMiddleware');

const router = express.Router();

router.use(authMiddleware);
router.use(apiLimiter);

router.get('/', folderController.list);
router.post(
  '/',
  body('name').trim().isLength({ min: 1, max: 500 }),
  (req, res, next) => {
    const err = validationResult(req);
    if (!err.isEmpty()) return res.status(400).json({ errors: err.array() });
    folderController.create(req, res, next);
  }
);
router.put('/:id', folderController.update);
router.delete('/:id', folderController.remove);

module.exports = router;
