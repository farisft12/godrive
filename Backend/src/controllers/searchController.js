const { pool } = require('../config/database');

async function search(req, res, next) {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json({ files: [], folders: [] });

    const pattern = `%${q.replace(/%/g, '\\%').replace(/_/g, '\\_')}%`;
    const userId = req.userId;

    const filesResult = await pool.query(
      `SELECT f.id, f.original_name, f.mime_type, f.size_bytes, f.folder_id, f.created_at
       FROM files f
       WHERE f.user_id = $1 AND f.trashed_at IS NULL
         AND (f.original_name ILIKE $2 OR f.mime_type ILIKE $2)
       ORDER BY f.original_name
       LIMIT 50`,
      [userId, pattern]
    );

    const foldersResult = await pool.query(
      `SELECT id, name, parent_id, created_at
       FROM folders
       WHERE user_id = $1 AND name ILIKE $2
       ORDER BY name
       LIMIT 50`,
      [userId, pattern]
    );

    res.json({
      files: filesResult.rows,
      folders: foldersResult.rows,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { search };
