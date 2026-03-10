# GoDrive Backend

Private cloud storage API (Node.js, Express, PostgreSQL, Redis, BullMQ).

## 1. Installation

```bash
cd backend
npm install
```

## 2. PostgreSQL schema

Create database and run schema:

```bash
# Create DB (psql or pgAdmin)
createdb godrive

# From backend folder
psql -U postgres -d godrive -f database/schema.sql

# Or via Node (after setting .env)
npm run db:migrate
```

## 3. Environment

```bash
cp .env.example .env
# Edit .env: set PG_*, REDIS_*, JWT_SECRET, optional FILE_ENCRYPTION_KEY
```

## 4. Run development server

```bash
# Terminal 1: API (ensure PostgreSQL and Redis are running)
npm run dev

# Optional: run workers in same process (compression, video, metadata)
# Set RUN_WORKERS=true in .env and restart
```

- API: http://localhost:3000  
- Health: http://localhost:3000/health  

## 5. Docker (later)

- Set env vars for `PG_HOST`, `REDIS_HOST` to service names.
- Mount `STORAGE_ROOT` to a volume for persistence.
- Run workers as a separate container or set `RUN_WORKERS=true`.

## API

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for all endpoints.

## Project structure

```
backend/
├── database/schema.sql
├── src/
│   ├── config/       database, redis, storage
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── queue/        BullMQ queues and workers
│   ├── jobs/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── app.js
│   └── server.js
├── storage/          uploads, streams, temp (created at runtime)
├── package.json
└── .env.example
```
