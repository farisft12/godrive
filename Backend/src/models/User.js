const { pool } = require('../config/database');

const TABLE = 'users';

async function create({ name, email, passwordHash, storageQuota, phone }) {
  const params = [name, email, passwordHash, storageQuota ?? 1073741824, phone || null];
  // Try with phone column first; if DB has no phone column, insert without it
  try {
    const q = `
      INSERT INTO ${TABLE} (name, email, password, storage_quota, phone)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, email, storage_quota, storage_used, created_at, updated_at
    `;
    const { rows } = await pool.query(q, params);
    return rows[0];
  } catch (err) {
    const isMissingColumn =
      err.code === '42703' ||
      (err.message && err.message.includes('phone') && err.message.includes('does not exist'));
    if (isMissingColumn) {
      const qNoPhone = `
        INSERT INTO ${TABLE} (name, email, password, storage_quota)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, email, storage_quota, storage_used, created_at, updated_at
      `;
      const { rows } = await pool.query(qNoPhone, params.slice(0, 4));
      return rows[0];
    }
    throw err;
  }
}

async function findByEmail(email) {
  const { rows } = await pool.query(
    `SELECT * FROM ${TABLE} WHERE email = $1`,
    [email]
  );
  return rows[0];
}

async function findById(id) {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, email, phone, storage_quota, storage_used, created_at, updated_at, role FROM ${TABLE} WHERE id = $1`,
      [id]
    );
    const row = rows[0];
    if (row && row.role == null) row.role = 'user';
    return row;
  } catch (err) {
    if (err.code === '42703' && (err.message || '').includes('role')) {
      const { rows } = await pool.query(
        `SELECT id, name, email, phone, storage_quota, storage_used, created_at, updated_at FROM ${TABLE} WHERE id = $1`,
        [id]
      );
      const row = rows[0];
      if (row) row.role = 'user';
      return row;
    }
    if (err.code === '42703' && (err.message || '').includes('phone')) {
      const { rows } = await pool.query(
        `SELECT id, name, email, storage_quota, storage_used, created_at, updated_at, role FROM ${TABLE} WHERE id = $1`,
        [id]
      );
      const row = rows[0];
      if (row) row.phone = null;
      return row;
    }
    throw err;
  }
}

async function findByIdWithPassword(id) {
  const { rows } = await pool.query(
    `SELECT * FROM ${TABLE} WHERE id = $1`,
    [id]
  );
  return rows[0];
}

async function updateStorageUsed(userId, delta) {
  const q = `
    UPDATE ${TABLE}
    SET storage_used = GREATEST(0, storage_used + $2)
    WHERE id = $1
    RETURNING id, storage_used, storage_quota
  `;
  const { rows } = await pool.query(q, [userId, delta]);
  return rows[0];
}

async function setStorageUsed(userId, used) {
  const { rows } = await pool.query(
    `UPDATE ${TABLE} SET storage_used = $2 WHERE id = $1 RETURNING id, storage_used, storage_quota`,
    [userId, used]
  );
  return rows[0];
}

async function listForAdmin({ limit = 50, offset = 0, search = '' }) {
  let q = `SELECT id, name, email, storage_quota, storage_used, created_at, updated_at, COALESCE(role, 'user') AS role FROM ${TABLE} WHERE 1=1`;
  const params = [];
  if (search && search.trim()) {
    params.push(`%${search.trim().toLowerCase()}%`);
    q += ` AND (LOWER(name) LIKE $${params.length} OR LOWER(email) LIKE $${params.length})`;
  }
  q += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);
  const { rows } = await pool.query(q, params);
  const countQ = search && search.trim()
    ? `SELECT COUNT(*)::int AS count FROM ${TABLE} WHERE (LOWER(name) LIKE $1 OR LOWER(email) LIKE $1)`
    : `SELECT COUNT(*)::int AS count FROM ${TABLE}`;
  const countResult = await pool.query(countQ, search && search.trim() ? [params[0]] : []);
  return { users: rows, total: countResult.rows[0].count };
}

async function updateQuota(userId, storageQuota) {
  const { rows } = await pool.query(
    `UPDATE ${TABLE} SET storage_quota = $2 WHERE id = $1 RETURNING id, storage_quota, storage_used`,
    [userId, storageQuota]
  );
  return rows[0];
}

async function setRole(userId, role) {
  const { rows } = await pool.query(
    `UPDATE ${TABLE} SET role = $2 WHERE id = $1 RETURNING id, role`,
    [userId, role]
  );
  return rows[0];
}

async function setVerificationCode(userId, code, expiresAt) {
  const { rows } = await pool.query(
    `UPDATE ${TABLE} SET verification_code = $2, verification_code_expires_at = $3 WHERE id = $1 RETURNING id`,
    [userId, code, expiresAt]
  );
  return rows[0];
}

async function findByEmailForVerification(email) {
  const { rows } = await pool.query(
    `SELECT id, name, email, phone, verification_code, verification_code_expires_at, email_verified_at FROM ${TABLE} WHERE email = $1`,
    [email.trim().toLowerCase()]
  );
  return rows[0];
}

async function verifyAndClearCode(userId, code) {
  const { rows } = await pool.query(
    `UPDATE ${TABLE} SET email_verified_at = NOW(), verification_code = NULL, verification_code_expires_at = NULL
     WHERE id = $1 AND verification_code = $2 AND verification_code_expires_at > NOW()
     RETURNING id, email_verified_at`,
    [userId, String(code).trim()]
  );
  return rows[0];
}

async function updateProfile(userId, { name, email, phone }) {
  const updates = [];
  const params = [];
  let i = 1;
  if (name !== undefined) {
    updates.push(`name = $${i++}`);
    params.push(String(name).trim());
  }
  if (email !== undefined) {
    updates.push(`email = $${i++}`);
    params.push(String(email).trim().toLowerCase());
  }
  if (phone !== undefined) {
    try {
      updates.push(`phone = $${i++}`);
      params.push(phone ? String(phone).trim() : null);
    } catch (_) {
      // skip if column doesn't exist
    }
  }
  if (updates.length === 0) return findById(userId);
  params.push(userId);
  const q = `UPDATE ${TABLE} SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`;
  const { rows } = await pool.query(q, params);
  const row = rows[0];
  if (row && row.password) delete row.password;
  return row;
}

module.exports = {
  create,
  findByEmail,
  findById,
  findByIdWithPassword,
  findByEmailForVerification,
  setVerificationCode,
  verifyAndClearCode,
  updateStorageUsed,
  setStorageUsed,
  listForAdmin,
  updateQuota,
  setRole,
  updateProfile,
};
