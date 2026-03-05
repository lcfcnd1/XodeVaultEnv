const express = require('express');
const router = express.Router();
const db = require('../db');
const { adminMiddleware } = require('../middleware/admin');

// GET /api/admin/users — list all users with stats
router.get('/users', adminMiddleware, (req, res) => {
  const users = db.prepare(`
    SELECT
      u.id,
      u.username,
      u.created_at,
      COUNT(DISTINCT s.id)  AS secret_count,
      COUNT(DISTINCT k.id)  AS apikey_count,
      COALESCE(SUM(LENGTH(s.title) + LENGTH(s.content) + LENGTH(s.iv)), 0) AS disk_bytes
    FROM users u
    LEFT JOIN secrets s ON s.user_id = u.id
    LEFT JOIN api_keys k ON k.user_id = u.id
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `).all();

  res.json(users);
});

// DELETE /api/admin/users/:id — delete user and all associated data
router.delete('/users/:id', adminMiddleware, (req, res) => {
  const { id } = req.params;

  const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(id);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  // Prevent admin from deleting themselves
  if (user.username === process.env.ADMIN_EMAIL) {
    return res.status(400).json({ error: 'Cannot delete the admin account.' });
  }

  // CASCADE deletes secrets, api_keys via FK; shared_secrets have no FK so clean manually
  db.prepare('DELETE FROM shared_secrets WHERE user_id = ?').run(id);
  db.prepare('DELETE FROM users WHERE id = ?').run(id);

  res.json({ success: true });
});

module.exports = router;
