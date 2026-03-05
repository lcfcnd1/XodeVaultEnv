const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { JWT_SECRET } = require('../middleware/auth');

router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  if (username.length < 3 || password.length < 8) {
    return res.status(400).json({ error: 'Username min 3 chars, password min 8 chars' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(409).json({ error: 'Username already taken' });
  }

  const salt = await bcrypt.genSalt(12);
  const auth_hash = await bcrypt.hash(password, salt);

  try {
    const stmt = db.prepare('INSERT INTO users (username, auth_hash, salt) VALUES (?, ?, ?)');
    const result = stmt.run(username, auth_hash, salt);
    const token = jwt.sign({ id: result.lastInsertRowid, username }, JWT_SECRET, { expiresIn: '7d' });
    const isAdmin = process.env.ADMIN_EMAIL ? username === process.env.ADMIN_EMAIL : false;
    res.status(201).json({ token, username, isAdmin });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, user.auth_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
  const isAdmin = process.env.ADMIN_EMAIL ? user.username === process.env.ADMIN_EMAIL : false;
  res.json({ token, username: user.username, isAdmin });
});

module.exports = router;
