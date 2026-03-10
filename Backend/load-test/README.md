# GoDrive Load Tests

Stress and load tests for the GoDrive API before deploy.

## Quick start (no k6 required)

Semua skenario di bawah bisa dijalankan **tanpa install k6**, hanya dengan Node.js dan npm.

```bash
cd Backend
npm install
```

**Skenario:**

| Perintah | Skenario |
|----------|----------|
| `npm run test:load` | Health — GET /health (autocannon) |
| `npm run test:load:auth` | Auth — POST /api/auth/login |
| `npm run test:load:api` | API — GET /api/plans, /api/files, /api/folders (dengan token) |

Untuk auth dan API, set env bila perlu (default BASE_URL `http://localhost:3001`):

```bash
# Windows PowerShell
$env:BASE_URL="http://localhost:3001"; $env:TEST_USER_EMAIL="your@email.com"; $env:TEST_USER_PASSWORD="yourpass"; npm run test:load:auth
npm run test:load:api
```

Pastikan server API sudah jalan di terminal lain (mis. `npm run dev`).

---

## Skenario k6 (opsional)

Jika Anda sudah **menginstall k6** (binary), Anda bisa menjalankan skrip `k6-*.js` untuk skenario yang sama atau durasi/konkurensi lebih besar.

### Install k6

- **Windows (scoop):** `scoop install k6`
- **Windows (Chocolatey):** `choco install k6`
- **Windows (manual):** Download dari [k6.io](https://k6.io/docs/get-started/installation/) atau [Grafana](https://grafana.com/docs/k6/latest/set-up/install-k6/)
- **macOS:** `brew install k6`
- **Linux:** lihat [k6.io/docs/get-started/installation](https://k6.io/docs/get-started/installation)

## Environment

| Variable | Description | Default |
|---------|-------------|---------|
| `BASE_URL` | API base URL | `http://localhost:3001` |
| `TEST_USER_EMAIL` | User for auth/API/upload tests | `test@example.com` |
| `TEST_USER_PASSWORD` | Password for test user | `password123` |
| `TOKEN` | Optional: pre-obtained JWT (skips login in api/upload) | - |

Create a test user in the app (register or admin) and set `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` when running auth, api, and upload tests.

## Scenarios

### 1. Health (no auth)

```bash
k6 run load-test/k6-health.js
```

- **Target:** `GET /health`, `GET /` — p95 &lt; 500 ms, error rate &lt; 1%.
- **Use:** Check server is up and responsive under concurrency.

### 2. Auth (login)

```bash
BASE_URL=http://localhost:3001 TEST_USER_EMAIL=you@example.com TEST_USER_PASSWORD=yourpass k6 run load-test/k6-auth.js
```

- **Target:** `POST /api/auth/login` — error rate &lt; 2%, watch for 429 (rate limit).

### 3. API with token (plans + files + folders)

```bash
BASE_URL=http://localhost:3001 TEST_USER_EMAIL=you@example.com TEST_USER_PASSWORD=yourpass k6 run load-test/k6-api.js
```

- **Target:** Login, then `GET /api/plans`, `GET /api/files`, `GET /api/folders` — p95 &lt; 1 s, error rate &lt; 2%.

### 4. Upload (optional)

```bash
BASE_URL=http://localhost:3001 TEST_USER_EMAIL=you@example.com TEST_USER_PASSWORD=yourpass k6 run load-test/k6-upload.js
```

- **Target:** `POST /api/files/upload` with a small file — p95 &lt; 10 s, error rate &lt; 5%.

## Run from Backend directory

- **Without k6:** gunakan `npm run test:load`, `npm run test:load:auth`, `npm run test:load:api` (lihat tabel di atas).
- **With k6 installed:** run individual scripts, e.g. `k6 run load-test/k6-health.js`, `k6 run load-test/k6-auth.js`, etc.

## Readiness for deploy

- **Health:** error rate 0%, p95 &lt; 100 ms (or &lt; 500 ms if threshold relaxed).
- **Auth:** error rate &lt; 1%, few or no 429s at expected load.
- **API:** error rate &lt; 1%, p95 &lt; 1 s.
- **Upload:** error rate &lt; 2%, no systematic timeouts.

Adjust `vus` and `duration` in each script to match your target load.
