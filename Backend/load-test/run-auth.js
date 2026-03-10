/**
 * Auth load test — runs without k6 (Node + fetch).
 * Usage: npm run test:load:auth   or   node load-test/run-auth.js
 * Env: BASE_URL, TEST_USER_EMAIL, TEST_USER_PASSWORD
 */
require('dotenv').config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com';
const PASSWORD = process.env.TEST_USER_PASSWORD || 'password123';

const CONNECTIONS = 10;
const DURATION_MS = 20000;
const ERROR_RATE_THRESHOLD = 0.02;

const latencies = [];
let totalRequests = 0;
let errors = 0;
let status429 = 0;
let success = 0;

async function oneLogin() {
  const start = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });
    const elapsed = Date.now() - start;
    totalRequests++;
    latencies.push(elapsed);
    if (res.status === 429) status429++;
    if (res.status === 200) {
      const body = await res.json();
      if (body.token || body.access_token) success++;
    } else {
      errors++;
    }
  } catch (err) {
    totalRequests++;
    errors++;
    latencies.push(Date.now() - start);
  }
}

function p95(arr) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil(sorted.length * 0.95) - 1;
  return sorted[Math.max(0, idx)];
}

async function run() {
  const endAt = Date.now() + DURATION_MS;
  const workers = [];
  for (let i = 0; i < CONNECTIONS; i++) {
    workers.push(
      (async () => {
        while (Date.now() < endAt) {
          await oneLogin();
        }
      })()
    );
  }
  await Promise.all(workers);

  const avg = latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
  const p95Latency = p95(latencies);
  const errorRate = totalRequests ? errors / totalRequests : 0;

  console.log('\n--- Auth load test ---');
  console.log('URL:', `${BASE_URL}/api/auth/login`);
  console.log('Duration:', (DURATION_MS / 1000).toFixed(1), 's');
  console.log('Requests:', totalRequests);
  console.log('Success (200 + token):', success);
  console.log('Errors:', errors);
  console.log('429 (rate limit):', status429);
  console.log('Latency avg:', avg.toFixed(2), 'ms');
  console.log('Latency p95:', p95Latency.toFixed(2), 'ms');
  console.log('Error rate:', (errorRate * 100).toFixed(2), '%');

  if (errorRate > ERROR_RATE_THRESHOLD) {
    console.error('\nError rate exceeds', ERROR_RATE_THRESHOLD * 100, '%');
    process.exit(1);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
