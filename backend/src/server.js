require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const secretsRoutes = require('./routes/secrets');
const shareRoutes = require('./routes/share');
const cliRoutes = require('./routes/cli');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));

app.get('/health', (req, res) => res.json({ status: 'ok', app: 'XodeVault' }));

app.use('/api/auth', authRoutes);
app.use('/api/secrets', secretsRoutes);
app.use('/api/share', shareRoutes);
app.use('/api/cli', cliRoutes);

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
