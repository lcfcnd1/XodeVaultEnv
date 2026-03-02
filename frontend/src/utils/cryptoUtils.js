/**
 * XodeVault Cryptography Module
 * All operations run exclusively in the browser using the Web Crypto API.
 * The server NEVER receives plaintext or keys — Zero-Knowledge by design.
 */

const PBKDF2_ITERATIONS = 310000;
const AES_KEY_LENGTH = 256;

// --- Helpers ---

export function bufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function hexToBuffer(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes.buffer;
}

export function bufferToBase64(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

export function base64ToBuffer(b64) {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer;
}

// --- Key Derivation ---

/**
 * Derives an AES-GCM CryptoKey from a master password using PBKDF2.
 * @param {string} password - The user's master password
 * @param {string} [saltHex] - Hex-encoded salt (generated if not provided)
 * @returns {{ key: CryptoKey, saltHex: string }}
 */
export async function deriveKey(password, saltHex) {
  const enc = new TextEncoder();
  const salt = saltHex
    ? new Uint8Array(hexToBuffer(saltHex))
    : crypto.getRandomValues(new Uint8Array(16));

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: AES_KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  );

  return { key, saltHex: bufferToHex(salt) };
}

// --- Encryption ---

/**
 * Encrypts plaintext with AES-GCM.
 * @param {string} plaintext
 * @param {CryptoKey} key
 * @returns {{ cipherHex: string, ivHex: string }}
 */
export async function encrypt(plaintext, key) {
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext)
  );

  return {
    cipherHex: bufferToHex(cipherBuffer),
    ivHex: bufferToHex(iv),
  };
}

// --- Decryption ---

/**
 * Decrypts an AES-GCM ciphertext.
 * @param {string} cipherHex
 * @param {string} ivHex
 * @param {CryptoKey} key
 * @returns {string} plaintext
 */
export async function decrypt(cipherHex, ivHex, key) {
  const iv = new Uint8Array(hexToBuffer(ivHex));
  const cipherBuffer = hexToBuffer(cipherHex);

  const plainBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    cipherBuffer
  );

  return new TextDecoder().decode(plainBuffer);
}

// --- Share Key Generation ---

/**
 * Generates a random 256-bit AES-GCM key for sharing.
 * @returns {{ key: CryptoKey, keyHex: string }}
 */
export async function generateShareKey() {
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: AES_KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  );
  const rawKey = await crypto.subtle.exportKey('raw', key);
  return { key, keyHex: bufferToHex(rawKey) };
}

/**
 * Imports a raw hex key as an AES-GCM CryptoKey.
 * @param {string} keyHex
 * @returns {CryptoKey}
 */
export async function importShareKey(keyHex) {
  const keyBuffer = hexToBuffer(keyHex);
  return crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM', length: AES_KEY_LENGTH },
    false,
    ['decrypt']
  );
}
