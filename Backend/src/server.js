require('dotenv').config();
const app = require('./app');

const PORT = parseInt(process.env.PORT || '3000', 10);

const server = app.listen(PORT, () => {
  console.log(`GoDrive API listening on port ${PORT}`);
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
