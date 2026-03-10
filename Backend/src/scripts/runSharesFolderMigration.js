/**
 * Run shares folder migration using app config (PostgreSQL from .env).
 * Idempotent: skips if folder_id already exists on shares.
 * Usage: node Backend/src/scripts/runSharesFolderMigration.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const { pool } = require('../config/database');
const fs = require('fs');
const path = require('path');

const migrationPath = path.join(__dirname, '..', '..', 'database', 'shares_add_folder.sql');

async function run() {
  const client = await pool.connect();
  try {
    const check = await client.query(
      `SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shares' AND column_name = 'folder_id'`
    );
    if (check.rows.length > 0) {
      console.log('shares.folder_id already exists. Skipping.');
      return;
    }
    const sql = fs.readFileSync(migrationPath, 'utf8');
    await client.query(sql);
    console.log('shares_add_folder migration applied.');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
