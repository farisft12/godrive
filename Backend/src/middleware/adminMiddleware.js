/**
 * Require the authenticated user to have role 'admin'.
 * Must be used after authMiddleware.
 */
function adminMiddleware(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ error: 'Admin access required' });
}

module.exports = { adminMiddleware };
