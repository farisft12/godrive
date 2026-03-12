require('dotenv').config();
const app = require('./app');

const PORT = parseInt(process.env.PORT || '3000', 10);

const server = app.listen(PORT, () => {
  console.log(`GoDrive API listening on port ${PORT}`);
  const { getChunkLimitBytes } = require('./middleware/uploadMiddleware');
  const chunkMb = getChunkLimitBytes() / (1024 * 1024);
  console.log(`Chunk upload limit: ${chunkMb} MB (set CHUNK_SIZE_MB in .env to change)`);

  // Trash cleanup job (auto delete old trashed files)
  const { cleanupTrashedFilesOnce } = require('./services/trashCleanupService');
  const intervalMin = parseInt(process.env.TRASH_CLEANUP_INTERVAL_MINUTES || '60', 10);
  const intervalMs = (Number.isFinite(intervalMin) && intervalMin >= 5 ? intervalMin : 60) * 60 * 1000;
  setInterval(() => {
    cleanupTrashedFilesOnce({ limit: 200 })
      .then((r) => console.log(`[trashCleanup] deleted=${r.deleted}/${r.scanned} retention_days=${r.retention_days}`))
      .catch((e) => console.warn('[trashCleanup] error:', e.message));
  }, intervalMs);
});

if (process.env.RUN_WORKERS === 'true') {
  const { getRedis } = require('./config/redis');
  if (getRedis()) {
    require('./queue/compressionWorker');
    require('./queue/videoWorker');
    require('./queue/metadataWorker');
    console.log('Background workers started (compression, video, metadata)');
  } else {
    console.log('Redis not available - workers disabled (set REDIS_SKIP=false and start Redis to enable)');
  }
}

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
