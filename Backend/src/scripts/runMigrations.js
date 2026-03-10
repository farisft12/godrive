require('dotenv').config();
const { pool } = require('../config/database');
const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', '..', 'database', 'schema.sql');

async function run() {
  const sql = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(sql);
  console.log('Schema applied successfully.');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
