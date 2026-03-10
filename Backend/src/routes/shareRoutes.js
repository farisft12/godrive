const express = require('express');
const shareController = require('../controllers/shareController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { apiLimiter } = require('../middleware/rateLimitMiddleware');
const { shareTokenAuth } = require('../middleware/shareTokenAuth');
const { uploadSingle } = require('../middleware/uploadMiddleware');

const router = express.Router();

router.get('/list', authMiddleware, shareController.listMyShares);
router.get('/by-file/:fileId', authMiddleware, shareController.getShareByFile);
router.get('/by-folder/:folderId', authMiddleware, shareController.getShareByFolder);

router.post(
  '/create',
  authMiddleware,
  apiLimiter,
  (req, res, next) => {
    const { file_id, folder_id } = req.body;
    if (!file_id && !folder_id) {
      return res.status(400).json({ error: 'file_id or folder_id required' });
    }
    if (file_id && folder_id) {
      return res.status(400).json({ error: 'Provide either file_id or folder_id, not both' });
    }
    next();
  },
  shareController.createShare
);

router.get('/:shareId/collaborators', authMiddleware, shareController.listCollaborators);
router.post('/:shareId/collaborators', authMiddleware, shareController.addCollaborator);
router.delete('/:shareId/collaborators/:collaboratorId', authMiddleware, shareController.removeCollaborator);

router.get('/:token', shareController.getByToken);
router.get('/:token/download', shareController.downloadByToken);
router.get('/:token/thumbnail', shareController.thumbnailByToken);

router.post(
  '/:token/upload',
  shareTokenAuth,
  uploadSingle('file'),
  shareController.uploadToShare
);

module.exports = router;
