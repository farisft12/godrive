const { Queue } = require('bullmq');
const { getRedis } = require('../config/redis');

const METADATA_QUEUE_NAME = 'godrive-metadata';

const redis = getRedis();
const metadataQueue = redis
  ? new Queue(METADATA_QUEUE_NAME, {
      connection: redis,
      defaultJobOptions: {
        attempts: 2,
        removeOnComplete: 200,
      },
    })
  : { add: async () => {} };

module.exports = { metadataQueue };
