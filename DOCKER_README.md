# Docker Deployment - Quick Reference

## 🚀 Quick Start

### Fastest Way to Deploy

```bash
# Clone the repository
git clone https://github.com/your-org/servicedesk.git
cd servicedesk

# Run quick start script
./docker-quick-start.sh development  # For development
# OR
./docker-quick-start.sh production   # For production
```

The quick start script will:
- ✅ Check prerequisites
- ✅ Set up environment variables
- ✅ Generate SSL certificates
- ✅ Build Docker images
- ✅ Start all containers
- ✅ Run database migrations
- ✅ Perform health checks

## 📋 Prerequisites

- Docker 20.10+ installed
- Docker Compose v2+ installed
- 4GB RAM minimum
- 20GB free disk space

## 🏗️ Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│     Nginx       │────▶│   Next.js App   │────▶│   PostgreSQL    │
│  (Load Balancer)│     │   (Port 4000)   │     │   (Database)    │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │                        │
         │                       │                        │
         ▼                       ▼                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│   SSL Certs     │     │     Redis       │     │    Backup       │
│   (Volume)      │     │    (Cache)      │     │   (Cron Job)    │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## 🔧 Manual Deployment

### Development Environment

```bash
# 1. Copy and configure environment
cp .env.example .env
nano .env  # Edit configuration

# 2. Start development containers
docker compose -f docker-compose.dev.yml up -d

# 3. Run migrations
docker compose -f docker-compose.dev.yml exec app-dev npx prisma migrate deploy

# 4. Seed database (optional)
docker compose -f docker-compose.dev.yml exec app-dev npm run db:seed

# 5. Access application
open http://localhost:3000
```

### Production Environment

```bash
# 1. Set up production environment
cp .env.example .env
# Edit .env with production values

# 2. Generate secure secrets
openssl rand -base64 32  # For NEXTAUTH_SECRET
openssl rand -hex 16     # For ENCRYPTION_KEY (32 chars)

# 3. Start production containers
docker compose -f docker-compose.prod.yml up -d

# 4. Initialize database
docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy
docker compose -f docker-compose.prod.yml exec app npm run db:seed

# 5. Access application
open https://localhost
```

## 🔑 Environment Variables

### Critical Variables to Configure

```env
# Database (Production)
POSTGRES_USER=servicedesk
POSTGRES_PASSWORD=<STRONG_PASSWORD>
POSTGRES_DB=servicedesk

# Authentication
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=<32_CHAR_SECRET>

# Security
ENCRYPTION_KEY=<32_CHAR_KEY>
JWT_SECRET=<SECURE_SECRET>

# Email
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your-email@gmail.com
EMAIL_SERVER_PASSWORD=<APP_PASSWORD>
```

## 📊 Container Management

### View Status

```bash
# Development
docker compose -f docker-compose.dev.yml ps

# Production
docker compose -f docker-compose.prod.yml ps
```

### View Logs

```bash
# All logs
docker compose logs -f

# Specific service
docker compose logs -f app

# Last 100 lines
docker compose logs --tail=100
```

### Scale Application

```bash
# Scale to 3 instances (production)
docker compose -f docker-compose.prod.yml up -d --scale app=3
```

### Stop/Restart

```bash
# Stop all containers
docker compose down

# Restart specific service
docker compose restart app

# Full restart
docker compose down && docker compose up -d
```

## 💾 Database Management

### Backup Database

```bash
# Manual backup
docker compose exec backup /usr/local/bin/backup.sh

# Automated backups run daily at 2 AM
# Check backup files
ls -la docker/backup/
```

### Restore Database

```bash
# List available backups
docker compose exec backup /usr/local/bin/restore.sh --list

# Restore from backup
docker compose exec backup /usr/local/bin/restore.sh backup_servicedesk_20240101.sql.gz
```

### Migrate from Existing Database

```bash
# Use migration script
docker compose exec backup /usr/local/bin/migrate-database.sh \
  --source-host old-server \
  --source-user old-user \
  --source-db old-database \
  --target-host postgres \
  --target-user servicedesk \
  --target-db servicedesk
```

## 🔐 SSL/HTTPS Setup

### Self-Signed (Development)

```bash
# Already generated by quick-start script
# Manual generation:
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout certificates/server.key \
  -out certificates/server.crt
```

### Let's Encrypt (Production)

```bash
# Install certbot
docker run -it --rm --name certbot \
  -v ./certificates:/etc/letsencrypt \
  certbot/certbot certonly \
  --webroot \
  --email admin@your-domain.com \
  -d your-domain.com
```

## 📈 Monitoring

### Access Monitoring Tools

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin)
- **Application Health**: http://localhost:4000/api/health

### Check Health

```bash
# Health check
curl http://localhost:4000/api/health | jq

# Container stats
docker stats

# Resource usage
docker compose top
```

## 🐛 Troubleshooting

### Container Won't Start

```bash
# Check logs
docker compose logs app

# Check environment
docker compose config

# Verify ports
sudo lsof -i :4000
```

### Database Connection Issues

```bash
# Test connection
docker compose exec postgres pg_isready

# Check credentials
docker compose exec postgres psql -U servicedesk -c "\l"
```

### Reset Everything

```bash
# WARNING: This removes all data!
docker compose down -v
docker system prune -a
```

## 🚢 Production Checklist

Before deploying to production:

- [ ] Configure strong passwords in .env
- [ ] Set up proper SSL certificates
- [ ] Configure email settings
- [ ] Set up automated backups
- [ ] Configure monitoring alerts
- [ ] Test restore procedures
- [ ] Set up firewall rules
- [ ] Configure log rotation
- [ ] Document recovery procedures
- [ ] Set resource limits

## 📚 Additional Resources

- [Full Docker Deployment Guide](DOCKER_DEPLOYMENT_GUIDE.md)
- [Docker Documentation](https://docs.docker.com)
- [Docker Compose Documentation](https://docs.docker.com/compose)
- [Prisma Documentation](https://www.prisma.io/docs)

## 🆘 Common Commands Reference

```bash
# Build images
docker compose build

# Start containers
docker compose up -d

# Stop containers
docker compose down

# View logs
docker compose logs -f

# Execute command in container
docker compose exec app sh

# Run Prisma Studio
docker compose exec app npx prisma studio

# Update dependencies
docker compose exec app npm update

# Clean up unused resources
docker system prune -a

# Backup database
docker compose exec backup /usr/local/bin/backup.sh

# Check health
curl http://localhost:4000/api/health
```

## 💡 Tips

1. **Development**: Use `docker-compose.dev.yml` for hot-reloading
2. **Production**: Always use `docker-compose.prod.yml` with proper secrets
3. **Logs**: Monitor logs regularly with `docker compose logs -f`
4. **Backups**: Test restore procedures before going live
5. **Updates**: Regularly update base images and dependencies
6. **Security**: Never commit .env files or secrets to git

---

For detailed instructions, see the [Complete Docker Deployment Guide](DOCKER_DEPLOYMENT_GUIDE.md)