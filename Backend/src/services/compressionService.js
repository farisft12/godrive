const zlib = require('zlib');
const fs = require('fs').promises;
const path = require('path');
const File = require('../models/File');
const storageService = require('./storageService');
const quotaService = require('./quotaService');
const dedupService = require('./dedupService');
const { UPLOADS, TEMP } = require('../config/storage');
const { pool } = require('../config/database');

const COMPRESSIBLE_MIMES = new Set([
  'text/plain', 'text/html', 'text/css', 'application/json', 'application/javascript',
  'application/xml', 'image/svg+xml', 'application/x-gzip',
]);

async function compressFile(fileId, userId) {
  const file = await File.findById(fileId, userId);
  if (!file || file.is_compressed) return;

  const blob = await File.getBlobById(file.blob_id);
  if (!blob) return;

  const fullPath = path.join(UPLOADS, blob.encrypted_path);
  let buf;
  try {
    buf = await fs.readFile(fullPath);
  } catch {
    return;
  }

  const mime = (file.mime_type || '').toLowerCase();
  if (!COMPRESSIBLE_MIMES.has(mime) && !/^text\//.test(mime)) {
    return;
  }

  const compressed = zlib.gzipSync(buf, { level: 9 });
  if (compressed.length >= buf.length) return;

  const tempPath = path.join(TEMP, `compressed_${fileId}.gz`);
  await fs.writeFile(tempPath, compressed);
  const sha256Compressed = require('crypto').createHash('sha256').update(compressed).digest('hex');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await dedupService.releaseBlob(file.blob_id);
    const { blob: newBlob, created } = await dedupService.getOrCreateBlob(
      tempPath,
      sha256Compressed,
      compressed.length
    );

    await client.query(
      'UPDATE files SET blob_id = $1, size_bytes = $2, is_compressed = true WHERE id = $3 AND user_id = $4',
      [newBlob.id, compressed.length, fileId, userId]
    );
    await quotaService.removeUsage(userId, file.size_bytes);
    await quotaService.addUsage(userId, compressed.length);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

module.exports = { compressFile };
