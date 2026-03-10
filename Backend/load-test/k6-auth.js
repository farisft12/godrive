/**
 * k6 load test — Auth (login)
 * POST /api/auth/login with valid credentials
 * Target: error rate < 1%, watch for 429 (rate limit)
 * Run: k6 run load-test/k6-auth.js
 * Env: BASE_URL, TEST_USER_EMAIL, TEST_USER_PASSWORD
 */
import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const EMAIL = __ENV.TEST_USER_EMAIL || 'test@example.com';
const PASSWORD = __ENV.TEST_USER_PASSWORD || 'password123';

export const options = {
  vus: 10,
  duration: '90s',
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<2000'],
  },
};

export default function () {
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email: EMAIL, password: PASSWORD }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  check(res, {
    'login status 200': (r) => r.status === 200,
    'login returns token': (r) => {
      if (r.status !== 200) return true;
      try {
        const b = JSON.parse(r.body);
        return b && (b.token || b.access_token);
      } catch {
        return false;
      }
    },
  });

  if (res.status === 429) {
    console.warn('Rate limited (429)');
  }
}
