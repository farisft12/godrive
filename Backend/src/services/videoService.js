const path = require('path');
const fs = require('fs').promises;
const ffmpeg = require('fluent-ffmpeg');
const File = require('../models/File');
const { STREAMS, UPLOADS } = require('../config/storage');
const { ensureDir } = require('../utils/fileHelper');
const storageService = require('./storageService');

async function getVideoMetadata(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata);
    });
  });
}

async function convertToHLS(filePath, outputDir) {
  await ensureDir(outputDir);
  const outputPlaylist = path.join(outputDir, 'playlist.m3u8');

  return new Promise((resolve, reject) => {
    ffmpeg(filePath)
      .outputOptions([
        '-profile:v baseline',
        '-level 3.0',
        '-start_number 0',
        '-hls_time 10',
        '-hls_list_size 0',
        '-f hls',
      ])
      .output(outputPlaylist)
      .on('end', () => resolve(outputPlaylist))
      .on('error', reject)
      .run();
  });
}

async function processVideo(fileId, userId) {
  const file = await File.findById(fileId, userId);
  if (!file || !file.is_video) return;

  const blob = await File.getBlobById(file.blob_id);
  if (!blob) return;

  const sourcePath = path.join(UPLOADS, blob.encrypted_path);
  try {
    await fs.access(sourcePath);
  } catch {
    return;
  }

  const streamDir = path.join(STREAMS, fileId);
  const playlistPath = path.join(streamDir, 'playlist.m3u8');

  try {
    await fs.access(playlistPath);
    return;
  } catch {
    // need to generate
  }

  const buf = await storageService.readEncryptedFile(blob.encrypted_path);
  const tempInput = path.join(path.dirname(sourcePath), `video_${fileId}`);
  await fs.writeFile(tempInput, buf);

  try {
    await convertToHLS(tempInput, streamDir);
  } finally {
    await fs.unlink(tempInput).catch(() => {});
  }
}

module.exports = { getVideoMetadata, convertToHLS, processVideo };
