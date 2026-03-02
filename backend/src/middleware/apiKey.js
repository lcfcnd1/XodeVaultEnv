const bcrypt = require('bcryptjs');
const db = require('../db');

async function apiKeyMiddleware(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!key || !key.startsWith('xv_')) {
    return res.status(401).json({ error: 'Missing or invalid API key. Send it as X-Api-Key header.' });
  }

  // The prefix (first 10 chars after xv_) is stored in plaintext for fast lookup
  const prefix = key.slice(0, 13); // 'xv_' + 10 chars
  const rows = db.prepare('SELECT * FROM api_keys WHERE key_prefix = ?').all(prefix);

  let matched = null;
  for (const row of rows) {
    if (await bcrypt.compare(key, row.key_hash)) {
      matched = row;
      break;
    }
  }

  if (!matched) {
    return res.status(401).json({ error: 'Invalid API key.' });
  }

  // Update last_used_at
  db.prepare('UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?').run(matched.id);

  req.apiUser = { id: matched.user_id, apiKeyId: matched.id };
  next();
}

module.exports = { apiKeyMiddleware };
