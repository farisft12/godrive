const { pool } = require('../config/database');

const FILES = 'files';
const BLOBS = 'file_blobs';

async function createBlob({ sha256, sizeBytes, encryptedPath }) {
  const q = `
    INSERT INTO ${BLOBS} (sha256, size_bytes, encrypted_path)
    VALUES ($1, $2, $3)
    ON CONFLICT (sha256) DO UPDATE SET ref_count = ${BLOBS}.ref_count + 1
    RETURNING *
  `;
  const { rows } = await pool.query(q, [sha256, sizeBytes, encryptedPath]);
  return rows[0];
}

async function getBlobBySha256(sha256) {
  const { rows } = await pool.query(`SELECT * FROM ${BLOBS} WHERE sha256 = $1`, [sha256]);
  return rows[0];
}

async function getBlobById(id) {
  const { rows } = await pool.query(`SELECT * FROM ${BLOBS} WHERE id = $1`, [id]);
  return rows[0];
}

async function incrementBlobRefCount(blobId) {
  const { rows } = await pool.query(
    `UPDATE ${BLOBS} SET ref_count = ref_count + 1 WHERE id = $1 RETURNING *`,
    [blobId]
  );
  return rows[0];
}

async function decrementBlobRefCount(blobId) {
  const { rows } = await pool.query(
    `UPDATE ${BLOBS} SET ref_count = ref_count - 1 WHERE id = $1 RETURNING *`,
    [blobId]
  );
  return rows[0];
}

async function deleteBlobIfUnused(blobId) {
  const { rows } = await pool.query(
    `DELETE FROM ${BLOBS} WHERE id = $1 AND ref_count <= 0 RETURNING *`,
    [blobId]
  );
  return rows[0];
}

async function createFile({ userId, folderId, blobId, originalName, mimeType, sizeBytes, isVideo }) {
  const q = `
    INSERT INTO ${FILES} (user_id, folder_id, blob_id, original_name, mime_type, size_bytes, is_video)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;
  const { rows } = await pool.query(q, [
    userId,
    folderId || null,
    blobId,
    originalName,
    mimeType || null,
    sizeBytes,
    !!isVideo,
  ]);
  return rows[0];
}

async function findById(id, userId = null) {
  let q = `
    SELECT f.*, b.sha256, b.encrypted_path
    FROM ${FILES} f
    JOIN ${BLOBS} b ON f.blob_id = b.id
    WHERE f.id = $1
  `;
  const params = [id];
  if (userId) {
    q += ' AND f.user_id = $2';
    params.push(userId);
  }
  const { rows } = await pool.query(q, params);
  return rows[0];
}

async function findByUserAndFolder(userId, folderId, includeTrashed = false) {
  let q = `
    SELECT f.*, b.sha256
    FROM ${FILES} f
    JOIN ${BLOBS} b ON f.blob_id = b.id
    WHERE f.user_id = $1
  `;
  const params = [userId];
  if (includeTrashed) {
    q += ' AND f.trashed_at IS NOT NULL';
  } else {
    q += ' AND f.trashed_at IS NULL';
    q += ' AND (($2::uuid IS NULL AND f.folder_id IS NULL) OR f.folder_id = $2)';
    params.push(folderId || null);
  }
  q += ' ORDER BY f.original_name';
  const { rows } = await pool.query(q, params);
  return rows;
}

async function update(id, userId, { originalName, folderId }) {
  const updates = [];
  const values = [];
  let i = 1;
  if (originalName !== undefined) {
    updates.push(`original_name = $${i++}`);
    values.push(originalName);
  }
  if (folderId !== undefined) {
    updates.push(`folder_id = $${i++}`);
    values.push(folderId);
  }
  if (updates.length === 0) return findById(id, userId);
  values.push(id, userId);
  const q = `
    UPDATE ${FILES} SET ${updates.join(', ')}
    WHERE id = $${i++} AND user_id = $${i}
    RETURNING *
  `;
  const { rows } = await pool.query(q, values);
  return rows[0];
}

async function setTrashed(fileId, userId, trashedAt) {
  const { rows } = await pool.query(
    `UPDATE ${FILES} SET trashed_at = $3 WHERE id = $1 AND user_id = $2 RETURNING *`,
    [fileId, userId, trashedAt]
  );
  return rows[0];
}

async function setCompressed(fileId, userId, isCompressed) {
  const { rows } = await pool.query(
    `UPDATE ${FILES} SET is_compressed = $3 WHERE id = $1 AND user_id = $2 RETURNING *`,
    [fileId, userId, isCompressed]
  );
  return rows[0];
}

async function remove(fileId, userId) {
  const { rows } = await pool.query(
    `DELETE FROM ${FILES} WHERE id = $1 AND user_id = $2 RETURNING *`,
    [fileId, userId]
  );
  return rows[0];
}

async function getTotalSizeByUser(userId) {
  const { rows } = await pool.query(
    `SELECT COALESCE(SUM(size_bytes), 0)::bigint AS total FROM ${FILES} WHERE user_id = $1 AND trashed_at IS NULL`,
    [userId]
  );
  return Number(rows[0].total);
}

async function listTrashedOlderThan(cutoffDate, limit = 200) {
  const { rows } = await pool.query(
    `SELECT f.id, f.user_id, f.blob_id, f.original_name, f.size_bytes, f.trashed_at
     FROM ${FILES} f
     WHERE f.trashed_at IS NOT NULL AND f.trashed_at < $1
     ORDER BY f.trashed_at ASC
     LIMIT $2`,
    [cutoffDate, limit]
  );
  return rows;
}

module.exports = {
  createBlob,
  getBlobBySha256,
  getBlobById,
  incrementBlobRefCount,
  decrementBlobRefCount,
  deleteBlobIfUnused,
  createFile,
  findById,
  findByUserAndFolder,
  update,
  setTrashed,
  setCompressed,
  remove,
  getTotalSizeByUser,
  listTrashedOlderThan,
};
