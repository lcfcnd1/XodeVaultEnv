const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', (req, res) => {
  const secrets = db.prepare(
    'SELECT id, title, iv, created_at FROM secrets WHERE user_id = ? ORDER BY created_at DESC'
  ).all(req.user.id);
  res.json(secrets);
});

router.get('/:id', (req, res) => {
  const secret = db.prepare(
    'SELECT * FROM secrets WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.user.id);
  if (!secret) return res.status(404).json({ error: 'Secret not found' });
  res.json(secret);
});

router.post('/', (req, res) => {
  const { title, content, iv } = req.body;
  if (!title || !content || !iv) {
    return res.status(400).json({ error: 'title, content, and iv are required' });
  }
  const result = db.prepare(
    'INSERT INTO secrets (user_id, title, content, iv) VALUES (?, ?, ?, ?)'
  ).run(req.user.id, title, content, iv);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const { title, content, iv } = req.body;
  const secret = db.prepare(
    'SELECT id FROM secrets WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.user.id);
  if (!secret) return res.status(404).json({ error: 'Secret not found' });

  db.prepare(
    'UPDATE secrets SET title = ?, content = ?, iv = ? WHERE id = ?'
  ).run(title, content, iv, req.params.id);
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  const secret = db.prepare(
    'SELECT id FROM secrets WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.user.id);
  if (!secret) return res.status(404).json({ error: 'Secret not found' });

  db.prepare('DELETE FROM secrets WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
