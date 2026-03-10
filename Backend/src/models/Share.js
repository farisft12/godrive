const { pool } = require('../config/database');
const crypto = require('crypto');

const TABLE = 'shares';

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function create({ userId, fileId, folderId, passwordHash, expiresAt }) {
  if (!fileId && !folderId) throw new Error('Either fileId or folderId required');
  const token = generateToken();

  if (folderId) {
    try {
      const { rows } = await pool.query(
        `INSERT INTO ${TABLE} (user_id, folder_id, token, password_hash, expires_at)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [userId, folderId, token, passwordHash || null, expiresAt || null]
      );
      return { ...rows[0], token };
    } catch (err) {
      if (err.code === '42703') {
        const e = new Error('Folder sharing requires database migration. Run shares_add_folder.sql');
        e.statusCode = 501;
        throw e;
      }
      throw err;
    }
  }

  const { rows } = await pool.query(
    `INSERT INTO ${TABLE} (user_id, file_id, token, password_hash, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, fileId, token, passwordHash || null, expiresAt || null]
  );
  return { ...rows[0], token };
}

async function findByToken(token) {
  const { rows } = await pool.query(
    `SELECT s.*, f.original_name, f.mime_type, f.size_bytes, f.blob_id, b.encrypted_path
     FROM ${TABLE} s
     LEFT JOIN files f ON s.file_id = f.id
     LEFT JOIN file_blobs b ON f.blob_id = b.id
     WHERE s.token = $1 AND (s.expires_at IS NULL OR s.expires_at > NOW())`,
    [token]
  );
  const row = rows[0];
  if (!row) return null;
  if (row.folder_id) {
    const folderRows = await pool.query(
      `SELECT name, updated_at FROM folders WHERE id = $1`,
      [row.folder_id]
    );
    const folder = folderRows.rows[0];
    return {
      ...row,
      folder_name: folder?.name,
      folder_updated_at: folder?.updated_at,
    };
  }
  return row;
}

async function findByFileAndUser(fileId, userId) {
  const { rows } = await pool.query(
    `SELECT * FROM ${TABLE} WHERE file_id = $1 AND user_id = $2`,
    [fileId, userId]
  );
  return rows;
}

async function findByUser(userId) {
  const { rows } = await pool.query(
    `SELECT file_id FROM ${TABLE} WHERE user_id = $1 AND (expires_at IS NULL OR expires_at > NOW())`,
    [userId]
  );
  const file_ids = rows.map((r) => r.file_id).filter(Boolean);
  let folder_ids = [];
  try {
    const folderRows = await pool.query(
      `SELECT folder_id FROM ${TABLE} WHERE user_id = $1 AND folder_id IS NOT NULL AND (expires_at IS NULL OR expires_at > NOW())`,
      [userId]
    );
    folder_ids = folderRows.rows.map((r) => r.folder_id).filter(Boolean);
  } catch (_) {
    // folder_id column may not exist yet (old schema)
  }
  return { file_ids, folder_ids };
}

async function findShareByFileAndUser(fileId, userId) {
  const { rows } = await pool.query(
    `SELECT id, token, expires_at FROM ${TABLE} WHERE file_id = $1 AND user_id = $2 AND (expires_at IS NULL OR expires_at > NOW()) ORDER BY created_at DESC LIMIT 1`,
    [fileId, userId]
  );
  return rows[0];
}

async function findShareByFolderAndUser(folderId, userId) {
  try {
    const { rows } = await pool.query(
      `SELECT id, token, expires_at FROM ${TABLE} WHERE folder_id = $1 AND user_id = $2 AND (expires_at IS NULL OR expires_at > NOW()) ORDER BY created_at DESC LIMIT 1`,
      [folderId, userId]
    );
    return rows[0];
  } catch (err) {
    if (err.code === '42703') return null; // column folder_id does not exist
    throw err;
  }
}

async function findById(shareId) {
  const { rows } = await pool.query(
    `SELECT * FROM ${TABLE} WHERE id = $1`,
    [shareId]
  );
  return rows[0] || null;
}

const COLLAB_TABLE = 'share_collaborators';

async function listCollaborators(shareId) {
  try {
    const { rows } = await pool.query(
      `SELECT sc.id, sc.share_id, sc.user_id, sc.email, sc.role, sc.created_at, u.name AS user_name
       FROM ${COLLAB_TABLE} sc
       LEFT JOIN users u ON sc.user_id = u.id
       WHERE sc.share_id = $1
       ORDER BY sc.created_at ASC`,
      [shareId]
    );
    return rows;
  } catch (err) {
    if (err.code === '42P01') return []; // table does not exist yet
    throw err;
  }
}

async function addCollaborator(shareId, { email, role = 'view' }) {
  const normalizedEmail = email && String(email).trim().toLowerCase();
  if (!normalizedEmail) throw new Error('Email required');
  if (!['view', 'edit'].includes(role)) throw new Error('Role must be view or edit');

  const userByEmail = await pool.query(
    `SELECT id FROM users WHERE LOWER(email) = $1`,
    [normalizedEmail]
  );
  const userId = userByEmail.rows[0]?.id || null;

  const { rows } = await pool.query(
    `INSERT INTO ${COLLAB_TABLE} (share_id, user_id, email, role)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (share_id, email) DO UPDATE SET role = $4, user_id = $2
     RETURNING *`,
    [shareId, userId, normalizedEmail, role]
  );
  return rows[0];
}

async function removeCollaborator(shareId, collaboratorId, ownerUserId) {
  const share = await findById(shareId);
  if (!share || share.user_id !== ownerUserId) return false;
  const { rowCount } = await pool.query(
    `DELETE FROM ${COLLAB_TABLE} WHERE id = $1 AND share_id = $2`,
    [collaboratorId, shareId]
  );
  return rowCount > 0;
}

async function remove(id, userId) {
  const { rowCount } = await pool.query(
    `DELETE FROM ${TABLE} WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return rowCount > 0;
}

module.exports = {
  generateToken,
  create,
  findByToken,
  findById,
  findByFileAndUser,
  findByUser,
  findShareByFileAndUser,
  findShareByFolderAndUser,
  listCollaborators,
  addCollaborator,
  removeCollaborator,
  remove,
};
