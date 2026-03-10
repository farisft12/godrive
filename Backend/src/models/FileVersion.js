const { pool } = require('../config/database');

const TABLE = 'file_versions';

async function create(fileId, blobId, versionNumber) {
  const { rows } = await pool.query(
    `INSERT INTO ${TABLE} (file_id, blob_id, version_number) VALUES ($1, $2, $3) RETURNING *`,
    [fileId, blobId, versionNumber]
  );
  return rows[0];
}

async function findByFileId(fileId) {
  const { rows } = await pool.query(
    `SELECT * FROM ${TABLE} WHERE file_id = $1 ORDER BY version_number DESC`,
    [fileId]
  );
  return rows;
}

module.exports = { create, findByFileId };
