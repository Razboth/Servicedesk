# Docker Deployment Guide for Linux Server
## Bank SulutGo ServiceDesk - Production Deployment

---

## Table of Contents
1. [Server Requirements](#server-requirements)
2. [Pre-Deployment Preparation](#pre-deployment-preparation)
3. [Docker Installation](#docker-installation)
4. [Application Deployment](#application-deployment)
5. [Database Migration](#database-migration)
6. [SSL/HTTPS Setup](#sslhttps-setup)
7. [Post-Deployment Configuration](#post-deployment-configuration)
8. [Monitoring and Maintenance](#monitoring-and-maintenance)
9. [Troubleshooting](#troubleshooting)

---

## Server Requirements

### Minimum Specifications
- **OS**: Ubuntu 22.04 LTS or Debian 11+ (recommended)
- **CPU**: 4 vCPUs
- **RAM**: 8GB minimum (16GB recommended)
- **Storage**: 100GB SSD
- **Network**: Static IP address with open internet connection

### Required Ports
- **80**: HTTP (redirect to HTTPS)
- **443**: HTTPS
- **22**: SSH (for management)

---

## Pre-Deployment Preparation

### 1. Update System
```bash
# Update package lists
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y curl wget git nano htop unzip
```

### 2. Set Hostname and Timezone
```bash
# Set hostname
sudo hostnamectl set-hostname servicedesk.banksulutgo.co.id

# Set timezone to Asia/Makassar
sudo timedatectl set-timezone Asia/Makassar

# Verify settings
hostnamectl
timedatectl
```

### 3. Configure Firewall
```bash
# Install and enable UFW
sudo apt install -y ufw

# Allow SSH (IMPORTANT: Do this first!)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw --force enable

# Check status
sudo ufw status
```

### 4. Setup DNS
Ensure your domain points to your server's IP address:
```bash
# Check current IP
curl ifconfig.me

# Test DNS resolution
nslookup servicedesk.banksulutgo.co.id
```

---

## Docker Installation

### Method 1: Official Docker Installation Script (Recommended)

```bash
# Download and run Docker installation script
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add current user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose plugin
sudo apt-get update
sudo apt-get install -y docker-compose-plugin

# Verify installation
docker --version
docker compose version

# Test Docker
sudo docker run hello-world
```

### Method 2: Manual Installation

```bash
# Install prerequisites
sudo apt-get update
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
    sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt-get update
sudo apt-get install -y \
    docker-ce \
    docker-ce-cli \
    containerd.io \
    docker-buildx-plugin \
    docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

### Configure Docker for Production

```bash
# Create Docker daemon configuration
sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "userland-proxy": false,
  "live-restore": true
}
EOF

# Restart Docker
sudo systemctl restart docker

# Enable Docker to start on boot
sudo systemctl enable docker

# Verify Docker is running
sudo systemctl status docker
```

---

## Application Deployment

### 1. Clone Repository

```bash
# Navigate to application directory
cd /opt

# Clone the repository
sudo git clone https://github.com/Razboth/Servicedesk.git servicedesk

# Change ownership
sudo chown -R $USER:$USER /opt/servicedesk

# Navigate to project
cd /opt/servicedesk
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit environment file
nano .env
```

**Required Environment Variables:**
```env
# Database Configuration
DB_USER=servicedesk
DB_PASSWORD=YOUR_STRONG_DATABASE_PASSWORD
DB_NAME=servicedesk

# Application URLs
NEXTAUTH_URL=https://servicedesk.banksulutgo.co.id
DOMAIN=servicedesk.banksulutgo.co.id

# Security Keys (Generate strong random values)
NEXTAUTH_SECRET=YOUR_NEXTAUTH_SECRET_HERE
ENCRYPTION_KEY=YOUR_32_CHARACTER_ENCRYPTION_KEY
JWT_SECRET=YOUR_JWT_SECRET_HERE

# Redis
REDIS_PASSWORD=YOUR_REDIS_PASSWORD

# Email Configuration (Optional)
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your-email@gmail.com
EMAIL_SERVER_PASSWORD=your-app-password
EMAIL_FROM=noreply@banksulutgo.co.id

# SSL Email for Let's Encrypt
SSL_EMAIL=admin@banksulutgo.co.id

# Upload Configuration
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/gif,application/pdf

# Monitoring
MONITORING_ENABLED=true

# Backup Configuration
BACKUP_RETENTION_DAYS=7
```

**Generate Secure Keys:**
```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Generate ENCRYPTION_KEY (must be 32 characters)
openssl rand -hex 16

# Generate JWT_SECRET
openssl rand -base64 32
```

### 3. Automated Deployment

```bash
# Make deployment script executable
chmod +x scripts/docker/deploy-linux.sh

# Run deployment script
sudo ./scripts/docker/deploy-linux.sh
```

The script will:
- ✅ Check all prerequisites
- ✅ Create required directories
- ✅ Validate environment configuration
- ✅ Build Docker images
- ✅ Start all services
- ✅ Run database migrations
- ✅ Configure SSL certificates
- ✅ Setup automated backups

### 4. Manual Deployment (Alternative)

```bash
# Create required directories
sudo mkdir -p /var/lib/servicedesk/{postgres,uploads}
sudo mkdir -p /var/log/servicedesk
sudo mkdir -p /var/backups/servicedesk

# Build and start services
docker compose -f docker-compose.linux-server.yml build
docker compose -f docker-compose.linux-server.yml up -d

# Check status
docker compose -f docker-compose.linux-server.yml ps

# View logs
docker compose -f docker-compose.linux-server.yml logs -f
```

### 5. Verify Deployment

```bash
# Check all containers are running
docker compose -f docker-compose.linux-server.yml ps

# Check application health
curl http://localhost:4000/api/health

# Check application logs
docker compose -f docker-compose.linux-server.yml logs app

# Check database connection
docker compose -f docker-compose.linux-server.yml exec postgres psql -U servicedesk -d servicedesk -c "\dt"
```

---

## Database Migration

### From Existing PostgreSQL to Docker

#### 1. Create Backup on Source Server

**On Windows:**
```cmd
cd "C:\Program Files\PostgreSQL\15\bin"
pg_dump -h localhost -U postgres -d servicedesk -F c --no-owner --no-privileges -f C:\backup\servicedesk.backup
```

**On Linux:**
```bash
pg_dump -h localhost -U postgres -d servicedesk -F c --no-owner --no-privileges -f /tmp/servicedesk.backup
```

#### 2. Transfer Backup to Docker Server

```bash
# From your local machine
scp servicedesk.backup user@docker-server:/tmp/

# Or using rsync
rsync -avz -e ssh servicedesk.backup user@docker-server:/tmp/
```

#### 3. Restore to Docker PostgreSQL

```bash
# Copy backup into container
docker cp /tmp/servicedesk.backup servicedesk-db:/tmp/

# Restore database
docker compose -f docker-compose.linux-server.yml exec -T postgres \
    pg_restore -U servicedesk -d servicedesk --no-owner --no-privileges \
    /tmp/servicedesk.backup

# Or use the migration script
./scripts/docker/migrate-database.sh /tmp/servicedesk.backup
```

#### 4. Verify Migration

```bash
# Check table count
docker compose -f docker-compose.linux-server.yml exec postgres \
    psql -U servicedesk -d servicedesk -c "\dt"

# Check record counts
docker compose -f docker-compose.linux-server.yml exec postgres \
    psql -U servicedesk -d servicedesk -c "
    SELECT 'Users' as table, COUNT(*) FROM \"User\"
    UNION ALL SELECT 'Tickets', COUNT(*) FROM \"Ticket\"
    UNION ALL SELECT 'Services', COUNT(*) FROM \"Service\";"

# Run Prisma migrations
docker compose -f docker-compose.linux-server.yml exec app \
    npx prisma migrate deploy

# Restart application
docker compose -f docker-compose.linux-server.yml restart app
```

---

## SSL/HTTPS Setup

### Using Let's Encrypt (Automated)

#### 1. Initial Certificate Acquisition

```bash
# Make sure your domain is pointing to your server
nslookup servicedesk.banksulutgo.co.id

# Stop nginx temporarily
docker compose -f docker-compose.linux-server.yml stop nginx

# Run certbot
docker compose -f docker-compose.linux-server.yml --profile ssl-setup run --rm certbot

# Start nginx
docker compose -f docker-compose.linux-server.yml start nginx
```

#### 2. Setup Auto-Renewal

```bash
# Create renewal script
sudo tee /etc/cron.monthly/renew-ssl.sh > /dev/null <<'EOF'
#!/bin/bash
cd /opt/servicedesk
docker compose -f docker-compose.linux-server.yml run --rm certbot renew
docker compose -f docker-compose.linux-server.yml exec nginx nginx -s reload
EOF

# Make executable
sudo chmod +x /etc/cron.monthly/renew-ssl.sh

# Test renewal (dry-run)
sudo /etc/cron.monthly/renew-ssl.sh
```

### Using Self-Signed Certificates (Development/Testing)

```bash
# Create self-signed certificate
sudo mkdir -p nginx/ssl
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout nginx/ssl/privkey.pem \
    -out nginx/ssl/fullchain.pem \
    -subj "/C=ID/ST=North Sulawesi/L=Manado/O=Bank SulutGo/CN=servicedesk.banksulutgo.co.id"

# Update nginx config to use self-signed certs
# Edit nginx/conf.d/servicedesk.conf and update paths
```

---

## Post-Deployment Configuration

### 1. Create Admin User

```bash
# Access the database
docker compose -f docker-compose.linux-server.yml exec postgres \
    psql -U servicedesk -d servicedesk

# Create admin user (adjust values as needed)
INSERT INTO "User" (id, email, name, password, role, "branchId", "isActive", "createdAt", "updatedAt")
VALUES (
    'admin001',
    'admin@banksulutgo.co.id',
    'System Administrator',
    '$2a$10$encrypted_password_hash',  -- Use bcrypt hash
    'SUPER_ADMIN',
    (SELECT id FROM "Branch" LIMIT 1),
    true,
    NOW(),
    NOW()
);
```

### 2. Configure Monitoring

```bash
# View real-time logs
docker compose -f docker-compose.linux-server.yml logs -f

# Monitor container resources
docker stats

# Setup log rotation
sudo tee /etc/logrotate.d/servicedesk > /dev/null <<EOF
/var/log/servicedesk/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 root root
    sharedscripts
}
EOF
```

### 3. Setup Automated Backups

The deployment script creates daily backups automatically. To verify:

```bash
# Check backup cron job
cat /etc/cron.daily/servicedesk-backup

# Manually run backup
sudo /etc/cron.daily/servicedesk-backup

# List backups
ls -lh /var/backups/servicedesk/
```

### 4. Performance Tuning

```bash
# Adjust Docker resources (if needed)
# Edit docker-compose.linux-server.yml and modify resource limits

# Restart with new configuration
docker compose -f docker-compose.linux-server.yml up -d

# Monitor performance
docker stats
```

---

## Monitoring and Maintenance

### Daily Operations

**Check Service Status:**
```bash
docker compose -f docker-compose.linux-server.yml ps
docker compose -f docker-compose.linux-server.yml logs --tail=50
```

**View Application Logs:**
```bash
# All services
docker compose -f docker-compose.linux-server.yml logs -f

# Specific service
docker compose -f docker-compose.linux-server.yml logs -f app
docker compose -f docker-compose.linux-server.yml logs -f postgres
docker compose -f docker-compose.linux-server.yml logs -f nginx
```

**Check Resource Usage:**
```bash
# Container stats
docker stats

# Disk usage
df -h
docker system df

# Database size
docker compose -f docker-compose.linux-server.yml exec postgres \
    psql -U servicedesk -d servicedesk -c \
    "SELECT pg_database_size('servicedesk')/1024/1024 as size_mb;"
```

### Backup and Restore

**Manual Backup:**
```bash
# Database backup
docker compose -f docker-compose.linux-server.yml exec postgres \
    pg_dump -U servicedesk servicedesk | \
    gzip > /var/backups/servicedesk/manual_$(date +%Y%m%d_%H%M%S).sql.gz

# Application files backup
tar -czf /var/backups/servicedesk/uploads_$(date +%Y%m%d).tar.gz \
    /var/lib/servicedesk/uploads/
```

**Restore from Backup:**
```bash
# Stop application
docker compose -f docker-compose.linux-server.yml stop app

# Restore database
gunzip -c /var/backups/servicedesk/db_20240101.sql.gz | \
    docker compose -f docker-compose.linux-server.yml exec -T postgres \
    psql -U servicedesk -d servicedesk

# Restore uploads
tar -xzf /var/backups/servicedesk/uploads_20240101.tar.gz -C /

# Start application
docker compose -f docker-compose.linux-server.yml start app
```

### Updates and Maintenance

**Update Application:**
```bash
# Navigate to project directory
cd /opt/servicedesk

# Pull latest code
git pull origin main

# Rebuild images
docker compose -f docker-compose.linux-server.yml build --no-cache

# Restart with zero downtime
docker compose -f docker-compose.linux-server.yml up -d --no-deps --build app

# Run migrations if needed
docker compose -f docker-compose.linux-server.yml exec app npx prisma migrate deploy
```

**Update Docker Images:**
```bash
# Pull latest images
docker compose -f docker-compose.linux-server.yml pull

# Restart services
docker compose -f docker-compose.linux-server.yml up -d
```

**Clean Up:**
```bash
# Remove unused images
docker image prune -a

# Remove unused volumes (CAREFUL!)
docker volume prune

# Full cleanup
docker system prune -a --volumes
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check container logs
docker compose -f docker-compose.linux-server.yml logs app

# Check container status
docker compose -f docker-compose.linux-server.yml ps

# Inspect container
docker inspect servicedesk-app

# Check for port conflicts
sudo netstat -tulpn | grep -E '4000|5432|80|443'
```

### Database Connection Issues

```bash
# Test database connection
docker compose -f docker-compose.linux-server.yml exec postgres \
    psql -U servicedesk -d servicedesk -c "SELECT 1;"

# Check database logs
docker compose -f docker-compose.linux-server.yml logs postgres

# Verify environment variables
docker compose -f docker-compose.linux-server.yml exec app env | grep DATABASE_URL
```

### Performance Issues

```bash
# Check resource usage
docker stats

# Check disk space
df -h

# Check database performance
docker compose -f docker-compose.linux-server.yml exec postgres \
    psql -U servicedesk -d servicedesk -c "
    SELECT * FROM pg_stat_activity WHERE state != 'idle';"

# Optimize database
docker compose -f docker-compose.linux-server.yml exec postgres \
    psql -U servicedesk -d servicedesk -c "VACUUM ANALYZE;"
```

### SSL Certificate Issues

```bash
# Check certificate validity
openssl x509 -in nginx/ssl/fullchain.pem -text -noout

# Test SSL configuration
curl -vI https://servicedesk.banksulutgo.co.id

# Renew certificates manually
docker compose -f docker-compose.linux-server.yml run --rm certbot renew --force-renewal
docker compose -f docker-compose.linux-server.yml exec nginx nginx -s reload
```

### Application Errors

```bash
# View detailed logs
docker compose -f docker-compose.linux-server.yml logs -f app

# Restart application
docker compose -f docker-compose.linux-server.yml restart app

# Check Prisma client
docker compose -f docker-compose.linux-server.yml exec app npx prisma generate

# Re-run migrations
docker compose -f docker-compose.linux-server.yml exec app npx prisma migrate deploy
```

---

## Useful Commands Reference

### Docker Compose Commands
```bash
# Start services
docker compose -f docker-compose.linux-server.yml up -d

# Stop services
docker compose -f docker-compose.linux-server.yml stop

# Restart services
docker compose -f docker-compose.linux-server.yml restart

# View logs
docker compose -f docker-compose.linux-server.yml logs -f

# Scale application
docker compose -f docker-compose.linux-server.yml up -d --scale app=3

# Remove everything
docker compose -f docker-compose.linux-server.yml down -v
```

### Database Commands
```bash
# Access database shell
docker compose -f docker-compose.linux-server.yml exec postgres \
    psql -U servicedesk -d servicedesk

# Run SQL file
docker compose -f docker-compose.linux-server.yml exec -T postgres \
    psql -U servicedesk -d servicedesk < script.sql

# Create backup
docker compose -f docker-compose.linux-server.yml exec postgres \
    pg_dump -U servicedesk servicedesk > backup.sql
```

### Nginx Commands
```bash
# Test configuration
docker compose -f docker-compose.linux-server.yml exec nginx nginx -t

# Reload configuration
docker compose -f docker-compose.linux-server.yml exec nginx nginx -s reload

# View access logs
docker compose -f docker-compose.linux-server.yml logs nginx
```

---

## Production Checklist

Before going live, ensure:

- [ ] Server is up to date
- [ ] Firewall is configured (UFW)
- [ ] DNS is pointing to server
- [ ] SSL certificates are installed and working
- [ ] All environment variables are set
- [ ] Database is backed up
- [ ] Automated backups are configured
- [ ] Monitoring is set up
- [ ] Admin user is created
- [ ] Application is accessible via HTTPS
- [ ] Health checks are passing
- [ ] Logs are being rotated
- [ ] Performance is acceptable
- [ ] Documentation is updated

---

## Support and Maintenance

For issues or questions:
1. Check logs: `docker compose logs`
2. Review this documentation
3. Check GitHub issues: https://github.com/Razboth/Servicedesk/issues
4. Contact system administrator

---

## License

Bank SulutGo ServiceDesk © 2024