const express = require('express');
const router = express.Router();
const db = require('../db');
const { apiKeyMiddleware } = require('../middleware/apiKey');

// POST /api/ingest — push a new encrypted secret
router.post('/', apiKeyMiddleware, (req, res) => {
  const { title, content, iv } = req.body;
  if (!title || !content || !iv) {
    return res.status(400).json({
      error: 'title, content, and iv are required',
      hint: 'iv format: "titleIV_hex|contentIV_hex"',
    });
  }
  if (!iv.includes('|')) {
    return res.status(400).json({
      error: 'Invalid iv format',
      hint: 'iv must be "titleIV_hex|contentIV_hex"',
    });
  }
  const result = db.prepare(
    'INSERT INTO secrets (user_id, title, content, iv) VALUES (?, ?, ?, ?)'
  ).run(req.apiUser.id, title, content, iv);

  res.status(201).json({ id: result.lastInsertRowid });
});

// GET /api/ingest — list secret IDs and dates (no ciphertext exposed in list)
router.get('/', apiKeyMiddleware, (req, res) => {
  const secrets = db.prepare(
    'SELECT id, created_at FROM secrets WHERE user_id = ? ORDER BY created_at DESC'
  ).all(req.apiUser.id);
  res.json(secrets);
});

// GET /api/ingest/:id — return the encrypted payload (for use by download scripts)
router.get('/:id/data', apiKeyMiddleware, (req, res) => {
  const row = db.prepare(
    'SELECT id, title, content, iv, created_at FROM secrets WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.apiUser.id);
  if (!row) return res.status(404).json({ error: 'Secret not found' });
  res.json(row);
});

// GET /api/ingest/:id/download?lang=node|python
// Returns a self-contained script that fetches and decrypts the secret locally
router.get('/:id/download', apiKeyMiddleware, (req, res) => {
  const secretId = req.params.id;
  const lang = (req.query.lang || 'node').toLowerCase();
  const baseUrl = `${req.get('x-forwarded-proto') || req.protocol}://${req.get('host')}`;

  // Verify secret belongs to user
  const row = db.prepare(
    'SELECT id FROM secrets WHERE id = ? AND user_id = ?'
  ).get(secretId, req.apiUser.id);
  if (!row) return res.status(404).json({ error: 'Secret not found' });

  const apiKey = req.headers['x-api-key'];

  if (lang === 'python') {
    const script = buildPythonScript(baseUrl, secretId, apiKey);
    res.setHeader('Content-Type', 'text/x-python; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="xodevault_${secretId.slice(0,8)}.py"`);
    return res.send(script);
  }

  const script = buildNodeScript(baseUrl, secretId, apiKey);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="xodevault_${secretId.slice(0,8)}.js"`);
  res.send(script);
});

// ── Script generators ────────────────────────────────────────────────────────

function buildNodeScript(baseUrl, secretId, apiKey) {
  return `#!/usr/bin/env node
// XodeVault Secret Downloader — Node.js
// Auto-generated. Decryption runs entirely on your machine.
// Usage: node script.js <USERNAME> <MASTER_PASSWORD> [> output.env]
'use strict';

const https   = require('https');
const http    = require('http');
const crypto  = require('crypto');

const SECRET_ID = ${JSON.stringify(secretId)};
const API_KEY   = ${JSON.stringify(apiKey)};
const BASE_URL  = ${JSON.stringify(baseUrl)};

const [,, USERNAME, MASTER_PASSWORD] = process.argv;
if (!USERNAME || !MASTER_PASSWORD) {
  console.error('Usage: node script.js <USERNAME> <MASTER_PASSWORD>');
  process.exit(1);
}

function fetchJSON(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode === 404) return reject(new Error('Secret not found'));
        try { resolve(JSON.parse(data)); } catch { reject(new Error('Bad JSON: ' + data)); }
      });
    }).on('error', reject);
  });
}

function deriveKey(password, username) {
  const salt = Buffer.from(username.padEnd(16, '0').slice(0, 16), 'utf8');
  return new Promise((res, rej) =>
    crypto.pbkdf2(password, salt, 310_000, 32, 'sha256', (e, k) => e ? rej(e) : res(k))
  );
}

function decryptField(cipherHex, ivHex, keyBuf) {
  const iv        = Buffer.from(ivHex, 'hex');
  const raw       = Buffer.from(cipherHex, 'hex');
  const authTag   = raw.slice(raw.length - 16);
  const cipher    = raw.slice(0, raw.length - 16);
  const decipher  = crypto.createDecipheriv('aes-256-gcm', keyBuf, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(cipher), decipher.final()]).toString('utf8');
}

(async () => {
  try {
    process.stderr.write('[XodeVault] Deriving vault key from master password...\\n');
    const keyBuf = await deriveKey(MASTER_PASSWORD, USERNAME);

    process.stderr.write('[XodeVault] Fetching encrypted secret...\\n');
    const data = await fetchJSON(BASE_URL + '/api/ingest/' + SECRET_ID + '/data', {
      'X-Api-Key': API_KEY,
    });

    process.stderr.write('[XodeVault] Decrypting locally...\\n');
    const [titleIV, contentIV] = data.iv.split('|');
    const title   = decryptField(data.title,   titleIV,   keyBuf);
    const content = decryptField(data.content, contentIV, keyBuf);

    process.stderr.write('[XodeVault] Secret: ' + title + '\\n');
    process.stdout.write(content);
    process.stderr.write('\\n[XodeVault] Done.\\n');
  } catch (err) {
    console.error('[XodeVault] Error:', err.message);
    process.exit(1);
  }
})();
`;
}

function buildPythonScript(baseUrl, secretId, apiKey) {
  return `#!/usr/bin/env python3
"""
XodeVault Secret Downloader — Python 3
Auto-generated. Decryption runs entirely on your machine.
Usage: python3 script.py <USERNAME> <MASTER_PASSWORD> [> output.env]

Requires: pip install cryptography
"""
import sys, json, hashlib, urllib.request
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

SECRET_ID = ${JSON.stringify(secretId)}
API_KEY   = ${JSON.stringify(apiKey)}
BASE_URL  = ${JSON.stringify(baseUrl)}

def usage():
    print("Usage: python3 script.py <USERNAME> <MASTER_PASSWORD>", file=sys.stderr)
    sys.exit(1)

if len(sys.argv) < 3:
    usage()

USERNAME, MASTER_PASSWORD = sys.argv[1], sys.argv[2]

def derive_key(password: str, username: str) -> bytes:
    salt = username.ljust(16, "0")[:16].encode("utf-8")
    return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 310_000, dklen=32)

def decrypt_field(cipher_hex: str, iv_hex: str, key: bytes) -> str:
    iv  = bytes.fromhex(iv_hex)
    raw = bytes.fromhex(cipher_hex)
    # AES-GCM: last 16 bytes are the auth tag
    ciphertext = raw[:-16]
    tag        = raw[-16:]
    aesgcm = AESGCM(key)
    return aesgcm.decrypt(iv, ciphertext + tag, None).decode("utf-8")

def fetch_json(url: str, headers: dict) -> dict:
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

if __name__ == "__main__":
    print("[XodeVault] Deriving vault key...", file=sys.stderr)
    key = derive_key(MASTER_PASSWORD, USERNAME)

    print("[XodeVault] Fetching encrypted secret...", file=sys.stderr)
    data = fetch_json(
        BASE_URL + "/api/ingest/" + SECRET_ID + "/data",
        {"X-Api-Key": API_KEY},
    )

    print("[XodeVault] Decrypting locally...", file=sys.stderr)
    title_iv, content_iv = data["iv"].split("|")
    title   = decrypt_field(data["title"],   title_iv,   key)
    content = decrypt_field(data["content"], content_iv, key)

    print(f"[XodeVault] Secret: {title}", file=sys.stderr)
    sys.stdout.write(content)
    print("\\n[XodeVault] Done.", file=sys.stderr)
`;
}

module.exports = router;
