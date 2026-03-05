require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const secretsRoutes = require('./routes/secrets');
const shareRoutes = require('./routes/share');
const cliRoutes = require('./routes/cli');
const apiKeysRoutes = require('./routes/apikeys');
const ingestRoutes = require('./routes/ingest');
const adminRoutes = require('./routes/admin');
const { authLimiter, writeLimiter, readLimiter, ingestLimiter } = require('./middleware/rateLimit');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust the first hop from the reverse proxy (Nginx) so that
// req.protocol, req.ip, and X-Forwarded-* headers are correct.
app.set('trust proxy', 1);

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
// Plaintext limit: 3 MB. AES-GCM hex encoding is ~2× the plaintext size,
// so the JSON body can be up to ~7 MB. We validate the plaintext size in each route.
app.use(express.json({ limit: '8mb' }));

app.get('/health', (req, res) => res.json({ status: 'ok', app: 'XodeVault' }));

app.use('/api/auth',    authLimiter,   authRoutes);
app.use('/api/secrets', writeLimiter,  secretsRoutes);
app.use('/api/share',   writeLimiter,  shareRoutes);
app.use('/api/cli',     readLimiter,   cliRoutes);
app.use('/api/keys',    writeLimiter,  apiKeysRoutes);
app.use('/api/ingest',  ingestLimiter, ingestRoutes);
app.use('/api/admin',  adminRoutes);

// Serve static frontend in production
const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
const fs = require('fs');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`XodeVault backend running on http://localhost:${PORT}`);
});

module.exports = app;
