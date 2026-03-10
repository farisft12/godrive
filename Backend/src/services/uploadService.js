const fs = require('fs').promises;
const path = require('path');
const { createReadStream } = require('fs');
const { sha256File } = require('../utils/hashHelper');
const { isVideoFilename } = require('../utils/fileHelper');
const storageService = require('./storageService');
const quotaService = require('./quotaService');
const dedupService = require('./dedupService');
const File = require('../models/File');
const Folder = require('../models/Folder');
const Activity = require('../models/Activity');
const { compressionQueue } = require('../queue/compressionQueue');
const { videoQueue } = require('../queue/videoQueue');
const { UPLOADS } = require('../config/storage');
const { ensureDir } = require('../utils/fileHelper');

async function processUpload(userId, folderId, tempPath, originalName, mimeType) {
  const size = (await fs.stat(tempPath)).size;

  const quotaOk = await quotaService.checkAndReserve(userId, size);
  if (!quotaOk) {
    await fs.unlink(tempPath).catch(() => {});
    const err = new Error('Storage quota exceeded');
    err.statusCode = 403;
    throw err;
  }

  const sha256 = await sha256File(tempPath);
  const isVideo = isVideoFilename(originalName);

  const { blob, created: blobCreated } = await dedupService.getOrCreateBlob(tempPath, sha256, size);
  const file = await File.createFile({
    userId,
    folderId: folderId || null,
    blobId: blob.id,
    originalName,
    mimeType,
    sizeBytes: size,
    isVideo,
  });

  await quotaService.addUsage(userId, size);

  await Activity.log({
    userId,
    action: 'upload',
    resourceType: 'file',
    resourceId: file.id,
    details: { name: originalName, size, sha256: sha256.slice(0, 16) },
  });

  if (size > 5 * 1024 * 1024 && !isVideo) {
    await compressionQueue.add('compress', { fileId: file.id, userId });
  }
  if (isVideo) {
    await videoQueue.add('process', { fileId: file.id, userId });
  }

  return file;
}

async function getFileStream(fileId, userId) {
  const file = await File.findById(fileId, userId);
  if (!file) return null;
  const fullPath = path.join(UPLOADS, file.encrypted_path);
  return createReadStream(fullPath);
}

module.exports = { processUpload, getFileStream };
