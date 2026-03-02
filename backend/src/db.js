const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'xodevault.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    auth_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS secrets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    iv TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS shared_secrets (
    id TEXT PRIMARY KEY,
    user_id INTEGER,
    label TEXT,
    content TEXT NOT NULL,
    iv TEXT NOT NULL,
    expires_at INTEGER,
    burn_after_reading INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migrate: add user_id and label columns if they don't exist yet
const cols = db.pragma('table_info(shared_secrets)').map((c) => c.name);
if (!cols.includes('user_id')) db.exec('ALTER TABLE shared_secrets ADD COLUMN user_id INTEGER');
if (!cols.includes('label'))   db.exec('ALTER TABLE shared_secrets ADD COLUMN label TEXT');

module.exports = db;
