const uploadService = require('../services/uploadService');
const { uploadSingle } = require('../middleware/uploadMiddleware');
const Folder = require('../models/Folder');

async function upload(req, res, next) {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const folderId = req.body.folder_id || null;
    if (folderId) {
      const folder = await Folder.findById(folderId);
      if (!folder || folder.user_id !== req.userId) {
        return res.status(404).json({ error: 'Folder not found' });
      }
    }

    const file = await uploadService.processUpload(
      req.userId,
      folderId,
      req.file.path,
      req.file.originalname,
      req.file.mimetype
    );

    const { encrypted_path, ...rest } = file;
    res.status(201).json(rest);
  } catch (err) {
    next(err);
  }
}

module.exports = { upload, uploadSingle };
