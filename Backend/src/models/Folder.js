const { pool } = require('../config/database');

const TABLE = 'folders';

async function create({ userId, parentId, name }) {
  const q = `
    INSERT INTO ${TABLE} (user_id, parent_id, name)
    VALUES ($1, $2, $3)
    RETURNING *
  `;
  const { rows } = await pool.query(q, [userId, parentId || null, name]);
  return rows[0];
}

async function findById(id) {
  const { rows } = await pool.query(`SELECT * FROM ${TABLE} WHERE id = $1`, [id]);
  return rows[0];
}

async function findByUserAndParent(userId, parentId) {
  const { rows } = await pool.query(
    `SELECT * FROM ${TABLE} WHERE user_id = $1 AND (($2::uuid IS NULL AND parent_id IS NULL) OR parent_id = $2) ORDER BY name`,
    [userId, parentId || null]
  );
  return rows;
}

async function findByUser(userId) {
  const { rows } = await pool.query(
    `SELECT * FROM ${TABLE} WHERE user_id = $1 ORDER BY name`,
    [userId]
  );
  return rows;
}

async function findSubfolders(folderId) {
  const { rows } = await pool.query(
    `SELECT * FROM ${TABLE} WHERE parent_id = $1 ORDER BY name`,
    [folderId]
  );
  return rows;
}

async function update(id, userId, { name, parentId }) {
  const updates = [];
  const values = [];
  let i = 1;
  if (name !== undefined) {
    updates.push(`name = $${i++}`);
    values.push(name);
  }
  if (parentId !== undefined) {
    updates.push(`parent_id = $${i++}`);
    values.push(parentId);
  }
  if (updates.length === 0) return findById(id);
  values.push(id, userId);
  const q = `
    UPDATE ${TABLE} SET ${updates.join(', ')}
    WHERE id = $${i++} AND user_id = $${i}
    RETURNING *
  `;
  const { rows } = await pool.query(q, values);
  return rows[0];
}

async function remove(id, userId) {
  const { rowCount } = await pool.query(
    `DELETE FROM ${TABLE} WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return rowCount > 0;
}

async function countDescendants(id) {
  const { rows } = await pool.query(
    `WITH RECURSIVE tree AS (
      SELECT id FROM ${TABLE} WHERE parent_id = $1
      UNION ALL
      SELECT f.id FROM ${TABLE} f JOIN tree t ON f.parent_id = t.id
    ) SELECT COUNT(*)::int AS count FROM tree`,
    [id]
  );
  return rows[0].count;
}

/** Returns [folderId, parentId, ...] from folder up to root (parent_id null). */
async function getAncestorIds(folderId) {
  const ids = [];
  let id = folderId;
  while (id) {
    ids.push(id);
    const row = await findById(id);
    if (!row || !row.parent_id) break;
    id = row.parent_id;
  }
  return ids;
}

module.exports = {
  create,
  findById,
  findByUserAndParent,
  findByUser,
  findSubfolders,
  update,
  remove,
  countDescendants,
  getAncestorIds,
};
