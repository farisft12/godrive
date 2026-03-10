/**
 * Run share_collaborators migration using app config (PostgreSQL from .env).
 * Idempotent: skips if table share_collaborators already exists.
 * Usage: node Backend/src/scripts/runShareCollaboratorsMigration.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const { pool } = require('../config/database');
const fs = require('fs');
const path = require('path');

const migrationPath = path.join(__dirname, '..', '..', 'database', 'share_collaborators.sql');

async function run() {
  const client = await pool.connect();
  try {
    const check = await client.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'share_collaborators'`
    );
    if (check.rows.length > 0) {
      console.log('share_collaborators table already exists. Skipping.');
      return;
    }
    const sql = fs.readFileSync(migrationPath, 'utf8');
    await client.query(sql);
    console.log('share_collaborators migration applied.');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
