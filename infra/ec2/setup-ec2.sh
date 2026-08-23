#!/usr/bin/env bash
set -euo pipefail

echo "=================================================="
echo "December EC2 Production Host Setup Script"
echo "=================================================="

# 1. Update OS and install prerequisites
echo "[1/6] Updating packages and installing system dependencies..."
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl build-essential nginx openssl certbot python3-certbot-nginx ufw

# 2. Install Bun
echo "[2/6] Installing Bun runtime..."
if ! command -v bun &> /dev/null; then
    curl -fsSL https://bun.sh/install | bash
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
    sudo ln -sf "$HOME/.bun/bin/bun" /usr/local/bin/bun
fi
bun --version

# 3. Create Application Directory
echo "[3/6] Setting up application directory..."
sudo mkdir -p /var/www/december
sudo chown -R "$USER:$USER" /var/www/december

# 4. Install Systemd Services
echo "[4/6] Installing systemd service units..."
sudo cp /var/www/december/infra/ec2/december-server.service /etc/systemd/system/
sudo cp /var/www/december/infra/ec2/december-worker.service /etc/systemd/system/
sudo systemctl daemon-reload

# 5. Configure Nginx
echo "[5/6] Configuring Nginx reverse proxy..."
sudo cp /var/www/december/infra/ec2/nginx.conf /etc/nginx/sites-available/december.conf
sudo ln -sf /etc/nginx/sites-available/december.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

# 6. Setup Firewall (UFW)
echo "[6/6] Configuring firewall rules..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

echo "=================================================="
echo "Setup complete! Next steps:"
echo "1. Configure /var/www/december/.env.production"
echo "2. Run /var/www/december/infra/ec2/deploy.sh"
echo "=================================================="
