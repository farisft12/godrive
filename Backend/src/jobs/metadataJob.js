const videoService = require('../services/videoService');
const File = require('../models/File');
const { pool } = require('../config/database');
const path = require('path');
const { UPLOADS } = require('../config/storage');

async function processMetadataJob(data) {
  const { fileId, userId } = data;
  if (!fileId || !userId) return;

  const file = await File.findById(fileId, userId);
  if (!file || !file.is_video) return;

  const blob = await File.getBlobById(file.blob_id);
  if (!blob) return;

  const filePath = path.join(UPLOADS, blob.encrypted_path);
  try {
    const metadata = await videoService.getVideoMetadata(filePath);
    await pool.query(
      `UPDATE files SET updated_at = NOW() WHERE id = $1`,
      [fileId]
    );
    return metadata;
  } catch (err) {
    console.warn('Metadata extraction failed for file', fileId, err.message);
  }
}

module.exports = { processMetadataJob };
