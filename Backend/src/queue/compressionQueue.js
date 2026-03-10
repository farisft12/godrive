const { Queue } = require('bullmq');
const { getRedis } = require('../config/redis');

const COMPRESSION_QUEUE_NAME = 'godrive-compression';

const redis = getRedis();
const compressionQueue = redis
  ? new Queue(COMPRESSION_QUEUE_NAME, {
      connection: redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
      },
    })
  : { add: async () => {} };

module.exports = { compressionQueue };
