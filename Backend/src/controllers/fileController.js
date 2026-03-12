const File = require('../models/File');
const Folder = require('../models/Folder');
const quotaService = require('../services/quotaService');
const dedupService = require('../services/dedupService');
const storageService = require('../services/storageService');
const thumbnailService = require('../services/thumbnailService');
const Activity = require('../models/Activity');
const path = require('path');
const fs = require('fs');
const { UPLOADS } = require('../config/storage');

function isImageMime(mime) {
  return mime && mime.startsWith('image/');
}

function isVideoMime(mime) {
  return mime && mime.startsWith('video/');
}

async function list(req, res, next) {
  try {
    const folderId = req.query.folder_id || null;
    const trashed = req.query.trashed === 'true';
    const files = await File.findByUserAndFolder(req.userId, folderId, trashed);
    res.json({ files });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const file = await File.findById(req.params.id, req.userId);
    if (!file) return res.status(404).json({ error: 'File not found' });
    const { encrypted_path, sha256, ...rest } = file;
    res.json(rest);
  } catch (err) {
    next(err);
  }
}

async function download(req, res, next) {
  try {
    const file = await File.findById(req.params.id, req.userId);
    if (!file) return res.status(404).json({ error: 'File not found' });

    await Activity.log({
      userId: req.userId,
      action: 'download',
      resourceType: 'file',
      resourceId: file.id,
      details: { name: file.original_name, size_bytes: file.size_bytes },
    });

    res.setHeader('Content-Disposition', `attachment; filename="${file.original_name}"`);
    res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');

    if (process.env.FILE_ENCRYPTION_KEY) {
      try {
        const buf = await storageService.readEncryptedFile(file.encrypted_path);
        return res.send(buf);
      } catch (readErr) {
        if (readErr.code === 'ENOENT') {
          return res.status(404).json({ error: 'File not found on storage' });
        }
        console.error('[fileController.download] readEncryptedFile:', readErr.message);
        return res.status(500).json({ error: 'Failed to read file' });
      }
    }
    const fullPath = path.join(UPLOADS, file.encrypted_path);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'File not found on storage' });
    }
    const stream = fs.createReadStream(fullPath);
    stream.on('error', (err) => {
      if (err.code === 'ENOENT') {
        if (!res.headersSent) res.status(404).json({ error: 'File not found on storage' });
      } else if (!res.headersSent) {
        console.error('[fileController.download] stream:', err.message);
        res.status(500).json({ error: 'Failed to read file' });
      }
    });
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
}

async function thumbnail(req, res, next) {
  try {
    const file = await File.findById(req.params.id, req.userId);
    if (!file) return res.status(404).json({ error: 'File not found' });

    if (isImageMime(file.mime_type)) {
      res.setHeader('Content-Type', file.mime_type || 'image/jpeg');
      res.setHeader('Cache-Control', 'private, max-age=86400');
      try {
        if (process.env.FILE_ENCRYPTION_KEY) {
          const buf = await storageService.readEncryptedFile(file.encrypted_path);
          return res.send(buf);
        }
        const fullPath = path.join(UPLOADS, file.encrypted_path);
        if (!fs.existsSync(fullPath)) return res.status(204).send();
        const stream = fs.createReadStream(fullPath);
        return stream.pipe(res);
      } catch (imgErr) {
        if (imgErr.code === 'ENOENT') return res.status(204).send();
        throw imgErr;
      }
    }

    if (isVideoMime(file.mime_type)) {
      const buf = await thumbnailService.getVideoThumbnailBuffer(file.encrypted_path, file.mime_type);
      if (!buf) return res.status(204).send();
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'private, max-age=86400');
      return res.send(buf);
    }

    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function rename(req, res, next) {
  try {
    const { original_name } = req.body;
    const updated = await File.update(req.params.id, req.userId, { originalName: original_name });
    if (!updated) return res.status(404).json({ error: 'File not found' });

    await Activity.log({
      userId: req.userId,
      action: 'rename',
      resourceType: 'file',
      resourceId: updated.id,
      details: { newName: original_name },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function move(req, res, next) {
  try {
    const { folder_id } = req.body;
    if (folder_id) {
      const folder = await Folder.findById(folder_id);
      if (!folder || folder.user_id !== req.userId) {
        return res.status(404).json({ error: 'Folder not found' });
      }
    }
    const updated = await File.update(req.params.id, req.userId, { folderId: folder_id || null });
    if (!updated) return res.status(404).json({ error: 'File not found' });

    await Activity.log({
      userId: req.userId,
      action: 'move',
      resourceType: 'file',
      resourceId: updated.id,
      details: { folder_id: folder_id || null },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function trash(req, res, next) {
  try {
    const file = await File.findById(req.params.id, req.userId);
    if (!file) return res.status(404).json({ error: 'File not found' });

    await File.setTrashed(req.params.id, req.userId, new Date());
    await Activity.log({
      userId: req.userId,
      action: 'trash',
      resourceType: 'file',
      resourceId: file.id,
    });
    res.json({ message: 'Moved to trash' });
  } catch (err) {
    next(err);
  }
}

async function restore(req, res, next) {
  try {
    const updated = await File.setTrashed(req.params.id, req.userId, null);
    if (!updated) return res.status(404).json({ error: 'File not found' });
    await Activity.log({
      userId: req.userId,
      action: 'restore',
      resourceType: 'file',
      resourceId: updated.id,
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const file = await File.findById(req.params.id, req.userId);
    if (!file) return res.status(404).json({ error: 'File not found' });

    await quotaService.removeUsage(req.userId, file.size_bytes);
    await dedupService.releaseBlob(file.blob_id);
    await File.remove(req.params.id, req.userId);

    await Activity.log({
      userId: req.userId,
      action: 'delete',
      resourceType: 'file',
      resourceId: file.id,
      details: { name: file.original_name },
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  list,
  getOne,
  download,
  thumbnail,
  rename,
  move,
  trash,
  restore,
  remove,
};
