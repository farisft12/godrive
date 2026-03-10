const path = require('path');
const fs = require('fs').promises;
const ffmpeg = require('fluent-ffmpeg');
const { TEMP } = require('../config/storage');
const storageService = require('./storageService');
const { ensureDir } = require('../utils/fileHelper');

/**
 * Get file extension for video container so ffmpeg can detect format.
 * @param {string} mimeType - e.g. video/mp4, video/webm
 * @returns {string} extension including dot, e.g. '.mp4'
 */
function getVideoExtension(mimeType) {
  if (!mimeType || !mimeType.startsWith('video/')) return '.mp4';
  const map = {
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'video/quicktime': '.mov',
    'video/x-msvideo': '.avi',
    'video/x-matroska': '.mkv',
  };
  return map[mimeType] || '.mp4';
}

/**
 * Generate a JPEG thumbnail from the first frame of a video.
 * @param {string} encryptedPath - relative path to encrypted blob
 * @param {string} [mimeType] - file mime type for correct container extension
 * @returns {Promise<Buffer|null>} JPEG buffer or null if ffmpeg fails
 */
async function getVideoThumbnailBuffer(encryptedPath, mimeType) {
  let tempPath = null;
  let outPath = null;
  try {
    const buf = await storageService.readEncryptedFile(encryptedPath);
    await ensureDir(TEMP);
    const ext = getVideoExtension(mimeType);
    const prefix = `thumb_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    tempPath = path.join(TEMP, `${prefix}${ext}`);
    outPath = path.join(TEMP, `${prefix}.jpg`);
    await fs.writeFile(tempPath, buf);

    await new Promise((resolve, reject) => {
      ffmpeg(tempPath)
        .seekInput(0)
        .outputOptions(['-vframes 1'])
        .output(outPath)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });

    const outBuf = await fs.readFile(outPath);
    return outBuf;
  } catch {
    return null;
  } finally {
    if (tempPath) await fs.unlink(tempPath).catch(() => {});
    if (outPath) await fs.unlink(outPath).catch(() => {});
  }
}

module.exports = { getVideoThumbnailBuffer };
