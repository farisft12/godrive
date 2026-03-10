const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { UPLOADS, ensureDirs } = require('../config/storage');
const { uuidPath, ensureDir, getUploadPath } = require('../utils/fileHelper');
const { sha256File, encryptBuffer, decryptBuffer } = require('../utils/hashHelper');

ensureDirs();

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function getEncryptionKey() {
  const key = process.env.FILE_ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    return null;
  }
  return require('crypto').scryptSync(key, 'godrive-salt', KEY_LENGTH);
}

async function writeEncryptedFile(sourcePath, relativePath) {
  const key = getEncryptionKey();
  const buf = await fs.readFile(sourcePath);
  const encrypted = key ? encryptBuffer(buf) : buf;
  const dest = path.join(UPLOADS, relativePath);
  await ensureDir(path.dirname(dest));
  await fs.writeFile(dest, encrypted);
  return relativePath;
}

async function readEncryptedFile(relativePath) {
  const key = getEncryptionKey();
  const fullPath = path.join(UPLOADS, relativePath);
  const buf = await fs.readFile(fullPath);
  return key ? decryptBuffer(buf) : buf;
}

function createReadStream(relativePath) {
  const fullPath = path.join(UPLOADS, relativePath);
  return fs.createReadStream(fullPath);
}

async function deletePhysicalFile(relativePath) {
  const fullPath = path.join(UPLOADS, relativePath);
  await fs.unlink(fullPath).catch(() => {});
}

async function storeFile(sourcePath, sha256) {
  const relPath = uuidPath() + '.bin';
  await writeEncryptedFile(sourcePath, relPath);
  return relPath;
}

module.exports = {
  writeEncryptedFile,
  readEncryptedFile,
  createReadStream,
  deletePhysicalFile,
  storeFile,
  getUploadPath,
};
