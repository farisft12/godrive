/**
 * Jalankan migration payments pakai koneksi dari .env (sama dengan backend).
 * Tidak perlu psql di PATH.
 *
 * Dari folder Backend:
 *   node src/scripts/runPaymentsMigration.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const { pool } = require('../config/database');
const fs = require('fs');
const path = require('path');

const sqlPath = path.join(__dirname, '..', '..', 'database', 'add_payments_table.sql');

async function run() {
  const sql = fs.readFileSync(sqlPath, 'utf8');
  await pool.query(sql);
  console.log('Tabel payments berhasil dibuat/diperbarui.');
  process.exit(0);
}

run().catch((err) => {
  console.error('Migration gagal:', err.message);
  process.exit(1);
});
