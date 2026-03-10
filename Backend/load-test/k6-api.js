/**
 * k6 load test — API with token (plans + files/folders)
 * 1. Login to get token
 * 2. GET /api/plans (public)
 * 3. GET /api/files and GET /api/folders with Bearer token
 * Target: p95 < 500 ms, error rate < 1%
 * Run: k6 run load-test/k6-api.js
 * Env: BASE_URL, TEST_USER_EMAIL, TEST_USER_PASSWORD (or TOKEN to skip login)
 */
import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const EMAIL = __ENV.TEST_USER_EMAIL || 'test@example.com';
const PASSWORD = __ENV.TEST_USER_PASSWORD || 'password123';
const PRELOAD_TOKEN = __ENV.TOKEN;

function getToken() {
  if (PRELOAD_TOKEN) return PRELOAD_TOKEN;
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email: EMAIL, password: PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  if (res.status !== 200) return null;
  try {
    const b = JSON.parse(res.body);
    return b.token || b.access_token || null;
  } catch {
    return null;
  }
}

export const options = {
  vus: 20,
  duration: '120s',
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<1000'],
  },
};

export default function () {
  const token = getToken();

  const plans = http.get(`${BASE_URL}/api/plans`);
  check(plans, { 'plans status 200': (r) => r.status === 200 });

  if (token) {
    const headers = { Authorization: `Bearer ${token}` };
    const files = http.get(`${BASE_URL}/api/files`, { headers });
    check(files, { 'files status 200': (r) => r.status === 200 });

    const folders = http.get(`${BASE_URL}/api/folders`, { headers });
    check(folders, { 'folders status 200': (r) => r.status === 200 });
  }
}
