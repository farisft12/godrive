const Share = require('../models/Share');
const File = require('../models/File');
const User = require('../models/User');
const Folder = require('../models/Folder');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
const { UPLOADS } = require('../config/storage');
const storageService = require('../services/storageService');
const thumbnailService = require('../services/thumbnailService');
const Activity = require('../models/Activity');

function isImageMime(mime) {
  return mime && mime.startsWith('image/');
}
function isVideoMime(mime) {
  return mime && mime.startsWith('video/');
}

async function createShare(req, res, next) {
  try {
    const { file_id, folder_id, password, expires_at } = req.body;
    const passwordHash = password ? await bcrypt.hash(password, 10) : null;
    const expiresAt = expires_at ? new Date(expires_at) : null;

    if (folder_id) {
      const Folder = require('../models/Folder');
      const folder = await Folder.findById(folder_id);
      if (!folder || folder.user_id !== req.userId) {
        return res.status(404).json({ error: 'Folder not found' });
      }
      const share = await Share.create({
        userId: req.userId,
        folderId: folder_id,
        passwordHash,
        expiresAt,
      });
      await Activity.log({
        userId: req.userId,
        action: 'share_create',
        resourceType: 'share',
        resourceId: share.id,
        details: { folder_id, expires_at: share.expires_at },
      });
      return res.status(201).json({
        id: share.id,
        token: share.token,
        expires_at: share.expires_at,
        message: 'Share link created for folder.',
      });
    }

    const file = await File.findById(file_id, req.userId);
    if (!file) return res.status(404).json({ error: 'File not found' });

    const share = await Share.create({
      userId: req.userId,
      fileId: file_id,
      passwordHash,
      expiresAt,
    });
    await Activity.log({
      userId: req.userId,
      action: 'share_create',
      resourceType: 'share',
      resourceId: share.id,
      details: { file_id, expires_at: share.expires_at },
    });

    res.status(201).json({
      id: share.id,
      token: share.token,
      expires_at: share.expires_at,
      message: 'Share link created. Use GET /api/share/:token to access.',
    });
  } catch (err) {
    next(err);
  }
}

async function getByToken(req, res, next) {
  try {
    const { token } = req.params;
    const { password } = req.query;

    const share = await Share.findByToken(token);
    if (!share) return res.status(404).json({ error: 'Share not found or expired' });

    if (share.password_hash) {
      if (!password) {
        return res.status(400).json({ error: 'Password required', requiresPassword: true });
      }
      const valid = await bcrypt.compare(password, share.password_hash);
      if (!valid) {
        return res.status(403).json({ error: 'Invalid password' });
      }
    }

    if (share.folder_id) {
      const { folder_id: queryFolderId } = req.query;
      let currentFolderId = queryFolderId || share.folder_id;

      if (queryFolderId) {
        const ancestorIds = await Folder.getAncestorIds(currentFolderId);
        if (!ancestorIds.includes(share.folder_id)) {
          return res.status(404).json({ error: 'Folder not found in this share' });
        }
      }

      const user = await User.findById(share.user_id);
      const subfolders = await Folder.findByUserAndParent(share.user_id, currentFolderId);
      const files = await File.findByUserAndFolder(share.user_id, currentFolderId, false);

      const ancestorIds = await Folder.getAncestorIds(currentFolderId);
      const rootIndex = ancestorIds.indexOf(share.folder_id);
      if (rootIndex === -1) {
        return res.status(404).json({ error: 'Invalid share folder' });
      }
      const pathIds = ancestorIds.slice(0, rootIndex + 1).reverse();
      const breadcrumb = await Promise.all(
        pathIds.map(async (id) => ({
          id,
          name: id === share.folder_id ? share.folder_name : (await Folder.findById(id))?.name || 'Folder',
        }))
      );

      const currentFolder =
        currentFolderId === share.folder_id
          ? { id: share.folder_id, name: share.folder_name, updated_at: share.folder_updated_at }
          : await Folder.findById(currentFolderId);

      return res.json({
        type: 'folder',
        share_id: share.id,
        folder_id: share.folder_id,
        folder_name: share.folder_name,
        folder_updated_at: share.folder_updated_at ?? null,
        owner_name: user?.name ?? 'GoDrive user',
        owner_id: share.user_id,
        owner_id: share.user_id,
        current_folder_id: currentFolderId,
        current_folder_name: currentFolder?.name ?? share.folder_name,
        breadcrumb,
        folders: subfolders.map((f) => ({
          id: f.id,
          name: f.name,
          updated_at: f.updated_at,
        })),
        files: files.map((f) => ({
          file_id: f.id,
          original_name: f.original_name,
          mime_type: f.mime_type,
          size_bytes: Number(f.size_bytes),
          updated_at: f.updated_at,
        })),
      });
    }

    res.json({
      share_id: share.id,
      file_id: share.file_id,
      original_name: share.original_name,
      mime_type: share.mime_type,
      size_bytes: Number(share.size_bytes),
    });
  } catch (err) {
    next(err);
  }
}

async function downloadByToken(req, res, next) {
  try {
    const { token } = req.params;
    const { password, file_id } = req.query;

    const share = await Share.findByToken(token);
    if (!share) return res.status(404).json({ error: 'Share not found or expired' });

    if (share.password_hash) {
      if (!password) {
        return res.status(400).json({ error: 'Password required', requiresPassword: true });
      }
      const valid = await bcrypt.compare(password, share.password_hash);
      if (!valid) return res.status(403).json({ error: 'Invalid password' });
    }

    if (share.folder_id) {
      if (!file_id) {
        return res.status(400).json({ error: 'file_id required for folder share download' });
      }
      const file = await File.findById(file_id);
      if (!file || file.user_id !== share.user_id) {
        return res.status(404).json({ error: 'File not found' });
      }
      if (file.folder_id !== share.folder_id) {
        const ancestorIds = await Folder.getAncestorIds(file.folder_id);
        if (!ancestorIds.includes(share.folder_id)) {
          return res.status(404).json({ error: 'File not found in this share' });
        }
      }
      const fullFile = await File.findById(file.id, share.user_id);
      if (!fullFile || !fullFile.encrypted_path) return res.status(404).json({ error: 'File not found' });
      await Activity.log({
        userId: share.user_id,
        action: 'share_download',
        resourceType: 'share',
        resourceId: share.id,
        details: { token, file_id: file.id },
      });
      const buf = await storageService.readEncryptedFile(fullFile.encrypted_path);
      res.setHeader('Content-Disposition', `attachment; filename="${file.original_name}"`);
      res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
      return res.send(buf);
    }

    await Activity.log({
      userId: share.user_id,
      action: 'share_download',
      resourceType: 'share',
      resourceId: share.id,
      details: { token, file_id: share.file_id || null },
    });
    const buf = await storageService.readEncryptedFile(share.encrypted_path);
    res.setHeader('Content-Disposition', `attachment; filename="${share.original_name}"`);
    res.setHeader('Content-Type', share.mime_type || 'application/octet-stream');
    res.send(buf);
  } catch (err) {
    next(err);
  }
}

async function thumbnailByToken(req, res, next) {
  try {
    const { token } = req.params;
    const { password, file_id } = req.query;

    const share = await Share.findByToken(token);
    if (!share) return res.status(404).json({ error: 'Share not found or expired' });

    if (share.password_hash) {
      if (!password) {
        return res.status(400).json({ error: 'Password required', requiresPassword: true });
      }
      const valid = await bcrypt.compare(password, share.password_hash);
      if (!valid) return res.status(403).json({ error: 'Invalid password' });
    }

    let file = null;
    let encryptedPath = null;
    let mimeType = null;

    if (share.folder_id) {
      if (!file_id) return res.status(400).json({ error: 'file_id required' });
      file = await File.findById(file_id);
      if (!file || file.user_id !== share.user_id) return res.status(404).json({ error: 'File not found' });
      if (file.folder_id !== share.folder_id) {
        const ancestorIds = await Folder.getAncestorIds(file.folder_id);
        if (!ancestorIds.includes(share.folder_id)) return res.status(404).json({ error: 'File not found in this share' });
      }
      const fullFile = await File.findById(file.id, share.user_id);
      if (!fullFile || !fullFile.encrypted_path) return res.status(404).json({ error: 'File not found' });
      encryptedPath = fullFile.encrypted_path;
      mimeType = file.mime_type;
    } else {
      encryptedPath = share.encrypted_path;
      mimeType = share.mime_type;
    }

    if (isImageMime(mimeType)) {
      res.setHeader('Content-Type', mimeType || 'image/jpeg');
      res.setHeader('Cache-Control', 'private, max-age=86400');
      const buf = await storageService.readEncryptedFile(encryptedPath);
      return res.send(buf);
    }
    if (isVideoMime(mimeType)) {
      const buf = await thumbnailService.getVideoThumbnailBuffer(encryptedPath);
      if (!buf) return res.status(404).json({ error: 'Thumbnail not available' });
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'private, max-age=86400');
      return res.send(buf);
    }
    return res.status(404).json({ error: 'Thumbnail not available' });
  } catch (err) {
    next(err);
  }
}

async function listMyShares(req, res, next) {
  try {
    const { file_ids, folder_ids } = await Share.findByUser(req.userId);
    res.json({ file_ids: file_ids || [], folder_ids: folder_ids || [] });
  } catch (err) {
    next(err);
  }
}

async function getShareByFile(req, res, next) {
  try {
    const { fileId } = req.params;
    const share = await Share.findShareByFileAndUser(fileId, req.userId);
    if (!share) return res.status(404).json({ error: 'No share found for this file' });
    res.json({ share_id: share.id, token: share.token, expires_at: share.expires_at });
  } catch (err) {
    next(err);
  }
}

async function getShareByFolder(req, res, next) {
  try {
    const { folderId } = req.params;
    const share = await Share.findShareByFolderAndUser(folderId, req.userId);
    if (!share) return res.status(404).json({ error: 'No share found for this folder' });
    res.json({ share_id: share.id, token: share.token, expires_at: share.expires_at });
  } catch (err) {
    next(err);
  }
}

async function uploadToShare(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    let targetFolderId = req.shareFolderId;
    const bodyFolderId = req.body?.folder_id;
    if (bodyFolderId) {
      const ancestorIds = await Folder.getAncestorIds(bodyFolderId);
      if (!ancestorIds.includes(req.shareFolderId)) {
        return res.status(403).json({ error: 'Folder not in this share' });
      }
      targetFolderId = bodyFolderId;
    }
    const file = await uploadService.processUpload(
      req.shareUserId,
      targetFolderId,
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

async function listCollaborators(req, res, next) {
  try {
    const { shareId } = req.params;
    const share = await Share.findById(shareId);
    if (!share) return res.status(404).json({ error: 'Share not found' });
    if (share.user_id !== req.userId) return res.status(403).json({ error: 'Not the share owner' });
    const list = await Share.listCollaborators(shareId);
    res.json({ collaborators: list });
  } catch (err) {
    next(err);
  }
}

async function addCollaborator(req, res, next) {
  try {
    const { shareId } = req.params;
    const { email, role } = req.body || {};
    const share = await Share.findById(shareId);
    if (!share) return res.status(404).json({ error: 'Share not found' });
    if (share.user_id !== req.userId) return res.status(403).json({ error: 'Not the share owner' });
    const row = await Share.addCollaborator(shareId, { email: email || '', role: role || 'view' });
    res.status(201).json(row);
  } catch (err) {
    if (err.message === 'Email required') return res.status(400).json({ error: err.message });
    next(err);
  }
}

async function removeCollaborator(req, res, next) {
  try {
    const { shareId, collaboratorId } = req.params;
    const share = await Share.findById(shareId);
    if (!share) return res.status(404).json({ error: 'Share not found' });
    if (share.user_id !== req.userId) return res.status(403).json({ error: 'Not the share owner' });
    const removed = await Share.removeCollaborator(shareId, collaboratorId, req.userId);
    if (!removed) return res.status(404).json({ error: 'Collaborator not found' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { createShare, getByToken, downloadByToken, thumbnailByToken, listMyShares, getShareByFile, getShareByFolder, uploadToShare, listCollaborators, addCollaborator, removeCollaborator };
