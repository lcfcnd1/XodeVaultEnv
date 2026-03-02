const express = require('express');
const router = express.Router();

// Returns a self-contained Node.js script that fetches and decrypts the secret
// Usage: curl -s https://domain/api/cli/SHARE_ID | node - SHARE_KEY > .env
router.get('/:id', (req, res) => {
  const shareId = req.params.id;
  // Behind a reverse proxy (Nginx), req.protocol is always 'http'.
  // X-Forwarded-Proto contains the original scheme used by the client.
  const proto = req.get('x-forwarded-proto') || req.protocol;
  const baseUrl = `${proto}://${req.get('host')}`;

  const script = `#!/usr/bin/env node
// XodeVault CLI Decryptor - Zero-Knowledge E2EE
// Auto-generated. Runs entirely on your machine. No data is sent anywhere.
'use strict';

const https = require('https');
const http = require('http');
const crypto = require('crypto');

const SHARE_ID = ${JSON.stringify(shareId)};
const BASE_URL = ${JSON.stringify(baseUrl)};
const shareKey = process.argv[2];

if (!shareKey) {
  console.error('[XodeVault] Error: ShareKey is required.');
  console.error('Usage: curl -s ' + BASE_URL + '/api/cli/' + SHARE_ID + ' | node - <ShareKey> > .env');
  process.exit(1);
}

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Invalid JSON from server: ' + data)); }
      });
    }).on('error', reject);
  });
}

async function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

async function importKey(hexKey) {
  const keyBytes = await hexToBytes(hexKey);
  const keyBuffer = Buffer.from(keyBytes);
  return crypto.createSecretKey(keyBuffer);
}

async function decryptAESGCM(encryptedHex, ivHex, keyHex) {
  const keyBytes = Buffer.from(await hexToBytes(keyHex));
  const iv = Buffer.from(await hexToBytes(ivHex));
  const encrypted = Buffer.from(await hexToBytes(encryptedHex));

  // AES-GCM: last 16 bytes are the auth tag
  const authTag = encrypted.slice(encrypted.length - 16);
  const ciphertext = encrypted.slice(0, encrypted.length - 16);

  const decipher = crypto.createDecipheriv('aes-256-gcm', keyBytes, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

(async () => {
  try {
    process.stderr.write('[XodeVault] Fetching encrypted payload...\\n');
    const data = await fetchJSON(BASE_URL + '/api/share/' + SHARE_ID);

    if (data.error) {
      console.error('[XodeVault] Server error: ' + data.error);
      process.exit(1);
    }

    process.stderr.write('[XodeVault] Decrypting locally with your ShareKey...\\n');
    const plaintext = await decryptAESGCM(data.content, data.iv, shareKey);

    process.stdout.write(plaintext);
    process.stderr.write('\\n[XodeVault] Done. Decryption successful.\\n');
  } catch (err) {
    console.error('[XodeVault] Decryption failed: ' + err.message);
    process.exit(1);
  }
})();
`;

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(script);
});

module.exports = router;
