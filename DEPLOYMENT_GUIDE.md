# Bank SulutGo ServiceDesk - Complete Deployment Guide

## Table of Contents
1. [Server Requirements & Initial Setup](#1-server-requirements--initial-setup)
2. [Installing Prerequisites](#2-installing-prerequisites)
3. [Database Setup](#3-database-setup)
4. [Application Deployment](#4-application-deployment)
5. [HTTPS/SSL Configuration](#5-httpsssl-configuration)
6. [Network Configuration](#6-network-configuration)
7. [Security Hardening](#7-security-hardening)
8. [Monitoring & Maintenance](#8-monitoring--maintenance)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Server Requirements & Initial Setup

### Minimum Server Specifications
- **CPU**: 2 vCPUs (4 recommended for production)
- **RAM**: 4GB minimum (8GB recommended)
- **Storage**: 40GB SSD (100GB recommended for logs and uploads)
- **OS**: Ubuntu 22.04 LTS (64-bit)
- **Network**: Static IP address with open internet connection

### Initial Server Setup

#### 1.1 Update System Packages
```bash
# Update package list
sudo apt update

# Upgrade all packages
sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git build-essential software-properties-common apt-transport-https ca-certificates gnupg lsb-release
```

#### 1.2 Set Timezone
```bash
# Set timezone (replace with your timezone)
sudo timedatectl set-timezone Asia/Makassar

# Verify timezone
timedatectl
```

#### 1.3 Configure Hostname
```bash
# Set hostname
sudo hostnamectl set-hostname servicedesk.banksulutgo.co.id

# Update hosts file
sudo nano /etc/hosts
```

Add this line to `/etc/hosts`:
```
YOUR_SERVER_IP servicedesk.banksulutgo.co.id servicedesk
```

---

## 2. Installing Prerequisites

### 2.1 Install Node.js (v20 LTS)
```bash
# Add NodeSource repository for Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js and npm
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
```

### 2.2 Install PostgreSQL 15
```bash
# First, ensure the directory exists
sudo mkdir -p /etc/apt/sources.list.d

# Install required packages for repository management
sudo apt install -y wget ca-certificates

# Add PostgreSQL official repository signing key (updated method for Ubuntu 22.04)
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo gpg --dearmor -o /usr/share/keyrings/postgresql-keyring.gpg

# Add PostgreSQL repository
echo "deb [signed-by=/usr/share/keyrings/postgresql-keyring.gpg] http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" | sudo tee /etc/apt/sources.list.d/pgdg.list

# Update package list
sudo apt update

# Install PostgreSQL 15
sudo apt install -y postgresql-15 postgresql-client-15 postgresql-contrib-15

# Alternative: If PostgreSQL 15 is not available, install the latest version
# sudo apt install -y postgresql postgresql-client postgresql-contrib

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify installation
sudo -u postgres psql -c "SELECT version();"
```

### 2.3 Install PM2 Globally
```bash
# Install PM2
sudo npm install -g pm2

# Setup PM2 to start on boot
pm2 startup systemd -u $USER --hp /home/$USER
# Follow the command output instruction

# Verify installation
pm2 --version
```

### 2.4 Install Nginx
```bash
# Install Nginx
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Verify installation
nginx -v
```

### 2.5 Install Additional Tools
```bash
# Install useful tools
sudo apt install -y htop ncdu net-tools ufw fail2ban certbot python3-certbot-nginx unzip
```

---

## 3. Database Setup

### 3.1 Create PostgreSQL Database and User
```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL prompt, run these commands:
```

```sql
-- Create database
CREATE DATABASE servicedesk;

-- Create user with password (replace 'your_secure_password' with a strong password)
CREATE USER servicedesk_user WITH ENCRYPTED PASSWORD 'your_secure_password';

-- Grant all privileges on database
GRANT ALL PRIVILEGES ON DATABASE servicedesk TO servicedesk_user;

-- Grant schema privileges
\c servicedesk
GRANT ALL ON SCHEMA public TO servicedesk_user;

-- Exit PostgreSQL
\q
```

### 3.2 Configure PostgreSQL for Remote Connections (Optional)
```bash
# Edit PostgreSQL configuration
sudo nano /etc/postgresql/15/main/postgresql.conf
```

Find and modify:
```conf
listen_addresses = 'localhost'  # Keep as localhost for security
```

Edit authentication configuration:
```bash
sudo nano /etc/postgresql/15/main/pg_hba.conf
```

Add this line for local application access:
```conf
# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   servicedesk     servicedesk_user                        md5
host    servicedesk     servicedesk_user     127.0.0.1/32       md5
```

Restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

### 3.3 Test Database Connection
```bash
# Test connection
psql -U servicedesk_user -d servicedesk -h localhost -W
# Enter password when prompted
# Type \q to exit
```

### 3.4 Migrate Existing Database (Optional)
If you have an existing database on Windows that you want to migrate to this Linux server, follow the comprehensive guide in `DATABASE_MIGRATION_GUIDE.md`. This includes:
- Creating database dumps on Windows
- Transferring files to Linux
- Restoring the database
- Fixing permissions and running migrations

Quick migration command:
```bash
# After transferring your backup file to the server
sudo ./migrate_database.sh /tmp/servicedesk_backup.backup
```

---

## 4. Application Deployment

### 4.1 Create Application User
```bash
# Create a dedicated user for the application
sudo adduser --system --group --home /var/www/servicedesk servicedesk

# Create application directory
sudo mkdir -p /var/www/servicedesk
sudo chown -R servicedesk:servicedesk /var/www/servicedesk
```

### 4.2 Clone Repository
```bash
# Switch to servicedesk user
sudo -u servicedesk -s

# Navigate to home directory
cd /var/www/servicedesk

# Clone repository (replace with your repository URL)
git clone https://github.com/your-org/servicedesk.git app
cd app
```

### 4.3 Install Dependencies
```bash
# Install npm dependencies
npm install

# Generate Prisma client
npm run db:generate
```

### 4.4 Configure Environment Variables
```bash
# Create .env file
nano .env
```

Add the following content:
```env
# Database
DATABASE_URL="postgresql://servicedesk_user:your_secure_password@localhost:5432/servicedesk"

# NextAuth Configuration
NEXTAUTH_URL="https://servicedesk.banksulutgo.co.id"
NEXTAUTH_SECRET="generate-a-64-character-random-string-here"

# Environment
NODE_ENV="production"
PORT=4000

# Email Configuration (Gmail example)
EMAIL_SERVER_USER="servicedesk@banksulutgo.co.id"
EMAIL_SERVER_PASSWORD="your-app-specific-password"
EMAIL_SERVER_HOST="smtp.gmail.com"
EMAIL_SERVER_PORT="587"
EMAIL_FROM="ServiceDesk <servicedesk@banksulutgo.co.id>"

# Security
ENCRYPTION_KEY="generate-a-32-character-string-here"
JWT_SECRET="generate-another-random-string-here"

# Upload Configuration
UPLOAD_MAX_SIZE="10485760"
UPLOAD_ALLOWED_TYPES="image/jpeg,image/png,image/gif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"

# Monitoring
MONITORING_ENABLED="true"
```

Generate secure random strings:
```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 48

# Generate ENCRYPTION_KEY (32 chars)
openssl rand -hex 16

# Generate JWT_SECRET
openssl rand -base64 32
```

### 4.5 Run Database Migrations
```bash
# Push schema to database
npm run db:push

# Run migrations (if available)
npm run db:migrate

# Seed initial data
npm run db:seed
npm run db:seed:consolidated
```

### 4.6 Build the Application
```bash
# Build Next.js application
npm run build

# Test the build
npm run start
# Press Ctrl+C to stop after verifying it works
```

### 4.7 Setup PM2 Configuration
```bash
# Create ecosystem file if not exists
nano ecosystem.config.js
```

Ensure it contains:
```javascript
module.exports = {
  apps: [
    {
      name: 'servicedesk',
      script: 'npm',
      args: 'run start',
      cwd: '/var/www/servicedesk/app',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      },
      error_file: '/var/www/servicedesk/logs/error.log',
      out_file: '/var/www/servicedesk/logs/out.log',
      log_file: '/var/www/servicedesk/logs/combined.log',
      time: true,
      max_memory_restart: '1G',
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: 'servicedesk-monitoring',
      script: 'npm',
      args: 'run monitoring:start',
      cwd: '/var/www/servicedesk/app',
      instances: 1,
      env: {
        NODE_ENV: 'production'
      },
      error_file: '/var/www/servicedesk/logs/monitoring-error.log',
      out_file: '/var/www/servicedesk/logs/monitoring-out.log',
      time: true
    }
  ]
};
```

### 4.8 Create Log Directory
```bash
# Create logs directory
mkdir -p /var/www/servicedesk/logs

# Set permissions
chmod -R 755 /var/www/servicedesk/logs
```

### 4.9 Start Application with PM2
```bash
# Start the application
pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save

# Check status
pm2 status

# View logs
pm2 logs servicedesk --lines 50
```

### 4.10 Exit servicedesk user
```bash
exit
```

---

## 5. HTTPS/SSL Configuration

### 5.1 Configure Nginx Reverse Proxy
```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/servicedesk
```

Add the following configuration:
```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name servicedesk.banksulutgo.co.id;
    return 301 https://$server_name$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name servicedesk.banksulutgo.co.id;

    # SSL certificates (will be added by Certbot)
    # ssl_certificate /etc/letsencrypt/live/servicedesk.banksulutgo.co.id/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/servicedesk.banksulutgo.co.id/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Client upload size
    client_max_body_size 10M;

    # Timeouts
    proxy_connect_timeout 600;
    proxy_send_timeout 600;
    proxy_read_timeout 600;
    send_timeout 600;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml application/atom+xml image/svg+xml text/javascript application/vnd.ms-fontobject application/x-font-ttf font/opentype;

    # Proxy to Next.js application
    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;
    }

    # Static files
    location /_next/static {
        proxy_pass http://localhost:4000;
        proxy_cache_valid 60m;
        add_header Cache-Control "public, max-age=3600, immutable";
    }

    # Access logs
    access_log /var/log/nginx/servicedesk-access.log;
    error_log /var/log/nginx/servicedesk-error.log;
}
```

### 5.2 Enable the Site
```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/servicedesk /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 5.3 Obtain SSL Certificate with Let's Encrypt
```bash
# Get SSL certificate
sudo certbot --nginx -d servicedesk.banksulutgo.co.id

# Follow the prompts:
# - Enter email address
# - Agree to terms
# - Choose whether to redirect HTTP to HTTPS (select Yes)
```

### 5.4 Setup Auto-renewal
```bash
# Test renewal
sudo certbot renew --dry-run

# Add cron job for auto-renewal
sudo crontab -e
```

Add this line:
```cron
0 3 * * * /usr/bin/certbot renew --quiet && systemctl reload nginx
```

---

## 6. Network Configuration

### 6.1 Configure UFW Firewall
```bash
# Set default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (adjust port if using non-standard SSH port)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow PostgreSQL from localhost only (if needed)
# sudo ufw allow from 127.0.0.1 to any port 5432

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status verbose
```

### 6.2 DNS Configuration
Ensure your domain DNS records are configured:
```
Type  Host                                Value
A     servicedesk.banksulutgo.co.id     YOUR_SERVER_IP
```

Verify DNS:
```bash
# Check DNS resolution
nslookup servicedesk.banksulutgo.co.id
dig servicedesk.banksulutgo.co.id
```

### 6.3 Configure Network Performance
```bash
# Edit sysctl configuration
sudo nano /etc/sysctl.conf
```

Add these lines for better network performance:
```conf
# Network performance tuning
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728
net.ipv4.tcp_rmem = 4096 87380 134217728
net.ipv4.tcp_wmem = 4096 65536 134217728
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_congestion_control = bbr
net.core.default_qdisc = fq

# Security
net.ipv4.tcp_syncookies = 1
net.ipv4.ip_forward = 0
net.ipv6.conf.all.forwarding = 0
```

Apply changes:
```bash
sudo sysctl -p
```

---

## 7. Security Hardening

### 7.1 SSH Security Configuration
```bash
# Backup SSH config
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

# Edit SSH configuration
sudo nano /etc/ssh/sshd_config
```

Modify these settings:
```conf
# Disable root login
PermitRootLogin no

# Disable password authentication (after setting up SSH keys)
PasswordAuthentication no

# Allow only specific users
AllowUsers your_username

# Change default port (optional)
Port 2222

# Other security settings
Protocol 2
MaxAuthTries 3
MaxSessions 2
ClientAliveInterval 300
ClientAliveCountMax 2
PermitEmptyPasswords no
X11Forwarding no
```

Restart SSH:
```bash
sudo systemctl restart sshd
```

### 7.2 Setup SSH Key Authentication
On your local machine:
```bash
# Generate SSH key pair (if not exists)
ssh-keygen -t ed25519 -C "your_email@example.com"

# Copy public key to server
ssh-copy-id -i ~/.ssh/id_ed25519.pub username@server_ip
```

### 7.3 Configure Fail2ban
```bash
# Create jail.local file
sudo nano /etc/fail2ban/jail.local
```

Add configuration:
```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
destemail = admin@banksulutgo.co.id
action = %(action_mwl)s

[sshd]
enabled = true
port = 22
filter = sshd
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
port = http,https
logpath = /var/log/nginx/error.log

[nginx-botsearch]
enabled = true
port = http,https
filter = nginx-botsearch
logpath = /var/log/nginx/access.log
maxretry = 2
```

Start Fail2ban:
```bash
sudo systemctl restart fail2ban
sudo systemctl enable fail2ban

# Check status
sudo fail2ban-client status
```

### 7.4 Database Security
```bash
# Secure PostgreSQL installation
sudo -u postgres psql
```

In PostgreSQL:
```sql
-- Remove unnecessary databases
DROP DATABASE IF EXISTS template0;

-- Revoke public access
REVOKE ALL ON DATABASE servicedesk FROM PUBLIC;

-- Set password complexity
ALTER SYSTEM SET password_encryption = 'scram-sha-256';

-- Exit
\q
```

Restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

### 7.5 Application Security Best Practices

#### Create secure file permissions:
```bash
# Set proper ownership
sudo chown -R servicedesk:servicedesk /var/www/servicedesk

# Set directory permissions
sudo find /var/www/servicedesk -type d -exec chmod 755 {} \;

# Set file permissions
sudo find /var/www/servicedesk -type f -exec chmod 644 {} \;

# Make scripts executable
sudo chmod +x /var/www/servicedesk/app/scripts/*.js
sudo chmod +x /var/www/servicedesk/app/scripts/*.ts
```

#### Setup application-level security:
```bash
# Create uploads directory with restricted access
sudo mkdir -p /var/www/servicedesk/uploads
sudo chown servicedesk:servicedesk /var/www/servicedesk/uploads
sudo chmod 750 /var/www/servicedesk/uploads
```

---

## 8. Monitoring & Maintenance

### 8.1 Setup Logging
```bash
# Create log rotation configuration
sudo nano /etc/logrotate.d/servicedesk
```

Add configuration:
```
/var/www/servicedesk/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 640 servicedesk servicedesk
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}

/var/log/nginx/servicedesk-*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 640 www-data adm
    sharedscripts
    postrotate
        nginx -s reload
    endscript
}
```

### 8.2 PM2 Monitoring
```bash
# Setup PM2 monitoring
sudo -u servicedesk -s
cd /var/www/servicedesk/app

# Monitor processes
pm2 monit

# Setup PM2 web monitoring (optional)
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30

# Setup auto-restart on file changes (development only)
# pm2 start ecosystem.config.js --watch
```

### 8.3 System Monitoring
```bash
# Install monitoring tools
sudo apt install -y htop iotop nethogs

# Setup system monitoring with netdata (optional)
bash <(curl -Ss https://my-netdata.io/kickstart.sh)
```

### 8.4 Database Backup Strategy
```bash
# Create backup script
sudo nano /usr/local/bin/backup-servicedesk.sh
```

Add backup script:
```bash
#!/bin/bash
# ServiceDesk Database Backup Script

# Variables
BACKUP_DIR="/var/backups/servicedesk"
DB_NAME="servicedesk"
DB_USER="servicedesk_user"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/servicedesk_$DATE.sql.gz"
RETENTION_DAYS=30

# Create backup directory
mkdir -p $BACKUP_DIR

# Perform backup
PGPASSWORD="your_secure_password" pg_dump -U $DB_USER -h localhost $DB_NAME | gzip > $BACKUP_FILE

# Check if backup was successful
if [ $? -eq 0 ]; then
    echo "Backup successful: $BACKUP_FILE"

    # Upload to external storage (optional)
    # aws s3 cp $BACKUP_FILE s3://your-bucket/backups/

    # Remove old backups
    find $BACKUP_DIR -name "servicedesk_*.sql.gz" -mtime +$RETENTION_DAYS -delete
else
    echo "Backup failed!"
    exit 1
fi
```

Make executable and schedule:
```bash
# Make executable
sudo chmod +x /usr/local/bin/backup-servicedesk.sh

# Add to crontab
sudo crontab -e
```

Add this line for daily backups:
```cron
0 2 * * * /usr/local/bin/backup-servicedesk.sh >> /var/log/backup.log 2>&1
```

### 8.5 Update Procedures

#### Application Updates:
```bash
# Switch to servicedesk user
sudo -u servicedesk -s
cd /var/www/servicedesk/app

# Pull latest changes
git pull origin main

# Install new dependencies
npm install

# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Build application
npm run build

# Reload PM2
pm2 reload ecosystem.config.js

# Exit servicedesk user
exit
```

#### System Updates:
```bash
# Create update script
sudo nano /usr/local/bin/update-system.sh
```

Add:
```bash
#!/bin/bash
# System update script

# Update packages
apt update
apt upgrade -y

# Update Node.js packages
npm update -g

# Restart services if needed
systemctl restart postgresql
systemctl restart nginx
pm2 reload all

# Clean up
apt autoremove -y
apt autoclean
```

Make executable:
```bash
sudo chmod +x /usr/local/bin/update-system.sh
```

---

## 9. Troubleshooting

### 9.1 Common Issues and Solutions

#### Application Won't Start
```bash
# Check PM2 logs
pm2 logs servicedesk --lines 100

# Check Node.js errors
sudo -u servicedesk -s
cd /var/www/servicedesk/app
npm run start
# Look for error messages

# Common fixes:
# 1. Check environment variables
cat .env

# 2. Verify database connection
psql -U servicedesk_user -d servicedesk -h localhost -W

# 3. Check port availability
sudo netstat -tlnp | grep 4000

# 4. Rebuild application
npm run build
```

#### Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-15-main.log

# Test connection
psql -U servicedesk_user -d servicedesk -h localhost -W

# Common fixes:
# 1. Check pg_hba.conf
sudo nano /etc/postgresql/15/main/pg_hba.conf

# 2. Restart PostgreSQL
sudo systemctl restart postgresql

# 3. Check database exists
sudo -u postgres psql -l
```

#### Nginx 502 Bad Gateway
```bash
# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Check if application is running
pm2 status

# Check if port is correct
curl http://localhost:4000

# Common fixes:
# 1. Restart application
pm2 restart servicedesk

# 2. Check Nginx configuration
sudo nginx -t

# 3. Reload Nginx
sudo systemctl reload nginx
```

#### SSL Certificate Issues
```bash
# Check certificate status
sudo certbot certificates

# Renew manually
sudo certbot renew

# Check Nginx SSL configuration
sudo nginx -t

# Regenerate certificate
sudo certbot --nginx -d servicedesk.banksulutgo.co.id --force-renewal
```

### 9.2 Log File Locations
```bash
# Application logs
/var/www/servicedesk/logs/error.log      # PM2 error logs
/var/www/servicedesk/logs/out.log        # PM2 output logs
/var/www/servicedesk/logs/combined.log   # Combined logs

# Nginx logs
/var/log/nginx/servicedesk-access.log    # Access logs
/var/log/nginx/servicedesk-error.log     # Error logs

# PostgreSQL logs
/var/log/postgresql/postgresql-15-main.log

# System logs
/var/log/syslog                          # System log
/var/log/auth.log                        # Authentication log
/var/log/fail2ban.log                    # Fail2ban log
```

### 9.3 Performance Debugging
```bash
# Check system resources
htop

# Check disk usage
df -h
ncdu /

# Check network connections
netstat -tuln

# Check PM2 process details
pm2 describe servicedesk

# Monitor real-time logs
pm2 logs --lines 0

# Database performance
sudo -u postgres psql -d servicedesk
# Run: EXPLAIN ANALYZE <your query>;
```

### 9.4 Emergency Recovery

#### Restore from Backup:
```bash
# Stop application
pm2 stop all

# Restore database
gunzip < /var/backups/servicedesk/servicedesk_YYYYMMDD_HHMMSS.sql.gz | psql -U servicedesk_user -d servicedesk

# Restart application
pm2 restart all
```

#### Reset Admin Password:
```bash
# Connect to database
sudo -u postgres psql -d servicedesk

# Update admin password (this is an example, adjust to your schema)
UPDATE "User" SET password = 'hashed_password_here' WHERE email = 'admin@banksulutgo.co.id';
```

### 9.5 Health Checks
```bash
# Create health check script
sudo nano /usr/local/bin/check-servicedesk-health.sh
```

Add:
```bash
#!/bin/bash

# Check if application is responding
if curl -f -s -o /dev/null http://localhost:4000/api/health; then
    echo "Application is healthy"
else
    echo "Application is not responding!"
    # Restart application
    pm2 restart servicedesk
    # Send alert (configure your alerting method)
    echo "ServiceDesk restarted due to health check failure" | mail -s "ServiceDesk Alert" admin@banksulutgo.co.id
fi

# Check database connection
if psql -U servicedesk_user -d servicedesk -h localhost -c "SELECT 1" > /dev/null 2>&1; then
    echo "Database is accessible"
else
    echo "Database connection failed!"
fi

# Check disk space
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "Warning: Disk usage is at $DISK_USAGE%"
fi
```

Make executable and schedule:
```bash
sudo chmod +x /usr/local/bin/check-servicedesk-health.sh

# Add to crontab for every 5 minutes
crontab -e
```

Add:
```cron
*/5 * * * * /usr/local/bin/check-servicedesk-health.sh
```

---

## Post-Deployment Checklist

After completing the deployment, verify everything is working:

### ✅ Verification Steps
1. [ ] Application is accessible via HTTPS
2. [ ] SSL certificate is valid
3. [ ] Login page loads correctly
4. [ ] Database connection works
5. [ ] File uploads work (test with small file)
6. [ ] Email notifications work
7. [ ] PM2 processes are running
8. [ ] Logs are being generated
9. [ ] Backup script runs successfully
10. [ ] Monitoring is active
11. [ ] Firewall rules are applied
12. [ ] Fail2ban is protecting SSH
13. [ ] All cron jobs are scheduled
14. [ ] Health checks pass

### 📋 Final Commands Summary
```bash
# Check all services
sudo systemctl status postgresql nginx
pm2 status

# Check logs
pm2 logs servicedesk --lines 20

# Test HTTPS
curl -I https://servicedesk.banksulutgo.co.id

# Check disk space
df -h

# Check memory usage
free -h

# View active connections
ss -tunlp
```

### 🔐 Security Reminder
1. Change all default passwords
2. Keep software updated regularly
3. Monitor logs for suspicious activity
4. Maintain regular backups
5. Document any custom changes
6. Keep this guide updated with changes

---

## Support and Maintenance Contacts

For issues or questions:
- **System Administrator**: [Your contact]
- **Database Administrator**: [Your contact]
- **Application Support**: [Your contact]
- **Emergency Contact**: [Your contact]

---

*Last Updated: December 2024*
*Version: 1.0*