# December EC2 Deployment Guide

This directory contains configuration files and scripts to deploy `@december/server` and `@december/worker` on AWS EC2.

---

## 1. Quick Start with Docker (Recommended)

From the repo root on your EC2 instance:

```bash
# 1. Copy production env template and populate secrets
cp infra/ec2/env.production.example .env.production
nano .env.production

# 2. Build and start all services (Postgres, Redis, DB Migrations, Server, Worker)
docker compose -f docker-compose.prod.yml up -d --build

# 3. View live logs
docker compose -f docker-compose.prod.yml logs -f server worker
```

---

## 2. Bare-Metal / Systemd Deployment

### Step 1: Initial Host Setup
Run the setup script on a fresh Ubuntu EC2 instance:
```bash
bash infra/ec2/setup-ec2.sh
```

### Step 2: Configure Environment
```bash
cp infra/ec2/env.production.example /var/www/december/.env.production
nano /var/www/december/.env.production
```

### Step 3: Run Deployment
```bash
bash /var/www/december/infra/ec2/deploy.sh
```

### Step 4: SSL Setup (Let's Encrypt)
```bash
sudo certbot --nginx -d api.yourdomain.com
```

---

## 3. Useful Operations Commands

- **Check Server Status:** `sudo systemctl status december-server`
- **Check Worker Status:** `sudo systemctl status december-worker`
- **View Server Logs:** `sudo journalctl -u december-server -f`
- **View Worker Logs:** `sudo journalctl -u december-worker -f`
- **Restart Services:** `sudo systemctl restart december-server december-worker`
