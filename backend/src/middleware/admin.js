const { authMiddleware } = require('./auth');

function adminMiddleware(req, res, next) {
  authMiddleware(req, res, () => {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
      return res.status(403).json({ error: 'Admin access is not configured on this server.' });
    }
    if (req.user.username !== adminEmail) {
      return res.status(403).json({ error: 'Forbidden: admin only.' });
    }
    next();
  });
}

module.exports = { adminMiddleware };
