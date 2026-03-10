const { Queue } = require('bullmq');
const { getRedis } = require('../config/redis');

const VIDEO_QUEUE_NAME = 'godrive-video';

const redis = getRedis();
const videoQueue = redis
  ? new Queue(VIDEO_QUEUE_NAME, {
      connection: redis,
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 10000 },
        removeOnComplete: 50,
      },
    })
  : { add: async () => {} };

module.exports = { videoQueue };
