const { pool } = require('../config/database');

async function getSetting(key) {
  try {
    const { rows } = await pool.query(
      'SELECT value FROM settings WHERE key = $1',
      [key]
    );
    return rows[0] ? rows[0].value : null;
  } catch (err) {
    if (err.code === '42P01') return null; // table does not exist
    console.error('[settingsHelper] getSetting error:', err.message);
    return null;
  }
}

async function setSetting(key, value) {
  const v = value === null || value === undefined ? null : String(value);
  await pool.query(
    `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
    [key, v]
  );
}

module.exports = { getSetting, setSetting };
