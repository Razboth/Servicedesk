# Bank SulutGo ServiceDesk - Linux Server Deployment Guide

This guide provides step-by-step instructions for deploying Bank SulutGo ServiceDesk on a Linux server with HTTPS using Bank SulutGo certificates, running on port 443 with PM2 process manager.

## Prerequisites

### System Requirements
- **OS**: Ubuntu 20.04 LTS or later / CentOS 8+ / Debian 11+
- **RAM**: Minimum 4GB (8GB recommended)
- **CPU**: 2+ cores
- **Disk**: 20GB+ free space
- **Node.js**: v18.17.0 or later
- **PostgreSQL**: v14 or later

### Required Software
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+ (using NodeSource)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify Node.js version
node -v  # Should be v18.17.0 or later
npm -v

# Install PM2 globally
sudo npm install -g pm2

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Git
sudo apt install -y git
```

---

## Step 1: Clone the Repository

```bash
# Navigate to your preferred directory
cd /var/www

# Clone the repository
sudo git clone https://github.com/Razboth/Servicedesk.git
cd Servicedesk

# Set proper ownership (replace 'www-data' with your user if needed)
sudo chown -R $USER:$USER /var/www/Servicedesk
```

---

## Step 2: Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Generate Prisma client
npm run db:generate
```

---

## Step 3: Configure PostgreSQL Database

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE servicedesk_database;
CREATE USER servicedesk_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE servicedesk_database TO servicedesk_user;
\q

# Test connection
psql -h localhost -U servicedesk_user -d servicedesk_database
```

---

## Step 4: Configure Environment Variables

Create the `.env` file:

```bash
nano .env
```

Add the following configuration:

```env
# Application
NODE_ENV=production
PORT=443
HOSTNAME=0.0.0.0

# Database
DATABASE_URL="postgresql://servicedesk_user:your_secure_password@localhost:5432/servicedesk_database"

# Authentication
NEXTAUTH_URL="https://hd.bsg.id"
NEXTAUTH_SECRET="generate-a-secure-random-string-here-minimum-32-chars"

# HTTPS Configuration
USE_HTTPS=true
REDIRECT_HTTP=false

# JWT & Encryption
JWT_SECRET="another-secure-random-string-minimum-32-chars"
ENCRYPTION_KEY="32-character-encryption-key-here"

# Email Configuration (Optional)
EMAIL_SERVER_HOST=smtp.your-mail-server.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=noreply@banksulutgo.co.id
EMAIL_SERVER_PASSWORD=your-email-password
EMAIL_FROM=noreply@banksulutgo.co.id

# Upload Configuration
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/gif,application/pdf

# Monitoring
MONITORING_ENABLED=true
```

Generate secure secrets:
```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Generate JWT_SECRET
openssl rand -base64 32

# Generate ENCRYPTION_KEY (32 characters)
openssl rand -hex 16
```

---

## Step 5: Setup Bank SulutGo SSL Certificates

### Option A: Using Official Bank SulutGo Certificates

```bash
# Create certificates directory
mkdir -p /var/www/Servicedesk/certificates

# Copy your Bank SulutGo certificates
# Replace with your actual certificate file paths
sudo cp /path/to/banksulutgo-certificate.pem /var/www/Servicedesk/certificates/localhost.pem
sudo cp /path/to/banksulutgo-private-key.pem /var/www/Servicedesk/certificates/localhost-key.pem

# Set proper permissions
sudo chmod 644 /var/www/Servicedesk/certificates/localhost.pem
sudo chmod 600 /var/www/Servicedesk/certificates/localhost-key.pem
sudo chown $USER:$USER /var/www/Servicedesk/certificates/*
```

### Option B: Using Let's Encrypt (Alternative)

```bash
# Install Certbot
sudo apt install -y certbot

# Generate certificates for your domain
sudo certbot certonly --standalone -d hd.bsg.id

# Copy certificates to application directory
sudo cp /etc/letsencrypt/live/hd.bsg.id/fullchain.pem /var/www/Servicedesk/certificates/localhost.pem
sudo cp /etc/letsencrypt/live/hd.bsg.id/privkey.pem /var/www/Servicedesk/certificates/localhost-key.pem

# Set permissions
sudo chmod 644 /var/www/Servicedesk/certificates/localhost.pem
sudo chmod 600 /var/www/Servicedesk/certificates/localhost-key.pem
sudo chown $USER:$USER /var/www/Servicedesk/certificates/*
```

### Verify Certificate Files

```bash
# Check certificate info
openssl x509 -in /var/www/Servicedesk/certificates/localhost.pem -text -noout | head -20

# Verify key matches certificate
openssl x509 -noout -modulus -in /var/www/Servicedesk/certificates/localhost.pem | openssl md5
openssl rsa -noout -modulus -in /var/www/Servicedesk/certificates/localhost-key.pem | openssl md5
# Both MD5 hashes should match
```

---

## Step 6: Configure PM2 for Production

The `ecosystem.config.js` is already configured for production:

```javascript
module.exports = {
  apps: [
    {
      name: 'bsg-servicedesk',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=2048',
      env: {
        NODE_ENV: 'production',
        PORT: 443,
        USE_HTTPS: 'true',
        REDIRECT_HTTP: 'false',
        HOSTNAME: '0.0.0.0',
        NEXTAUTH_URL: 'https://hd.bsg.id:443'
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      merge_logs: true
    },
    {
      name: 'bsg-monitoring',
      script: 'scripts/start-monitoring.ts',
      interpreter: 'npx',
      interpreter_args: 'tsx',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/pm2-monitoring-error.log',
      out_file: './logs/pm2-monitoring-out.log',
      time: true
    }
  ]
};
```

---

## Step 7: Build and Deploy

```bash
# Create logs directory
mkdir -p /var/www/Servicedesk/logs

# Build the application
npm run build

# Run database migrations
npm run db:push

# Seed initial data (optional, for first-time setup)
npm run db:seed:idempotent

# Start with PM2
sudo npm run pm2:start

# Save PM2 process list
pm2 save

# Setup PM2 to start on system boot
pm2 startup systemd -u $USER --hp /home/$USER
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp /home/$USER
```

---

## Step 8: Configure Firewall

```bash
# Allow HTTPS traffic on port 443
sudo ufw allow 443/tcp

# Allow SSH (important - don't lock yourself out!)
sudo ufw allow 22/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

---

## Step 9: Verify Deployment

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs bsg-servicedesk --lines 50

# Test HTTPS connection
curl -k https://localhost:443/api/health

# Test from external (replace with your domain)
curl https://hd.bsg.id/api/health
```

---

## PM2 Management Commands

| Command | Description |
|---------|-------------|
| `pm2 list` | View all processes |
| `pm2 show bsg-servicedesk` | View detailed status |
| `pm2 logs bsg-servicedesk` | View real-time logs |
| `pm2 restart bsg-servicedesk` | Restart application |
| `pm2 stop bsg-servicedesk` | Stop application |
| `pm2 delete bsg-servicedesk` | Delete process |
| `pm2 reload bsg-servicedesk` | Reload with zero downtime |
| `pm2 monit` | Monitor resources |
| `pm2 flush` | Flush logs |
| `pm2 save` | Save process list |

---

## NPM Script Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Build production application |
| `npm run pm2:start` | Start production server |
| `npm run pm2:stop` | Stop server |
| `npm run pm2:restart` | Restart server |
| `npm run pm2:logs` | View logs |
| `npm run pm2:status` | Check status |
| `npm run pm2:setup` | Build and start (combined) |
| `npm run pm2:monitoring:start` | Start monitoring service |

---

## Troubleshooting

### 1. Port 443 requires root privileges
```bash
# Option A: Give Node.js permission to bind to privileged ports
sudo setcap 'cap_net_bind_service=+ep' $(which node)

# Option B: Run PM2 with sudo (not recommended for production)
sudo pm2 start ecosystem.config.js --only bsg-servicedesk
```

### 2. Certificate errors
```bash
# Check certificate permissions
ls -la /var/www/Servicedesk/certificates/

# Verify certificate format
openssl x509 -in certificates/localhost.pem -text -noout
```

### 3. Database connection issues
```bash
# Test PostgreSQL connection
psql -h localhost -U servicedesk_user -d servicedesk_database -c "SELECT 1;"

# Check PostgreSQL is running
sudo systemctl status postgresql
```

### 4. Application crashes
```bash
# Check PM2 logs for errors
pm2 logs bsg-servicedesk --err --lines 100

# Check system resources
htop
df -h
```

### 5. HTTPS not working
```bash
# Verify USE_HTTPS is set
grep USE_HTTPS .env

# Check if certificates exist
ls -la certificates/

# Test SSL handshake
openssl s_client -connect localhost:443
```

---

## Certificate Renewal (Let's Encrypt)

```bash
# Create renewal script
cat > /var/www/Servicedesk/scripts/renew-certs.sh << 'EOF'
#!/bin/bash
certbot renew --quiet
cp /etc/letsencrypt/live/hd.bsg.id/fullchain.pem /var/www/Servicedesk/certificates/localhost.pem
cp /etc/letsencrypt/live/hd.bsg.id/privkey.pem /var/www/Servicedesk/certificates/localhost-key.pem
chmod 644 /var/www/Servicedesk/certificates/localhost.pem
chmod 600 /var/www/Servicedesk/certificates/localhost-key.pem
pm2 reload bsg-servicedesk
EOF

chmod +x /var/www/Servicedesk/scripts/renew-certs.sh

# Add to crontab (runs monthly)
(crontab -l 2>/dev/null; echo "0 0 1 * * /var/www/Servicedesk/scripts/renew-certs.sh") | crontab -
```

---

## Server URLs

| URL | Description |
|-----|-------------|
| `https://hd.bsg.id` | Production server |
| `https://hd.bsg.id/api/health` | Health check endpoint |
| `https://hd.bsg.id/auth/signin` | Login page |
| `https://hd.bsg.id/admin` | Admin dashboard |

---

## Directory Structure

```
/var/www/Servicedesk/
├── certificates/
│   ├── localhost.pem          # SSL certificate
│   └── localhost-key.pem      # SSL private key
├── logs/
│   ├── pm2-error.log          # PM2 error logs
│   ├── pm2-out.log            # PM2 output logs
│   └── pm2-combined.log       # Combined logs
├── .env                       # Environment variables
├── ecosystem.config.js        # PM2 configuration
├── server.js                  # Compiled server
└── ...
```

---

## Support

For issues or questions:
- Check PM2 logs: `pm2 logs bsg-servicedesk`
- Review error logs: `cat logs/pm2-error.log`
- Database issues: Check PostgreSQL logs at `/var/log/postgresql/`
- GitHub Issues: https://github.com/Razboth/Servicedesk/issues
