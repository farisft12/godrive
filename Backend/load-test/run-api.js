/**
 * API load test — runs without k6 (Node + fetch).
 * Plans + files + folders with Bearer token.
 * Usage: npm run test:load:api   or   node load-test/run-api.js
 * Env: BASE_URL, TEST_USER_EMAIL, TEST_USER_PASSWORD (or TOKEN)
 */
require('dotenv').config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com';
const PASSWORD = process.env.TEST_USER_PASSWORD || 'password123';
const PRELOAD_TOKEN = process.env.TOKEN;

const CONNECTIONS = 20;
const DURATION_MS = 30000;
const ERROR_RATE_THRESHOLD = 0.02;

const latencies = [];
let totalRequests = 0;
let errors = 0;

async function getToken() {
  if (PRELOAD_TOKEN) return PRELOAD_TOKEN;
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (res.status !== 200) return null;
  const body = await res.json();
  return body.token || body.access_token || null;
}

async function oneIteration(token) {
  const start = Date.now();
  let errCount = 0;
  try {
    const plans = await fetch(`${BASE_URL}/api/plans`);
    if (plans.status !== 200) errCount++;
    totalRequests++;

    if (token) {
      const headers = { Authorization: `Bearer ${token}` };
      const files = await fetch(`${BASE_URL}/api/files`, { headers });
      if (files.status !== 200) errCount++;
      totalRequests++;

      const folders = await fetch(`${BASE_URL}/api/folders`, { headers });
      if (folders.status !== 200) errCount++;
      totalRequests++;
    }
  } catch (_) {
    errCount = token ? 3 : 1;
  }
  errors += errCount;
  const elapsed = Date.now() - start;
  latencies.push(elapsed);
}

function p95(arr) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil(sorted.length * 0.95) - 1;
  return sorted[Math.max(0, idx)];
}

async function run() {
  const token = await getToken();
  if (!token) {
    console.error('Failed to get token. Set TEST_USER_EMAIL and TEST_USER_PASSWORD, or TOKEN.');
    process.exit(1);
  }

  const endAt = Date.now() + DURATION_MS;
  const workers = [];
  for (let i = 0; i < CONNECTIONS; i++) {
    workers.push(
      (async () => {
        while (Date.now() < endAt) {
          await oneIteration(token);
        }
      })()
    );
  }
  await Promise.all(workers);

  const avg = latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
  const p95Latency = p95(latencies);
  const errorRate = totalRequests ? errors / totalRequests : 0;

  console.log('\n--- API load test ---');
  console.log('URL:', BASE_URL, '(plans, files, folders)');
  console.log('Duration:', (DURATION_MS / 1000).toFixed(1), 's');
  console.log('Requests:', totalRequests);
  console.log('Errors:', errors);
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
