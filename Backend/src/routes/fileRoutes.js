const express = require('express');
const fileController = require('../controllers/fileController');
const uploadController = require('../controllers/uploadController');
const { middlewareWithDynamicLimit, uploadChunk } = require('../middleware/uploadMiddleware');
const { body } = require('express-validator');
const { validationResult } = require('express-validator');
const { authMiddleware } = require('../middleware/authMiddleware');
const { apiLimiter } = require('../middleware/rateLimitMiddleware');

const router = express.Router();

router.use(authMiddleware);
router.use(apiLimiter);

router.post('/upload/init', uploadController.initChunked);
router.get('/upload/status', uploadController.statusChunked);
router.post('/upload/chunk', (req, res, next) => {
  req.setTimeout(120000);
  res.setTimeout(120000);
  next();
}, uploadChunk, uploadController.uploadChunk);
router.post('/upload/complete', uploadController.completeChunked);
router.post('/upload', middlewareWithDynamicLimit('file'), uploadController.upload);

router.get('/', fileController.list);
router.get('/:id', fileController.getOne);
router.get('/:id/download', fileController.download);
router.get('/:id/thumbnail', fileController.thumbnail);

router.put(
  '/:id/rename',
  body('original_name').trim().isLength({ min: 1, max: 500 }),
  (req, res, next) => {
    const err = validationResult(req);
    if (!err.isEmpty()) return res.status(400).json({ errors: err.array() });
    fileController.rename(req, res, next);
  }
);

router.put('/:id/move', fileController.move);

router.post('/:id/trash', fileController.trash);
router.post('/:id/restore', fileController.restore);
router.delete('/:id', fileController.remove);

module.exports = router;
