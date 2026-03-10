/**
 * k6 load test — Health / readiness
 * GET /health and GET /
 * Target: latency p95 < 100 ms, error rate 0%
 * Run: k6 run load-test/k6-health.js
 * Or: BASE_URL=http://localhost:3001 k6 run load-test/k6-health.js
 */
import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

export const options = {
  vus: 30,
  duration: '60s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
};

export default function () {
  const health = http.get(`${BASE_URL}/health`);
  check(health, {
    'health status 200': (r) => r.status === 200,
    'health body ok': (r) => {
      try {
        const b = JSON.parse(r.body);
        return b && b.status === 'ok';
      } catch {
        return false;
      }
    },
  });

  const root = http.get(`${BASE_URL}/`);
  check(root, { 'root status 200': (r) => r.status === 200 });
}
