# XodeVault — Quick Start Guide (VPS / Self-Hosting)

This guide covers deploying XodeVault on a fresh Ubuntu/Debian VPS using **PM2** as the process manager.

---

## Prerequisites

- Ubuntu 20.04+ / Debian 11+ VPS
- Node.js 18+ and npm
- A domain name pointed to your server's IP
- (Recommended) Nginx as a reverse proxy

---

## Step 1 — Clone & Install

```bash
git clone https://github.com/lcfcnd1/XodeVaultEnv.git
cd xodevault

# Install backend dependencies
cd backend && npm install --production
cd ..

# Install frontend dependencies and build
cd frontend && npm install && npm run build
cd ..
```

---

## Step 2 — Configure Environment

```bash
cd backend
cp .env.example .env
nano .env
```

Edit the `.env` file:

```env
PORT=3001
JWT_SECRET=CHANGE_THIS_TO_A_LONG_RANDOM_STRING_AT_LEAST_64_CHARS
FRONTEND_URL=https://your-domain.com
```

> **Security:** Generate a strong JWT secret:
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```

---

## Step 3 — Install PM2 & Start the App

```bash
npm install -g pm2

# Start the backend (which also serves the built frontend)
cd /path/to/xodevault/backend
pm2 start src/server.js --name xodevault

# Save PM2 process list and enable autostart on reboot
pm2 save
pm2 startup
```

Follow the output of `pm2 startup` and run the generated command with `sudo`.

---

## Step 4 — Configure Nginx (Reverse Proxy)

```bash
sudo apt install nginx -y
sudo nano /etc/nginx/sites-available/xodevault
```

Paste this configuration (replace `your-domain.com`):

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Redirect all HTTP to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    client_max_body_size 4m;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/xodevault /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## Step 5 — Enable HTTPS with Certbot

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

Follow the prompts. Certbot will automatically renew certificates.

---

## Step 6 — Verify Deployment

```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs xodevault

# Test the health endpoint
curl https://your-domain.com/health
# Expected: {"status":"ok","app":"XodeVault"}
```

Visit `https://your-domain.com` in your browser and create your first account.

---

## Updating XodeVault

```bash
cd /path/to/xodevault
git pull

# Rebuild frontend
cd frontend && npm install && npm run build && cd ..

# Restart backend
cd backend && npm install --production
pm2 restart xodevault
```

---

## Backup the Database

The SQLite database is located at `backend/data/xodevault.db`.

```bash
# Simple backup
cp backend/data/xodevault.db /backups/xodevault-$(date +%Y%m%d).db

# Or add to a cron job
crontab -e
# Add: 0 3 * * * cp /path/to/xodevault/backend/data/xodevault.db /backups/xodevault-$(date +\%Y\%m\%d).db
```

---

## Useful PM2 Commands

```bash
pm2 status            # Show all processes
pm2 logs xodevault    # View live logs
pm2 restart xodevault # Restart the app
pm2 stop xodevault    # Stop the app
pm2 delete xodevault  # Remove from PM2
```

---

## Security Checklist

- [ ] Changed `JWT_SECRET` to a random 64-char string
- [ ] HTTPS enabled via Certbot
- [ ] Nginx firewall configured (only ports 80, 443, 22 open)
- [ ] `ufw` enabled: `sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full' && sudo ufw enable`
- [ ] Regular database backups scheduled
- [ ] Node.js running as a non-root user

---

For questions and issues, open a GitHub Issue on the repository.
