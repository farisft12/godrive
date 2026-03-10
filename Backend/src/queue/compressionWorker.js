const { Worker } = require('bullmq');
const { getRedis } = require('../config/redis');
const { processCompressionJob } = require('../jobs/compressionJob');

const COMPRESSION_QUEUE_NAME = 'godrive-compression';

const redis = getRedis();
const compressionWorker = redis
  ? new Worker(
      COMPRESSION_QUEUE_NAME,
      async (job) => {
        await processCompressionJob(job.data);
      },
      { connection: redis, concurrency: 2 }
    )
  : null;

if (compressionWorker) {
  compressionWorker.on('failed', (job, err) => {
    console.error('Compression job failed:', job?.id, err.message);
  });
}

module.exports = { compressionWorker };
