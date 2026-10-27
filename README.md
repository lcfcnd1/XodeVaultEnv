# XodeVault

> **Zero-Knowledge, End-to-End Encrypted Developer Secrets Manager**

[![License: MIT](https://img.shields.io/badge/License-MIT-6366f1.svg)](LICENSE)
[![E2EE](https://img.shields.io/badge/Security-E2EE-22c55e.svg)](#cryptographic-architecture)
[![Self-Hosted](https://img.shields.io/badge/Deployment-Self--Hosted-f59e0b.svg)](#self-hosting)

XodeVault is a lightweight, open-source web application for developers to store and securely share environment variables (`.env` files) and code snippets — with **zero server-side knowledge** of your data.

---

## Features

- **True End-to-End Encryption** — AES-256-GCM with keys derived via PBKDF2 (310,000 iterations). The server only ever stores ciphertext.
- **Secure Human Sharing** — Share a `.env` via a URL. The decryption key lives in the URL hash (`#key=...`) and is never sent to the server.
- **Machine / CI-CD Sharing** — Zero-install CLI one-liners for Node.js and Python: `curl -s https://your-domain/api/cli/SHARE_ID | node - SHARE_KEY > .env` or `curl -s https://your-domain/api/cli/SHARE_ID/py | python3 - SHARE_KEY > .env`
- **Dark / Light Mode** — Persistent theme toggle.
- **English / Spanish (EN/ES)** — Full i18n support via `react-i18next`.
- **Expiring Shares** — Set shares to expire in 1h, 24h, 7d, 30d, or never.
- **Burn After Reading** — Shares auto-delete upon first access.
- **No File Uploads** — Text-only. Minimal VPS storage footprint.

---

## Cryptographic Architecture

### Zero-Knowledge Design

```
┌────────────────────────────────────────────────────────┐
│                   CLIENT (Browser)                     │
│                                                        │
│  Master Password ──► PBKDF2(310k) ──► VaultKey        │
│                                         │              │
│  Plaintext .env ──────────────────► AES-256-GCM       │
│                                         │              │
│                              ┌─────────▼────────┐     │
│                              │  ciphertext + iv │     │
└──────────────────────────────┴──────────┬───────┘     │
                                           │             
                               HTTP POST ──▼             
                               ┌───────────────────┐    
                               │   SERVER (SQLite) │    
                               │                   │    
                               │  Stores ONLY:     │    
                               │  • cipherHex      │    
                               │  • ivHex          │    
                               │  • NO plaintext   │    
                               │  • NO passwords   │    
                               │  • NO keys        │    
                               └───────────────────┘    
```

### Secure Sharing Flow

**Human (Web):**
1. Browser generates a random 256-bit `ShareKey`.
2. Content is re-encrypted with `ShareKey` using AES-256-GCM.
3. Encrypted blob is sent to `/api/share` → server returns `share_id`.
4. URL is assembled: `https://domain/share/{share_id}#key={ShareKey_hex}`
5. Recipient's browser extracts `#key` from the hash (never sent in HTTP requests).
6. Browser fetches the encrypted blob, decrypts it locally. **Server never sees the key.**

**Machine (CLI):**
```bash
curl -s https://your-domain/api/cli/SHARE_ID | node - SHARE_KEY > .env
curl -s https://your-domain/api/cli/SHARE_ID/py | python3 - SHARE_KEY > .env
```
- `/api/cli/:id` returns a self-contained Node.js script as plain text.
- `/api/cli/:id/py` returns a self-contained Python 3.9+ script as plain text with a pure-Python AES-256-GCM implementation.
- The script runs entirely on your machine, fetches the encrypted blob from `/api/share/:id`, and decrypts it using the `SHARE_KEY` argument.
- **No data is sent back to any server.** Decryption is local-only.

### Cryptographic Primitives

| Primitive | Algorithm | Strength |
|-----------|-----------|----------|
| Key Derivation | PBKDF2-SHA256 | 310,000 iterations |
| Encryption | AES-256-GCM | 256-bit keys, 96-bit IV |
| Authentication | HMAC-SHA256 (via JWT) | Server-side only |
| Password Hashing | bcrypt | Cost factor 12 |
| Share Keys | `crypto.getRandomValues` | 256-bit CSPRNG |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TailwindCSS |
| i18n | react-i18next (EN/ES) |
| Icons | lucide-react |
| Backend | Node.js, Express.js |
| Database | SQLite via better-sqlite3 |
| Auth | JWT + bcrypt |
| Crypto (client) | Web Crypto API (native browser) |

---

## Project Structure

```
XodeVault/
├── backend/
│   ├── src/
│   │   ├── server.js          # Express app entry point
│   │   ├── db.js              # SQLite schema & connection
│   │   ├── middleware/
│   │   │   └── auth.js        # JWT middleware
│   │   └── routes/
│   │       ├── auth.js        # POST /api/auth/register|login
│   │       ├── secrets.js     # CRUD /api/secrets (JWT protected)
│   │       ├── share.js       # POST/GET /api/share
│   │       └── cli.js         # GET /api/cli/:id (script generator)
│   ├── data/                  # SQLite database file (auto-created)
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── contexts/
    │   │   ├── ThemeContext.jsx
    │   │   └── AuthContext.jsx
    │   ├── utils/
    │   │   ├── cryptoUtils.js  # PBKDF2, AES-GCM, ShareKey
    │   │   ├── api.js          # REST client
    │   │   └── i18n.js         # i18next setup
    │   ├── locales/
    │   │   ├── en.json
    │   │   └── es.json
    │   ├── components/
    │   │   ├── Navbar.jsx
    │   │   └── ShareModal.jsx
    │   ├── pages/
    │   │   ├── LoginPage.jsx
    │   │   ├── DashboardPage.jsx
    │   │   ├── EditorPage.jsx
    │   │   └── SharedViewPage.jsx
    │   ├── App.jsx
    │   └── main.jsx
    └── package.json
```

---

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | — | Create account |
| POST | `/api/auth/login` | — | Get JWT |
| GET | `/api/secrets` | JWT | List secrets (titles only, encrypted) |
| GET | `/api/secrets/:id` | JWT | Get a secret (encrypted) |
| POST | `/api/secrets` | JWT | Create secret |
| PUT | `/api/secrets/:id` | JWT | Update secret |
| DELETE | `/api/secrets/:id` | JWT | Delete secret |
| POST | `/api/share` | JWT | Create a shared secret |
| GET | `/api/share/:id` | — | Get encrypted share payload |
| GET | `/api/cli/:id` | — | Get self-contained Node.js decryptor script |
| GET | `/api/cli/:id/py` | — | Get self-contained Python 3 decryptor script |

---

## Self-Hosting

See [QUICKSTART.md](QUICKSTART.md) for a step-by-step VPS deployment guide using PM2.

Set `BASE_URL` to the public origin used in generated CLI URLs; when unset, it defaults to `http://localhost:3000`.

---

## Security Model & Limitations

- **The master password is never transmitted.** It is used only to derive the VaultKey in the browser.
- **If you forget your master password, all data is permanently unrecoverable.** There is no password reset.
- **Transport security:** Always serve XodeVault over HTTPS in production. The security of the URL-hash sharing mechanism depends on TLS.
- **The server admin has no access to your plaintext.** The admin can see ciphertext blobs and IVs but cannot decrypt them without the master password.

---

## License

MIT © XodeVault Contributors
