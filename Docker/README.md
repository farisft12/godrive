# GoDrive - Docker

Docker setup for **GoDrive** with **PostgreSQL on the host** (Laragon).  
PostgreSQL does **not** run in Docker; the backend connects to it via `host.docker.internal`.

## Architecture

```
User → NGINX (port 80)
         ├── /       → Frontend (React)
         └── /api    → Backend (Node.js) → PostgreSQL (Laragon on host)
Backend ↔ Redis (queue, cache, jobs)
```

## Requirements

- Docker & Docker Compose
- **PostgreSQL** running on the host (e.g. Laragon), with database `gdrive` and schema applied
- Backend and frontend source in `../backend` and `../frontend`

## Quick start

1. **Create `.env` from example** (from project root or from `docker/`):

   ```bash
   cd docker
   cp .env.example .env
   ```

2. **Edit `.env`** and set at least:
   - `DB_PASSWORD` – PostgreSQL password (Laragon user)
   - `JWT_SECRET` – secret for JWT (use a strong value in production)

3. **Start all services**:

   ```bash
   docker-compose up -d
   ```

4. **Open in browser**: **http://localhost**
   - Frontend: http://localhost/
   - API: http://localhost/api/ (e.g. http://localhost/api/auth/login)

## How the backend connects to PostgreSQL on the host

- The backend container runs inside Docker’s network and **cannot** use `localhost` to reach services on your PC.
- Docker provides **`host.docker.internal`** (and on Linux via `extra_hosts: host.docker.internal:host-gateway`) so that containers can reach the host machine.
- In `docker-compose.yml`, the backend is given:
  - `DB_HOST=host.docker.internal`
  - `DB_PORT=5432`
  - `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` from `.env`
- So the backend connects to **PostgreSQL listening on the host** (e.g. Laragon) at `host.docker.internal:5432` with the credentials from `.env`.

**Laragon:** Ensure PostgreSQL is running and allows TCP connections on port 5432. The database `gdrive` must exist and the GoDrive schema must be applied (e.g. `npm run db:migrate` from the backend or run `database/schema.sql` manually).

## Services

| Service   | Port (host) | Description                    |
|----------|-------------|--------------------------------|
| nginx    | 80          | Reverse proxy: / → frontend, /api → backend |
| backend  | internal 5000 | Node.js API                  |
| frontend | internal 80   | React app (built, served by nginx) |
| redis    | 6379        | Queue, cache, background jobs  |

## Commands

```bash
# Start (detached)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down

# Rebuild after code changes
docker-compose up -d --build
```

## Folder layout

- `docker-compose.yml` – services: nginx, backend, frontend, redis
- `nginx/nginx.conf` – routing for / and /api
- `backend/Dockerfile` – Node 20, port 5000
- `frontend/Dockerfile` – React build, served with nginx
- `.env.example` – example env vars for Docker

## Frontend build output

The frontend Dockerfile expects the build output in **`dist/`** (Vite default).  
If your React app uses **`build/`** (e.g. Create React App), edit `docker/frontend/Dockerfile` and change:

- `COPY --from=builder /app/dist` → `COPY --from=builder /app/build`

## Backend folder name

If your backend folder is named **`Backend`** (capital B), in `docker-compose.yml` set:

- `context: ../Backend` for the backend service.
