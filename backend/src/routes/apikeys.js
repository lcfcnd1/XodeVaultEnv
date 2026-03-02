const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// List all API keys for the authenticated user
router.get('/', (req, res) => {
  const keys = db.prepare(
    'SELECT id, label, key_prefix, created_at, last_used_at FROM api_keys WHERE user_id = ? ORDER BY created_at DESC'
  ).all(req.user.id);
  res.json(keys);
});

// Generate a new API key — returns the raw key ONCE, then only the hash is kept
router.post('/', async (req, res) => {
  const { label } = req.body;
  if (!label || !label.trim()) {
    return res.status(400).json({ error: 'Label is required' });
  }

  // Format: xv_ + 48 random bytes as hex (99 chars total)
  const rawKey = 'xv_' + crypto.randomBytes(48).toString('hex');
  const prefix = rawKey.slice(0, 13); // 'xv_' + first 10 hex chars — for fast DB lookup
  const key_hash = await bcrypt.hash(rawKey, 10);

  const result = db.prepare(
    'INSERT INTO api_keys (user_id, label, key_prefix, key_hash) VALUES (?, ?, ?, ?)'
  ).run(req.user.id, label.trim(), prefix, key_hash);

  res.status(201).json({
    id: result.lastInsertRowid,
    label: label.trim(),
    key_prefix: prefix,
    // Raw key returned only once — store it now, it cannot be recovered later
    raw_key: rawKey,
  });
});

// Revoke an API key
router.delete('/:id', (req, res) => {
  const row = db.prepare('SELECT id FROM api_keys WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: 'API key not found' });

  db.prepare('DELETE FROM api_keys WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
