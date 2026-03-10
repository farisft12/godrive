const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const { UPLOADS, TEMP } = require('../config/storage');

const VIDEO_EXTENSIONS = new Set([
  '.mp4', '.webm', '.mkv', '.avi', '.mov', '.m4v', '.flv', '.wmv', '.m3u8',
]);

function getExtension(filename) {
  return path.extname(filename).toLowerCase();
}

function isVideoFilename(filename) {
  return VIDEO_EXTENSIONS.has(getExtension(filename));
}

function sanitizeFileName(name) {
  return name.replace(/[/\\?%*:|"<>]/g, '_').slice(0, 500);
}

function uuidPath() {
  const u = uuidv4();
  return path.join(u.slice(0, 2), u.slice(2, 4), u);
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

function getUploadPath(relativePath) {
  return path.join(UPLOADS, relativePath);
}

function getTempPath(filename) {
  return path.join(TEMP, uuidv4() + path.extname(filename || ''));
}

module.exports = {
  getExtension,
  isVideoFilename,
  sanitizeFileName,
  uuidPath,
  ensureDir,
  getUploadPath,
  getTempPath,
};
