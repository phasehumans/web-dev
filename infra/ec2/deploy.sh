#!/usr/bin/env bash
set -euo pipefail

echo "=================================================="
echo "December EC2 Zero-Downtime Deployment Script"
echo "=================================================="

APP_DIR="/var/www/december"
cd "$APP_DIR"

# 1. Pull latest git changes (if git repo)
if [ -d ".git" ]; then
    echo "[1/5] Pulling latest changes from Git..."
    git pull origin main || echo "Git pull skipped or on custom branch"
fi

# 2. Install workspace dependencies
echo "[2/5] Installing dependencies with Bun..."
bun install --frozen-lockfile

# 3. Generate Prisma client and deploy migrations
echo "[3/5] Generating Prisma client and applying database migrations..."
bun --cwd packages/database db:generate
bun --cwd packages/database prisma migrate deploy

# 4. Restart Services
echo "[4/5] Restarting Server and Worker services..."
sudo systemctl daemon-reload
sudo systemctl restart december-server
sudo systemctl restart december-worker

# 5. Verify Health Check
echo "[5/5] Verifying server health status..."
sleep 2
for i in {1..10}; do
    if curl -s -f http://127.0.0.1:4000/health > /dev/null; then
        echo "Server is healthy!"
        curl -s http://127.0.0.1:4000/health | jq . || curl -s http://127.0.0.1:4000/health
        echo ""
        echo "Deployment completed successfully!"
        exit 0
    fi
    echo "Waiting for server to become healthy (attempt $i/10)..."
    sleep 2
done

echo "Error: Server failed health check after deployment!"
sudo systemctl status december-server --no-pager
exit 1
