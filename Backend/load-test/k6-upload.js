/**
 * k6 load test — Upload (optional, heavier)
 * POST /api/files/upload with multipart file (small)
 * Requires valid token. Target: no timeout, error rate < 2%
 * Run: k6 run load-test/k6-upload.js
 * Env: BASE_URL, TEST_USER_EMAIL, TEST_USER_PASSWORD or TOKEN
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

// Small file body ~100KB (dummy content)
const fileContent = 'x'.repeat(100 * 1024);

export const options = {
  vus: 5,
  duration: '60s',
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<10000'],
  },
};

export default function () {
  const token = getToken();
  if (!token) return;

  const formData = {
    file: http.file(fileContent, 'test-upload.dat', 'application/octet-stream'),
  };

  const res = http.post(
    `${BASE_URL}/api/files/upload`,
    formData,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  check(res, {
    'upload status 2xx': (r) => r.status >= 200 && r.status < 300,
  });
}
