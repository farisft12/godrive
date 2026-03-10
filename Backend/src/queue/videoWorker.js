const { Worker } = require('bullmq');
const { getRedis } = require('../config/redis');
const { processVideoJob } = require('../jobs/videoJob');

const VIDEO_QUEUE_NAME = 'godrive-video';

const redis = getRedis();
const videoWorker = redis
  ? new Worker(
      VIDEO_QUEUE_NAME,
      async (job) => {
        await processVideoJob(job.data);
      },
      { connection: redis, concurrency: 1 }
    )
  : null;

if (videoWorker) {
  videoWorker.on('failed', (job, err) => {
    console.error('Video job failed:', job?.id, err.message);
  });
}

module.exports = { videoWorker };
