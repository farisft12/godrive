/**
 * Health check load test — runs without k6 (Node + autocannon).
 * Usage: npm run test:load   or   node load-test/run-health.js
 * Requires: npm install (autocannon is devDependency)
 */
require('dotenv').config();
const autocannon = require('autocannon');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const url = new URL('/health', BASE_URL).toString();

autocannon(
  {
    url,
    connections: 20,
    duration: 15,
    pipelining: 2,
  },
  (err, result) => {
    if (err) {
      console.error('Load test failed:', err.message);
      process.exit(1);
    }
    console.log('\n--- Health check load test ---');
    console.log('URL:', url);
    console.log('Duration:', result.duration, 's');
    console.log('Requests:', result.requests.total);
    console.log('Throughput:', result.throughput.total, 'bytes');
    console.log('Latency avg:', (result.latency.mean / 1000).toFixed(2), 'ms');
    console.log('Latency p95:', (result.latency.p99 / 1000).toFixed(2), 'ms');
    console.log('Errors:', result.errors);
    console.log('Non-2xx:', result.non2xx);
    if (result.errors > 0 || result.non2xx > 0) {
      process.exit(1);
    }
  }
);
