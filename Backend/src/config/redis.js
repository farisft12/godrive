/**
 * Redis configuration for BullMQ and caching
 * Set REDIS_SKIP=true to run without Redis (e.g. dev without Redis installed)
 */
const Redis = require('ioredis');

const skipRedis = process.env.REDIS_SKIP === 'true' || process.env.REDIS_SKIP === '1';

let redis = null;

if (!skipRedis) {
  const redisConfig = process.env.REDIS_URL
    ? { maxRetriesPerRequest: null }
    : {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: null,
        lazyConnect: true,
        retryStrategy: (times) => {
          if (times > 3) return null;
          return Math.min(times * 500, 2000);
        },
      };

  redis = process.env.REDIS_URL
    ? new Redis(process.env.REDIS_URL, redisConfig)
    : new Redis(redisConfig);

  redis.on('error', (err) => {
    console.error('Redis connection error:', err.message);
  });
}

function getRedis() {
  return redis;
}

module.exports = { redis, getRedis };
