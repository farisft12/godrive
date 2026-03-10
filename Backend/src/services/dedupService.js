const File = require('../models/File');
const storageService = require('./storageService');
const { UPLOADS } = require('../config/storage');
const path = require('path');
const fs = require('fs').promises;

async function getOrCreateBlob(tempPath, sha256, sizeBytes) {
  const existing = await File.getBlobBySha256(sha256);
  if (existing) {
    await File.incrementBlobRefCount(existing.id);
    await fs.unlink(tempPath).catch(() => {});
    return { blob: existing, created: false };
  }

  const relativePath = await storageService.storeFile(tempPath, sha256);
  const blob = await File.createBlob({
    sha256,
    sizeBytes,
    encryptedPath: relativePath,
  });
  await fs.unlink(tempPath).catch(() => {});
  return { blob, created: true };
}

async function releaseBlob(blobId) {
  const blob = await File.getBlobById(blobId);
  if (!blob) return;
  await File.decrementBlobRefCount(blobId);
  const deleted = await File.deleteBlobIfUnused(blobId);
  if (deleted) {
    const fullPath = path.join(UPLOADS, blob.encrypted_path);
    await fs.unlink(fullPath).catch(() => {});
  }
}

module.exports = { getOrCreateBlob, releaseBlob };
