const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

// List all active shares for the authenticated user
router.get('/', authMiddleware, (req, res) => {
  const rows = db.prepare(
    'SELECT id, label, expires_at, burn_after_reading, created_at FROM shared_secrets WHERE user_id = ? ORDER BY created_at DESC'
  ).all(req.user.id);

  const now = Date.now();
  const active = rows.filter((r) => !r.expires_at || now <= r.expires_at);

  // Clean up expired ones
  const expired = rows.filter((r) => r.expires_at && now > r.expires_at);
  if (expired.length) {
    const del = db.prepare('DELETE FROM shared_secrets WHERE id = ?');
    expired.forEach((r) => del.run(r.id));
  }

  res.json(active);
});

// Create a shared secret (authenticated)
router.post('/', authMiddleware, (req, res) => {
  const { content, iv, expires_in_hours, burn_after_reading, label } = req.body;
  if (!content || !iv) {
    return res.status(400).json({ error: 'content and iv are required' });
  }

  const id = uuidv4();
  const expires_at = expires_in_hours
    ? Date.now() + expires_in_hours * 60 * 60 * 1000
    : null;
  const burn = burn_after_reading ? 1 : 0;

  db.prepare(
    'INSERT INTO shared_secrets (id, user_id, label, content, iv, expires_at, burn_after_reading) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, req.user.id, label || null, content, iv, expires_at, burn);

  res.status(201).json({ id });
});

// Get a shared secret (public — no auth)
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM shared_secrets WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Share not found or expired' });

  if (row.expires_at && Date.now() > row.expires_at) {
    db.prepare('DELETE FROM shared_secrets WHERE id = ?').run(req.params.id);
    return res.status(410).json({ error: 'This share has expired' });
  }

  const payload = { content: row.content, iv: row.iv };

  if (row.burn_after_reading) {
    db.prepare('DELETE FROM shared_secrets WHERE id = ?').run(req.params.id);
  }

  res.json(payload);
});

// Delete a share (authenticated — only owner)
router.delete('/:id', authMiddleware, (req, res) => {
  const row = db.prepare('SELECT id FROM shared_secrets WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: 'Share not found' });

  db.prepare('DELETE FROM shared_secrets WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
