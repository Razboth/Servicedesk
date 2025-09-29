# Docker Deployment Guide for Bank SulutGo ServiceDesk

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Quick Start](#quick-start)
4. [Configuration](#configuration)
5. [Database Management](#database-management)
6. [SSL/HTTPS Setup](#sslhttps-setup)
7. [Production Deployment](#production-deployment)
8. [Monitoring and Logging](#monitoring-and-logging)
9. [Scaling and Load Balancing](#scaling-and-load-balancing)
10. [CI/CD Integration](#cicd-integration)
11. [Troubleshooting](#troubleshooting)
12. [Security Best Practices](#security-best-practices)
13. [Backup and Recovery](#backup-and-recovery)
14. [Container Orchestration](#container-orchestration)

---

## Prerequisites

### System Requirements

- **CPU**: Minimum 2 cores, recommended 4+ cores
- **RAM**: Minimum 4GB, recommended 8GB+
- **Storage**: Minimum 20GB free space
- **OS**: Linux (Ubuntu 20.04+, CentOS 8+), Windows 10/11 with WSL2, macOS 10.15+

### Software Requirements

- Docker Engine 20.10+
- Docker Compose 2.0+
- Git
- OpenSSL (for certificate generation)

---

## Installation

### Installing Docker on Ubuntu/Debian

```bash
# Update package index
sudo apt-get update

# Install prerequisites
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker's official GPG key
sudo mkdir -m 0755 -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up the repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add current user to docker group
sudo usermod -aG docker $USER

# Verify installation
docker --version
docker compose version
```

### Installing Docker on CentOS/RHEL/Fedora

```bash
# Install required packages
sudo yum install -y yum-utils

# Add Docker repository
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# Install Docker
sudo yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add current user to docker group
sudo usermod -aG docker $USER

# Verify installation
docker --version
docker compose version
```

### Installing Docker on Windows

1. **Enable WSL2**:
```powershell
# Run as Administrator
wsl --install
wsl --set-default-version 2
```

2. **Download and Install Docker Desktop**:
   - Download from: https://www.docker.com/products/docker-desktop
   - Run the installer
   - Ensure "Use WSL 2 instead of Hyper-V" is selected

3. **Verify Installation**:
```powershell
docker --version
docker compose version
```

### Installing Docker on macOS

1. **Download Docker Desktop for Mac**:
   - Intel chip: https://desktop.docker.com/mac/main/amd64/Docker.dmg
   - Apple silicon: https://desktop.docker.com/mac/main/arm64/Docker.dmg

2. **Install Docker Desktop**:
   - Double-click Docker.dmg
   - Drag Docker to Applications
   - Launch Docker from Applications

3. **Verify Installation**:
```bash
docker --version
docker compose version
```

---

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/servicedesk.git
cd servicedesk
```

### 2. Set Up Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Edit .env file with your configuration
nano .env
```

**Essential Environment Variables**:

```env
# Database
POSTGRES_USER=servicedesk
POSTGRES_PASSWORD=your_secure_password_here
POSTGRES_DB=servicedesk

# NextAuth
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=generate_32_char_secret_here

# Security
ENCRYPTION_KEY=your_32_character_encryption_key
JWT_SECRET=your_jwt_secret_key

# Email
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your-email@gmail.com
EMAIL_SERVER_PASSWORD=your-app-password
EMAIL_FROM=noreply@your-domain.com
```

### 3. Generate Secrets

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Generate ENCRYPTION_KEY (must be exactly 32 characters)
openssl rand -hex 16

# Generate JWT_SECRET
openssl rand -base64 32
```

### 4. Build and Start Containers

```bash
# Development environment
docker compose -f docker-compose.dev.yml up --build

# Production environment
docker compose up --build -d
```

### 5. Initialize Database

```bash
# Run database migrations
docker compose exec app npx prisma migrate deploy

# Seed initial data
docker compose exec app npm run db:seed
```

### 6. Access the Application

- **Development**: http://localhost:3000
- **Production**: http://localhost (redirects to HTTPS)
- **Prisma Studio** (dev only): http://localhost:5555
- **Mailhog** (dev only): http://localhost:8025

---

## Configuration

### Docker Compose Configuration

#### Development Configuration (`docker-compose.dev.yml`)

```yaml
# Key features for development:
- Hot reloading enabled
- Source code mounted as volumes
- Debugging port exposed (9229)
- Prisma Studio included
- Mailhog for email testing
```

#### Production Configuration (`docker-compose.prod.yml`)

```yaml
# Key features for production:
- Multi-replica deployment
- Health checks
- Resource limits
- Monitoring stack (Prometheus, Grafana)
- Log aggregation (Loki, Promtail)
- Automated backups
```

### Environment-Specific Settings

#### Development Environment

```bash
# Start development containers
docker compose -f docker-compose.dev.yml up

# Watch logs
docker compose -f docker-compose.dev.yml logs -f app-dev

# Access Prisma Studio
docker compose -f docker-compose.dev.yml exec app-dev npx prisma studio
```

#### Production Environment

```bash
# Start production containers
docker compose -f docker-compose.prod.yml up -d

# Scale application
docker compose -f docker-compose.prod.yml up -d --scale app=3

# View logs
docker compose -f docker-compose.prod.yml logs -f
```

---

## Database Management

### Database Migration from Existing PostgreSQL

#### 1. Backup Existing Database

**On Linux/macOS**:
```bash
# Create backup from existing database
pg_dump -h old_host -U username -d servicedesk -f backup.sql

# Compress backup
gzip backup.sql
```

**On Windows**:
```powershell
# Using pg_dump
pg_dump -h old_host -U username -d servicedesk -f backup.sql

# Compress using PowerShell
Compress-Archive -Path backup.sql -DestinationPath backup.zip
```

#### 2. Copy Backup to Docker Container

```bash
# Copy backup file
docker cp backup.sql.gz bsg-postgres:/tmp/

# Restore database
docker exec -it bsg-postgres bash
gunzip /tmp/backup.sql.gz
psql -U servicedesk -d servicedesk < /tmp/backup.sql
```

### Automated Backup and Restore

#### Backup Script

```bash
# Run backup
docker compose exec backup /usr/local/bin/backup.sh

# Schedule automatic backups (already configured in docker-compose.prod.yml)
# Backups run daily at 2 AM by default
```

#### Restore Script

```bash
# List available backups
docker compose exec backup /usr/local/bin/restore.sh --list

# Restore from backup
docker compose exec backup /usr/local/bin/restore.sh backup_servicedesk_20240101_020000.sql.gz

# Restore from specific file
docker cp my_backup.sql.gz bsg-postgres:/backup/
docker compose exec backup /usr/local/bin/restore.sh /backup/my_backup.sql.gz
```

### Database Maintenance

```bash
# Access PostgreSQL shell
docker compose exec postgres psql -U servicedesk -d servicedesk

# Run VACUUM
docker compose exec postgres psql -U servicedesk -d servicedesk -c "VACUUM ANALYZE;"

# Check database size
docker compose exec postgres psql -U servicedesk -d servicedesk -c "SELECT pg_database_size('servicedesk');"

# List all tables
docker compose exec postgres psql -U servicedesk -d servicedesk -c "\dt"
```

---

## SSL/HTTPS Setup

### Using Let's Encrypt (Production)

#### 1. Install Certbot

```bash
# Create certbot container
docker run -it --rm --name certbot \
  -v ./certificates:/etc/letsencrypt \
  -v ./docker/nginx/certbot:/var/www/certbot \
  certbot/certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email admin@your-domain.com \
  --agree-tos \
  --no-eff-email \
  -d your-domain.com \
  -d www.your-domain.com
```

#### 2. Configure Nginx for SSL

```nginx
# Update docker/nginx/nginx-prod.conf
ssl_certificate /etc/nginx/ssl/fullchain.pem;
ssl_certificate_key /etc/nginx/ssl/privkey.pem;
```

#### 3. Auto-Renewal

```bash
# Create renewal script
cat > renew-certificates.sh << 'EOF'
#!/bin/bash
docker run -it --rm --name certbot \
  -v ./certificates:/etc/letsencrypt \
  -v ./docker/nginx/certbot:/var/www/certbot \
  certbot/certbot renew

docker compose restart nginx
EOF

chmod +x renew-certificates.sh

# Add to crontab
(crontab -l 2>/dev/null; echo "0 3 * * * /path/to/renew-certificates.sh") | crontab -
```

### Using Self-Signed Certificates (Development)

```bash
# Generate self-signed certificate
mkdir -p certificates
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout certificates/server.key \
  -out certificates/server.crt \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
```

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] Environment variables configured
- [ ] SSL certificates obtained
- [ ] Database backup created
- [ ] Resource limits set in docker-compose.prod.yml
- [ ] Monitoring configured
- [ ] Log rotation configured
- [ ] Security headers configured
- [ ] Firewall rules configured

### Deployment Steps

#### 1. Prepare Server

```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Docker (see Installation section)

# Configure firewall
sudo ufw allow 22/tcp  # SSH
sudo ufw allow 80/tcp  # HTTP
sudo ufw allow 443/tcp # HTTPS
sudo ufw enable
```

#### 2. Deploy Application

```bash
# Clone repository
git clone https://github.com/your-org/servicedesk.git /opt/servicedesk
cd /opt/servicedesk

# Set up environment
cp .env.example .env
# Edit .env with production values
nano .env

# Build and start containers
docker compose -f docker-compose.prod.yml up -d

# Initialize database
docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy
docker compose -f docker-compose.prod.yml exec app npm run db:seed
```

#### 3. Configure Systemd Service

```bash
# Create systemd service
sudo cat > /etc/systemd/system/servicedesk.service << EOF
[Unit]
Description=Bank SulutGo ServiceDesk
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/servicedesk
ExecStart=/usr/bin/docker compose -f docker-compose.prod.yml up -d
ExecStop=/usr/bin/docker compose -f docker-compose.prod.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

# Enable service
sudo systemctl daemon-reload
sudo systemctl enable servicedesk
sudo systemctl start servicedesk
```

### Zero-Downtime Deployment

```bash
#!/bin/bash
# zero-downtime-deploy.sh

# Build new image
docker compose -f docker-compose.prod.yml build app

# Start new container with different name
docker compose -f docker-compose.prod.yml up -d --no-deps --scale app=2 app

# Wait for new container to be healthy
sleep 30

# Remove old container
docker compose -f docker-compose.prod.yml rm -f -s -v app

# Update service
docker compose -f docker-compose.prod.yml up -d --no-deps app
```

---

## Monitoring and Logging

### Accessing Monitoring Tools

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin)
- **Application Logs**: `docker compose logs -f app`

### Setting Up Grafana Dashboards

```bash
# Import dashboards
docker cp grafana-dashboards.json bsg-grafana:/tmp/
docker exec bsg-grafana grafana-cli admin import-dashboard /tmp/grafana-dashboards.json
```

### Log Aggregation with Loki

```bash
# View aggregated logs in Grafana
# 1. Open Grafana (http://localhost:3001)
# 2. Go to Explore
# 3. Select Loki as data source
# 4. Query logs using LogQL
```

### Health Checks

```bash
# Check application health
curl http://localhost:4000/api/health

# Run comprehensive health check
docker compose exec app node docker/scripts/healthcheck.js --json

# Check container status
docker compose ps

# View resource usage
docker stats
```

---

## Scaling and Load Balancing

### Horizontal Scaling

```bash
# Scale application to 3 instances
docker compose -f docker-compose.prod.yml up -d --scale app=3

# Verify scaling
docker compose ps app

# Check load distribution
docker compose logs app | grep "Instance"
```

### Load Balancing Configuration

The Nginx configuration automatically load balances between application instances using the `least_conn` algorithm.

```nginx
upstream servicedesk_backend {
    least_conn;
    server app:4000 max_fails=3 fail_timeout=30s;
    # Additional instances automatically detected
}
```

### Auto-Scaling with Docker Swarm

```bash
# Initialize Swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.prod.yml servicedesk

# Scale service
docker service scale servicedesk_app=5

# Update with rolling deployment
docker service update --image bsg-servicedesk:latest servicedesk_app
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Build and push Docker image
        env:
          DOCKER_REGISTRY: ghcr.io
          IMAGE_NAME: ${{ github.repository }}
        run: |
          echo ${{ secrets.GITHUB_TOKEN }} | docker login ghcr.io -u ${{ github.actor }} --password-stdin
          docker build -t ghcr.io/${{ github.repository }}:latest .
          docker push ghcr.io/${{ github.repository }}:latest

      - name: Deploy to server
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /opt/servicedesk
            docker compose pull
            docker compose -f docker-compose.prod.yml up -d
```

### GitLab CI/CD Example

```yaml
# .gitlab-ci.yml
stages:
  - build
  - deploy

variables:
  DOCKER_DRIVER: overlay2
  IMAGE_TAG: $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA

build:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    - docker build -t $IMAGE_TAG .
    - docker push $IMAGE_TAG

deploy:
  stage: deploy
  image: alpine:latest
  before_script:
    - apk add --no-cache openssh-client
    - eval $(ssh-agent -s)
    - echo "$SSH_PRIVATE_KEY" | ssh-add -
  script:
    - ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "
        cd /opt/servicedesk &&
        docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY &&
        docker pull $IMAGE_TAG &&
        docker tag $IMAGE_TAG bsg-servicedesk:latest &&
        docker compose -f docker-compose.prod.yml up -d
      "
  only:
    - main
```

---

## Troubleshooting

### Common Issues and Solutions

#### 1. Container Won't Start

```bash
# Check logs
docker compose logs app

# Common fixes:
# - Check environment variables
docker compose config

# - Verify database connection
docker compose exec app npx prisma db push

# - Check port conflicts
sudo lsof -i :4000
```

#### 2. Database Connection Issues

```bash
# Test database connection
docker compose exec postgres pg_isready

# Check database logs
docker compose logs postgres

# Verify credentials
docker compose exec postgres psql -U servicedesk -c "\l"
```

#### 3. Performance Issues

```bash
# Check resource usage
docker stats

# Increase resources in docker-compose.yml
# Optimize database
docker compose exec postgres psql -U servicedesk -d servicedesk -c "VACUUM ANALYZE;"

# Clear Docker cache
docker system prune -a
```

#### 4. SSL Certificate Issues

```bash
# Verify certificate
openssl x509 -in certificates/server.crt -text -noout

# Check Nginx configuration
docker compose exec nginx nginx -t

# Reload Nginx
docker compose exec nginx nginx -s reload
```

### Debug Mode

```bash
# Enable debug mode
export DEBUG=true
docker compose -f docker-compose.dev.yml up

# Access container shell
docker compose exec app sh

# Check Node.js processes
docker compose exec app ps aux

# Monitor real-time logs
docker compose logs -f --tail=100 app
```

---

## Security Best Practices

### 1. Container Security

```bash
# Scan for vulnerabilities
docker scan bsg-servicedesk:latest

# Run as non-root user (already configured in Dockerfile)
# Check user
docker compose exec app whoami
```

### 2. Network Security

```yaml
# Use custom networks (already configured)
networks:
  servicedesk_network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

### 3. Secrets Management

```bash
# Use Docker secrets (Swarm mode)
echo "my_secret_password" | docker secret create db_password -

# Reference in compose file
services:
  app:
    secrets:
      - db_password
```

### 4. Security Headers

Already configured in Nginx:
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection
- Strict-Transport-Security
- Content-Security-Policy

### 5. Regular Updates

```bash
# Update base images
docker compose pull
docker compose up -d

# Update dependencies
docker compose exec app npm update
docker compose exec app npm audit fix
```

---

## Backup and Recovery

### Automated Backup Strategy

#### Daily Backups

```bash
# Configure in docker-compose.prod.yml
environment:
  BACKUP_SCHEDULE: "0 2 * * *"  # 2 AM daily
  BACKUP_RETENTION_DAYS: 30
```

#### Manual Backup

```bash
# Create backup
docker compose exec backup /usr/local/bin/backup.sh

# List backups
ls -la docker/backup/

# Copy backup to local machine
docker cp bsg-postgres:/backup/backup_servicedesk_20240101_020000.sql.gz ./
```

### Disaster Recovery Plan

#### 1. Regular Backup Testing

```bash
#!/bin/bash
# test-backup.sh

# Create test database
docker compose exec postgres createdb -U servicedesk servicedesk_test

# Restore backup to test database
gunzip -c backup.sql.gz | docker compose exec -T postgres psql -U servicedesk -d servicedesk_test

# Verify restoration
docker compose exec postgres psql -U servicedesk -d servicedesk_test -c "SELECT COUNT(*) FROM users;"

# Clean up
docker compose exec postgres dropdb -U servicedesk servicedesk_test
```

#### 2. Off-site Backup Storage

```bash
# Upload to S3
aws s3 cp backup.sql.gz s3://my-backup-bucket/servicedesk/

# Sync backups to remote server
rsync -avz docker/backup/ remote-server:/backups/servicedesk/
```

---

## Container Orchestration

### Docker Swarm Deployment

```bash
# Initialize Swarm
docker swarm init --advertise-addr <MANAGER-IP>

# Join worker nodes
docker swarm join-token worker

# Create secrets
echo "password" | docker secret create postgres_password -

# Deploy stack
docker stack deploy -c docker-stack.yml servicedesk

# List services
docker service ls

# Scale service
docker service scale servicedesk_app=5

# Update service
docker service update --image bsg-servicedesk:v2 servicedesk_app

# Monitor services
docker service logs servicedesk_app
```

### Kubernetes Deployment (Basic)

```yaml
# kubernetes/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: servicedesk
spec:
  replicas: 3
  selector:
    matchLabels:
      app: servicedesk
  template:
    metadata:
      labels:
        app: servicedesk
    spec:
      containers:
      - name: app
        image: bsg-servicedesk:latest
        ports:
        - containerPort: 4000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: servicedesk-secrets
              key: database-url
---
apiVersion: v1
kind: Service
metadata:
  name: servicedesk-service
spec:
  selector:
    app: servicedesk
  ports:
  - port: 80
    targetPort: 4000
  type: LoadBalancer
```

```bash
# Deploy to Kubernetes
kubectl apply -f kubernetes/

# Check deployment
kubectl get deployments
kubectl get pods
kubectl get services

# Scale deployment
kubectl scale deployment servicedesk --replicas=5

# Update deployment
kubectl set image deployment/servicedesk app=bsg-servicedesk:v2

# View logs
kubectl logs -f deployment/servicedesk
```

---

## Performance Optimization

### Docker Performance Tuning

```bash
# Optimize build cache
docker buildx create --use
docker buildx build --cache-from type=registry,ref=myregistry/cache --cache-to type=registry,ref=myregistry/cache,mode=max .

# Use BuildKit
export DOCKER_BUILDKIT=1
docker compose build

# Prune unused resources
docker system prune -a --volumes
```

### Application Performance

```yaml
# docker-compose.prod.yml optimizations
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
    environment:
      NODE_OPTIONS: "--max-old-space-size=1536"
      UV_THREADPOOL_SIZE: 128
```

---

## Maintenance Tasks

### Regular Maintenance Schedule

```bash
#!/bin/bash
# maintenance.sh

# Weekly tasks
if [ $(date +%u) -eq 7 ]; then
    echo "Running weekly maintenance..."

    # Clean up Docker resources
    docker system prune -f

    # Optimize database
    docker compose exec postgres vacuumdb -U servicedesk -d servicedesk -z

    # Rotate logs
    docker compose exec app npm run logs:rotate
fi

# Daily tasks
echo "Running daily maintenance..."

# Backup database
docker compose exec backup /usr/local/bin/backup.sh

# Check disk space
df -h | grep -E '^/dev/'

# Check container health
docker compose ps
```

---

## Advanced Configurations

### Multi-Environment Setup

```bash
# Structure
├── docker-compose.yml          # Base configuration
├── docker-compose.dev.yml      # Development overrides
├── docker-compose.staging.yml  # Staging overrides
├── docker-compose.prod.yml     # Production overrides
└── .env.{environment}          # Environment-specific variables

# Usage
docker compose -f docker-compose.yml -f docker-compose.staging.yml up -d
```

### Custom Network Configuration

```yaml
# Advanced networking
networks:
  frontend:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/24
  backend:
    driver: bridge
    internal: true
    ipam:
      config:
        - subnet: 172.21.0.0/24
  monitoring:
    driver: bridge
    ipam:
      config:
        - subnet: 172.22.0.0/24
```

---

## Conclusion

This guide provides comprehensive instructions for deploying the Bank SulutGo ServiceDesk application using Docker. Follow the sections relevant to your deployment scenario and environment.

For additional support:
- Check the application logs: `docker compose logs -f`
- Review the Docker documentation: https://docs.docker.com
- Consult the repository's issue tracker

Remember to:
- Keep your containers and dependencies updated
- Regularly backup your database
- Monitor application performance
- Follow security best practices
- Test your disaster recovery procedures

Happy deploying!