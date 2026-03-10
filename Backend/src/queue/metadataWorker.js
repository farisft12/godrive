const { Worker } = require('bullmq');
const { getRedis } = require('../config/redis');
const { processMetadataJob } = require('../jobs/metadataJob');

const METADATA_QUEUE_NAME = 'godrive-metadata';

const redis = getRedis();
const metadataWorker = redis
  ? new Worker(
      METADATA_QUEUE_NAME,
      async (job) => {
        await processMetadataJob(job.data);
      },
      { connection: redis, concurrency: 5 }
    )
  : null;

if (metadataWorker) {
  metadataWorker.on('failed', (job, err) => {
    console.error('Metadata job failed:', job?.id, err.message);
  });
}

module.exports = { metadataWorker };
