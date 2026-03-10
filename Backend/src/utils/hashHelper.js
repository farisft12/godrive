const crypto = require('crypto');
const fs = require('fs');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function getEncryptionKey() {
  const key = process.env.FILE_ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    throw new Error('FILE_ENCRYPTION_KEY must be set and at least 32 characters');
  }
  return crypto.scryptSync(key, 'godrive-salt', KEY_LENGTH);
}

function sha256Stream(stream) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

function sha256Buffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath);
    sha256Stream(stream).then(resolve).catch(reject);
  });
}

function encryptBuffer(buffer) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]);
}

function decryptBuffer(encryptedBuffer) {
  const key = getEncryptionKey();
  const iv = encryptedBuffer.subarray(0, IV_LENGTH);
  const tag = encryptedBuffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const data = encryptedBuffer.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}

module.exports = {
  sha256Stream,
  sha256Buffer,
  sha256File,
  encryptBuffer,
  decryptBuffer,
  getEncryptionKey,
};
