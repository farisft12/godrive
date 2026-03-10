/**
 * Run all database migrations in order (uses DB from Backend .env).
 * Idempotent: safe to run multiple times.
 * Usage: node src/scripts/runAllMigrations.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const { pool } = require('../config/database');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..', 'database');

async function runSchema(client) {
  const sql = fs.readFileSync(path.join(root, 'schema.sql'), 'utf8');
  try {
    await client.query(sql);
    console.log('✓ schema.sql applied.');
  } catch (err) {
    if (/already exists/.test(err.message)) {
      console.log('✓ schema.sql: tables already exist, skipping.');
      return;
    }
    throw err;
  }
}

async function runAddPhone(client) {
  const sql = fs.readFileSync(path.join(root, 'add_phone_to_users.sql'), 'utf8');
  await client.query(sql);
  console.log('✓ add_phone_to_users.sql applied.');
}

async function runSharesFolder(client) {
  const check = await client.query(
    `SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shares' AND column_name = 'folder_id'`
  );
  if (check.rows.length > 0) {
    console.log('✓ shares_add_folder: folder_id already exists, skipping.');
    return;
  }
  const sql = fs.readFileSync(path.join(root, 'shares_add_folder.sql'), 'utf8');
  await client.query(sql);
  console.log('✓ shares_add_folder.sql applied.');
}

async function runShareCollaborators(client) {
  const check = await client.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'share_collaborators'`
  );
  if (check.rows.length > 0) {
    console.log('✓ share_collaborators: table already exists, skipping.');
    return;
  }
  const sql = fs.readFileSync(path.join(root, 'share_collaborators.sql'), 'utf8');
  await client.query(sql);
  console.log('✓ share_collaborators.sql applied.');
}

async function runAddRole(client) {
  const check = await client.query(
    `SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'role'`
  );
  if (check.rows.length > 0) {
    console.log('✓ add_role_to_users: role column already exists, skipping.');
    return;
  }
  const sql = fs.readFileSync(path.join(root, 'add_role_to_users.sql'), 'utf8');
  await client.query(sql);
  console.log('✓ add_role_to_users.sql applied.');
}

async function runVerification(client) {
  const check = await client.query(
    `SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'verification_code'`
  );
  if (check.rows.length > 0) {
    console.log('✓ add_verification_to_users: verification columns already exist, skipping.');
    return;
  }
  const sql = fs.readFileSync(path.join(root, 'add_verification_to_users.sql'), 'utf8');
  await client.query(sql);
  console.log('✓ add_verification_to_users.sql applied.');
}

async function runStoragePlans(client) {
  const check = await client.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'storage_plans'`
  );
  if (check.rows.length > 0) {
    console.log('✓ add_storage_plans: table already exists, skipping.');
  } else {
    const sql = fs.readFileSync(path.join(root, 'add_storage_plans.sql'), 'utf8');
    await client.query(sql);
    console.log('✓ add_storage_plans.sql applied.');
  }
  const yearlyPath = path.join(root, 'add_storage_plans_yearly.sql');
  if (fs.existsSync(yearlyPath)) {
    const yearlySql = fs.readFileSync(yearlyPath, 'utf8');
    await client.query(yearlySql);
    console.log('✓ add_storage_plans_yearly.sql applied.');
  }
  const deletedAtPath = path.join(root, 'add_storage_plans_deleted_at.sql');
  if (fs.existsSync(deletedAtPath)) {
    const deletedAtSql = fs.readFileSync(deletedAtPath, 'utf8');
    await client.query(deletedAtSql);
    console.log('✓ add_storage_plans_deleted_at.sql applied.');
  }
}

async function run() {
  const db = process.env.PG_DATABASE || process.env.DB_DATABASE || 'gdrive';
  console.log('Running migrations on database:', db);
  const client = await pool.connect();
  try {
    await runSchema(client);
    await runAddPhone(client);
    await runSharesFolder(client);
    await runShareCollaborators(client);
    await runAddRole(client);
    await runVerification(client);
    await runStoragePlans(client);
    console.log('All migrations done.');
  } finally {
    client.release();
    await pool.end();
  }
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
