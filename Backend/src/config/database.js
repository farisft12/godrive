/**
 * Database configuration - PostgreSQL only
 * All values from env: PG_* or DB_* (Laravel-style). No hardcoded database name.
 */
const { Pool } = require('pg');

const database = process.env.PG_DATABASE || process.env.DB_DATABASE;
if (!database) {
  throw new Error(
    'Database name required. Set PG_DATABASE or DB_DATABASE in .env (e.g. DB_DATABASE=gdrive).'
  );
}

const pool = new Pool({
  host: process.env.PG_HOST || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT || process.env.DB_PORT || '5432', 10),
  database,
  user: process.env.PG_USER || process.env.DB_USERNAME || 'postgres',
  password: process.env.PG_PASSWORD || process.env.DB_PASSWORD || '',
  max: parseInt(process.env.PG_POOL_MAX || '20', 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

module.exports = { pool };
