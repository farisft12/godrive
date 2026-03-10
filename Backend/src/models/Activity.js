const { pool } = require('../config/database');

const TABLE = 'activities';

async function log({ userId, action, resourceType, resourceId, details }) {
  const { rows } = await pool.query(
    `INSERT INTO ${TABLE} (user_id, action, resource_type, resource_id, details)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, action, resourceType, resourceId || null, details ? JSON.stringify(details) : null]
  );
  return rows[0];
}

async function findByUser(userId, limit = 50) {
  const { rows } = await pool.query(
    `SELECT * FROM ${TABLE} WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [userId, limit]
  );
  return rows;
}

async function findAllForAdmin({ limit = 100, offset = 0, action = '', userId = '' } = {}) {
  let q = `SELECT a.*, u.name AS user_name, u.email AS user_email FROM ${TABLE} a LEFT JOIN users u ON a.user_id = u.id WHERE 1=1`;
  const params = [];
  if (action && action.trim()) {
    params.push(action.trim());
    q += ` AND a.action = $${params.length}`;
  }
  if (userId && userId.trim()) {
    params.push(userId.trim());
    q += ` AND a.user_id::text = $${params.length}`;
  }
  params.push(limit, offset);
  q += ` ORDER BY a.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;
  const { rows } = await pool.query(q, params);
  return rows;
}

module.exports = { log, findByUser, findAllForAdmin };
