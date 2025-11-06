# Dual PM2 Instance Setup

This guide explains how to run **Production** and **Development** instances simultaneously using PM2.

## Overview

The application can run two separate instances on the same server:

| Instance | URL | Port | Database | Certificate | Purpose |
|----------|-----|------|----------|-------------|---------|
| **Production** | https://hd.bsg.id:443 | 443 | servicedesk_database | Bank SulutGo wildcard | Live production environment |
| **Development** | https://[server-ip]:3000 | 3000 | servicedesk_database_development | Localhost | Testing and development |

## Initial Setup

### 1. Configure Development Environment

Edit `.env.development` and update the IP address:

```bash
# Change this line to your actual server IP
NEXTAUTH_URL="https://192.168.1.100:3000"
NEXT_PUBLIC_APP_URL="https://192.168.1.100:3000"
```

Also update the same IP in `ecosystem.config.js` (line 78-79).

### 2. Create Development Database

Run the setup script:

```bash
.\setup-dev-database.bat
```

This will:
- Create `servicedesk_database_development` database
- Run all Prisma migrations
- Generate Prisma client

**Optional:** Seed the development database with test data:

```bash
set DATABASE_URL=postgresql://postgres:admin@localhost:5432/servicedesk_database_development?schema=public
npx prisma db seed
```

## Management Commands

### Starting Instances

```bash
# Start production only
.\start-production.bat

# Start development only
.\start-development.bat

# Start both instances
.\start-both.bat
```

### Stopping Instances

```bash
# Stop all instances
.\stop-all.bat

# Stop specific instance
pm2 stop bsg-servicedesk        # Stop production
pm2 stop bsg-servicedesk-dev    # Stop development
```

### Restarting with Rebuild

```bash
# Rebuild and restart production
.\restart-production.bat

# Rebuild and restart development
.\restart-development.bat

# Quick restart without rebuild
pm2 restart bsg-servicedesk        # Restart production
pm2 restart bsg-servicedesk-dev    # Restart development
```

### Checking Status

```bash
# View status of all instances
.\status.bat

# Or use PM2 directly
pm2 status
pm2 list
```

### Viewing Logs

```bash
# View production logs
pm2 logs bsg-servicedesk

# View development logs
pm2 logs bsg-servicedesk-dev

# View both
pm2 logs

# View log files directly
type logs\pm2-out.log          # Production output
type logs\pm2-error.log        # Production errors
type logs\pm2-dev-out.log      # Development output
type logs\pm2-dev-error.log    # Development errors
```

## Key Differences

### Production Instance
- **Database**: `servicedesk_database` (production data)
- **Port**: 443 (HTTPS standard)
- **Domain**: hd.bsg.id
- **Certificate**: Bank SulutGo wildcard certificate
- **Auto-restart**: Yes
- **Memory limit**: 1GB
- **Logs**: `logs/pm2-out.log`, `logs/pm2-error.log`

### Development Instance
- **Database**: `servicedesk_database_development` (test data)
- **Port**: 3000
- **Access**: Server IP address
- **Certificate**: Localhost self-signed certificate
- **Auto-restart**: Yes
- **Memory limit**: 1GB
- **Logs**: `logs/pm2-dev-out.log`, `logs/pm2-dev-error.log`

## Common Workflows

### Testing Changes in Development

1. Make code changes
2. Rebuild development:
   ```bash
   .\restart-development.bat
   ```
3. Test at `https://[server-ip]:3000`
4. If good, apply to production:
   ```bash
   .\restart-production.bat
   ```

### Running Both Simultaneously

```bash
# Start both instances
.\start-both.bat

# Check status
.\status.bat

# View logs from both
pm2 logs
```

### Database Management

```bash
# Connect to production database
psql -U postgres -d servicedesk_database

# Connect to development database
psql -U postgres -d servicedesk_database_development

# Copy production data to development
pg_dump -U postgres servicedesk_database | psql -U postgres servicedesk_database_development
```

## Troubleshooting

### Port Already in Use

If port 443 or 3000 is already in use:

```bash
# Check what's using the port
netstat -ano | findstr :443
netstat -ano | findstr :3000

# Stop the process or change port in ecosystem.config.js
```

### Database Connection Issues

```bash
# Check if database exists
psql -U postgres -l

# Create development database if missing
psql -U postgres -c "CREATE DATABASE servicedesk_database_development;"

# Run migrations
set DATABASE_URL=postgresql://postgres:admin@localhost:5432/servicedesk_database_development?schema=public
npx prisma migrate deploy
```

### Certificate Issues

Development uses localhost certificate for HTTPS. If you get SSL warnings:
- This is normal for self-signed certificates
- Accept the warning in your browser
- Or access using HTTP (not recommended)

### PM2 Not Saving Configuration

```bash
# Manually save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

## Advanced Usage

### Environment-Specific Commands

```bash
# Use specific environment file
set NODE_ENV=development
npm run build

# Or specify in command
cross-env NODE_ENV=development npm run build
```

### PM2 Ecosystem File

Both instances are configured in `ecosystem.config.js`. You can modify:
- Memory limits (`max_memory_restart`)
- Environment variables (`env`)
- Log file locations
- Restart behavior

### Monitoring

```bash
# PM2 monitoring dashboard
pm2 monit

# Or use PM2 web interface
pm2 install pm2-server-monit
```

## Security Notes

1. **Separate Databases**: Production and development use different databases to prevent data mixing
2. **Different Ports**: No conflict between instances
3. **Certificate Security**: Production uses verified certificate, development uses localhost cert
4. **Environment Variables**: Each instance has its own environment configuration
5. **Access Control**: Production is on domain (hd.bsg.id), development is on IP

## Best Practices

1. **Always test in development first** before deploying to production
2. **Keep databases separate** - never point development to production database
3. **Use different credentials** for development if possible
4. **Rebuild after code changes** for changes to take effect
5. **Monitor both instances** regularly with `pm2 status`
6. **Check logs** if something doesn't work as expected
7. **Backup production database** before major changes

## Support

For issues or questions:
1. Check PM2 logs: `pm2 logs`
2. Check application logs in `logs/` directory
3. Verify database connections
4. Ensure ports are not blocked by firewall
5. Check PM2 is running: `pm2 status`

---

**Last Updated**: November 2025
**Version**: 2.8.0
