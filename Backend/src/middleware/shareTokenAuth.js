const Share = require('../models/Share');
const bcrypt = require('bcrypt');

/**
 * Validates share token (and optional password). For folder shares, sets req.shareUserId, req.shareFolderId, req.share.
 * For file-only shares returns 403 (upload not allowed).
 */
async function shareTokenAuth(req, res, next) {
  try {
    const { token } = req.params;
    const password = req.body?.password ?? req.query?.password;

    const share = await Share.findByToken(token);
    if (!share) {
      return res.status(404).json({ error: 'Share not found or expired' });
    }

    if (share.password_hash) {
      if (!password) {
        return res.status(400).json({ error: 'Password required', requiresPassword: true });
      }
      const valid = await bcrypt.compare(password, share.password_hash);
      if (!valid) {
        return res.status(403).json({ error: 'Invalid password' });
      }
    }

    if (!share.folder_id) {
      return res.status(403).json({ error: 'Upload is only allowed for shared folders' });
    }

    req.share = share;
    req.shareUserId = share.user_id;
    req.shareFolderId = share.folder_id;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { shareTokenAuth };
