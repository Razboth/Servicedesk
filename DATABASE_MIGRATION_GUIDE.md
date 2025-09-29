# Database Migration Guide - Windows to Linux

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Creating Database Dump on Windows](#creating-database-dump-on-windows)
3. [Transferring Dump to Linux Server](#transferring-dump-to-linux-server)
4. [Restoring Database on Linux](#restoring-database-on-linux)
5. [Verification & Troubleshooting](#verification--troubleshooting)

---

## Prerequisites

### On Windows Machine
- PostgreSQL installed (with pg_dump utility)
- Access to the ServiceDesk database
- Command Prompt or PowerShell with admin privileges
- WinSCP or similar file transfer tool (optional)

### On Linux Server
- PostgreSQL installed and running
- Sufficient disk space for the database dump
- SSH access with sudo privileges

---

## Creating Database Dump on Windows

### Method 1: Using Command Prompt

#### Step 1: Open Command Prompt as Administrator
```cmd
# Press Win + X and select "Command Prompt (Admin)"
# Or search for "cmd" and run as administrator
```

#### Step 2: Navigate to PostgreSQL bin directory
```cmd
# Default PostgreSQL 15 location
cd "C:\Program Files\PostgreSQL\15\bin"

# Or PostgreSQL 14
cd "C:\Program Files\PostgreSQL\14\bin"

# Verify pg_dump exists
dir pg_dump.exe
```

#### Step 3: Create Database Dump
```cmd
# Full database dump with all data
pg_dump -h localhost -p 5432 -U postgres -d servicedesk -F c -b -v -f "C:\backup\servicedesk_dump.backup"

# Alternative: Plain SQL format (larger but more portable)
pg_dump -h localhost -p 5432 -U postgres -d servicedesk -f "C:\backup\servicedesk_dump.sql"

# With specific options for better compatibility
pg_dump -h localhost -p 5432 -U postgres -d servicedesk --no-owner --no-privileges --no-tablespaces -F c -b -v -f "C:\backup\servicedesk_dump.backup"
```

**Parameters explained:**
- `-h localhost`: Database host
- `-p 5432`: PostgreSQL port
- `-U postgres`: Database user
- `-d servicedesk`: Database name
- `-F c`: Custom format (compressed)
- `-b`: Include large objects
- `-v`: Verbose mode
- `--no-owner`: Don't output ownership commands
- `--no-privileges`: Don't output privilege commands
- `-f`: Output file path

#### Step 4: Create Data-Only Dump (Optional - for existing schema)
```cmd
# If schema already exists on Linux, dump only data
pg_dump -h localhost -p 5432 -U postgres -d servicedesk --data-only -F c -v -f "C:\backup\servicedesk_data_only.backup"
```

### Method 2: Using pgAdmin 4

1. **Open pgAdmin 4**
2. **Connect to your server**
3. **Right-click on the database** → "Backup..."
4. **Configure backup:**
   - Filename: `C:\backup\servicedesk_dump.backup`
   - Format: Custom
   - Encoding: UTF8
   - Role name: (leave blank)
   - Options:
     - ✓ Pre-data
     - ✓ Data
     - ✓ Post-data
     - ✓ Blobs
     - ✓ Use INSERT commands
     - ✓ Include CREATE DATABASE
5. **Click "Backup"**

### Method 3: Using PowerShell Script

Create `backup_database.ps1`:
```powershell
# Database backup script for Windows
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = "C:\backup"
$dbName = "servicedesk"
$dbUser = "postgres"
$dbHost = "localhost"
$dbPort = "5432"

# Create backup directory if not exists
if (!(Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir
}

# Set PostgreSQL password (alternative: use .pgpass file)
$env:PGPASSWORD = Read-Host -Prompt "Enter PostgreSQL password" -AsSecureString

# Create backup filename with timestamp
$backupFile = "$backupDir\${dbName}_${timestamp}.backup"

# Execute pg_dump
Write-Host "Creating database backup..." -ForegroundColor Green
& "C:\Program Files\PostgreSQL\15\bin\pg_dump.exe" `
    -h $dbHost `
    -p $dbPort `
    -U $dbUser `
    -d $dbName `
    -F c `
    -b `
    -v `
    --no-owner `
    --no-privileges `
    -f $backupFile

if ($LASTEXITCODE -eq 0) {
    Write-Host "Backup created successfully: $backupFile" -ForegroundColor Green

    # Get file size
    $fileSize = (Get-Item $backupFile).Length / 1MB
    Write-Host "Backup size: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Cyan
} else {
    Write-Host "Backup failed!" -ForegroundColor Red
}

# Clear password from environment
Remove-Item Env:\PGPASSWORD
```

Run the script:
```powershell
# Run in PowerShell
.\backup_database.ps1
```

---

## Transferring Dump to Linux Server

### Method 1: Using SCP from Windows (Git Bash)

If you have Git Bash installed:
```bash
# Open Git Bash
# Transfer the backup file
scp C:/backup/servicedesk_dump.backup username@your_server_ip:/tmp/

# Or with specific port
scp -P 22 C:/backup/servicedesk_dump.backup username@your_server_ip:/tmp/
```

### Method 2: Using WinSCP (GUI)

1. **Download and install WinSCP** from https://winscp.net
2. **Create new connection:**
   - Protocol: SFTP
   - Host: your_server_ip
   - Port: 22
   - Username: your_username
3. **Connect and navigate** to `/tmp/` on the server
4. **Drag and drop** the backup file from Windows to Linux

### Method 3: Using PowerShell (Windows 10/11)

```powershell
# Using built-in OpenSSH client
scp C:\backup\servicedesk_dump.backup username@your_server_ip:/tmp/
```

### Method 4: Using PuTTY's PSCP

```cmd
# Download pscp.exe from PuTTY website
# Run from command prompt
pscp -P 22 C:\backup\servicedesk_dump.backup username@your_server_ip:/tmp/
```

### Method 5: Using cloud storage (Alternative)

```bash
# On Windows: Upload to cloud storage (Google Drive, Dropbox, etc.)
# On Linux: Download using wget or curl
wget "https://your-cloud-storage-link/servicedesk_dump.backup" -O /tmp/servicedesk_dump.backup
```

---

## Restoring Database on Linux

### Step 1: Connect to Linux Server
```bash
# SSH into your server
ssh username@your_server_ip
```

### Step 2: Prepare for Restoration
```bash
# Switch to postgres user
sudo -u postgres -i

# Check if database exists
psql -l | grep servicedesk

# If database exists and you want to drop it (CAREFUL!)
dropdb servicedesk

# Create fresh database
createdb -O servicedesk servicedesk

# Exit postgres user
exit
```

### Step 3: Restore Database

#### Option A: Restore with pg_restore (for .backup files)
```bash
# Navigate to dump location
cd /tmp

# Check file exists and size
ls -lh servicedesk_dump.backup

# Restore as postgres user (recommended)
sudo -u postgres pg_restore \
    -d servicedesk \
    -v \
    --no-owner \
    --no-privileges \
    --role=servicedesk \
    /tmp/servicedesk_dump.backup

# Alternative: Restore with specific options
sudo -u postgres pg_restore \
    -d servicedesk \
    -v \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    --no-tablespaces \
    --disable-triggers \
    --role=servicedesk \
    /tmp/servicedesk_dump.backup
```

#### Option B: Restore SQL dump (for .sql files)
```bash
# For plain SQL dumps
sudo -u postgres psql -d servicedesk -f /tmp/servicedesk_dump.sql

# Or with progress output
sudo -u postgres psql -d servicedesk -f /tmp/servicedesk_dump.sql -a
```

#### Option C: Restore with error handling
```bash
# Create restoration script
cat > /tmp/restore_db.sh << 'EOF'
#!/bin/bash

BACKUP_FILE="/tmp/servicedesk_dump.backup"
DB_NAME="servicedesk"
DB_USER="servicedesk"
LOG_FILE="/tmp/restore_$(date +%Y%m%d_%H%M%S).log"

echo "Starting database restoration..." | tee -a $LOG_FILE
echo "Backup file: $BACKUP_FILE" | tee -a $LOG_FILE
echo "Target database: $DB_NAME" | tee -a $LOG_FILE
echo "Log file: $LOG_FILE" | tee -a $LOG_FILE

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERROR: Backup file not found!" | tee -a $LOG_FILE
    exit 1
fi

# Drop and recreate database
echo "Dropping existing database..." | tee -a $LOG_FILE
sudo -u postgres dropdb --if-exists $DB_NAME 2>&1 | tee -a $LOG_FILE

echo "Creating new database..." | tee -a $LOG_FILE
sudo -u postgres createdb -O $DB_USER $DB_NAME 2>&1 | tee -a $LOG_FILE

# Restore database
echo "Restoring database..." | tee -a $LOG_FILE
sudo -u postgres pg_restore \
    -d $DB_NAME \
    -v \
    --no-owner \
    --no-privileges \
    --role=$DB_USER \
    $BACKUP_FILE 2>&1 | tee -a $LOG_FILE

if [ $? -eq 0 ]; then
    echo "Database restored successfully!" | tee -a $LOG_FILE
else
    echo "ERROR: Restoration failed! Check log file: $LOG_FILE" | tee -a $LOG_FILE
    exit 1
fi

# Run ANALYZE to update statistics
echo "Updating database statistics..." | tee -a $LOG_FILE
sudo -u postgres psql -d $DB_NAME -c "ANALYZE;" 2>&1 | tee -a $LOG_FILE

echo "Restoration complete!" | tee -a $LOG_FILE
EOF

# Make script executable
chmod +x /tmp/restore_db.sh

# Run restoration
/tmp/restore_db.sh
```

### Step 4: Fix Permissions and Ownership
```bash
# Grant all privileges to servicedesk user
sudo -u postgres psql -d servicedesk << EOF
-- Grant all privileges on database
GRANT ALL PRIVILEGES ON DATABASE servicedesk TO servicedesk;

-- Grant all privileges on all tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO servicedesk;

-- Grant all privileges on all sequences
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO servicedesk;

-- Grant all privileges on all functions
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO servicedesk;

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO servicedesk;

-- Make servicedesk owner of all tables (optional)
DO \$\$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE 'ALTER TABLE public.' || r.tablename || ' OWNER TO servicedesk';
    END LOOP;
END\$\$;

-- Make servicedesk owner of all sequences
DO \$\$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT sequencename FROM pg_sequences WHERE schemaname = 'public'
    LOOP
        EXECUTE 'ALTER SEQUENCE public.' || r.sequencename || ' OWNER TO servicedesk';
    END LOOP;
END\$\$;
EOF
```

### Step 5: Run Prisma Migrations (Important!)
```bash
# Navigate to application directory
cd /var/www/servicedesk/app

# Switch to servicedesk user
sudo -u servicedesk bash

# Generate Prisma client
npx prisma generate

# Run migrations to ensure schema is up to date
npx prisma migrate deploy

# If there are pending migrations, apply them
npx prisma db push

# Exit servicedesk user
exit
```

### Step 6: Verify Database Connection
```bash
# Test connection from application
cd /var/www/servicedesk/app
sudo -u servicedesk npm run db:studio

# Or test with psql
sudo -u postgres psql -d servicedesk -c "\dt"
```

---

## Verification & Troubleshooting

### Verify Data Integrity

#### Check Table Count
```bash
# Count tables
sudo -u postgres psql -d servicedesk -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"

# List all tables
sudo -u postgres psql -d servicedesk -c "\dt"

# Check record counts for important tables
sudo -u postgres psql -d servicedesk << EOF
SELECT 'Users' as table_name, COUNT(*) as count FROM "User"
UNION ALL
SELECT 'Tickets', COUNT(*) FROM "Ticket"
UNION ALL
SELECT 'Services', COUNT(*) FROM "Service"
UNION ALL
SELECT 'Branches', COUNT(*) FROM "Branch";
EOF
```

#### Verify Application Data
```bash
# Create verification script
cat > /tmp/verify_db.sql << 'EOF'
-- Check database size
SELECT pg_database_size('servicedesk')/1024/1024 as size_mb;

-- Check table sizes
SELECT
    schemaname AS schema,
    tablename AS table,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;

-- Check for critical tables
SELECT
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'User') as has_users,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'Ticket') as has_tickets,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'Service') as has_services,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'Branch') as has_branches;

-- Check indexes
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 10;
EOF

# Run verification
sudo -u postgres psql -d servicedesk -f /tmp/verify_db.sql
```

### Common Issues and Solutions

#### Issue 1: Permission Denied
```bash
# Error: permission denied for schema public
# Solution: Grant permissions
sudo -u postgres psql -d servicedesk -c "GRANT ALL ON SCHEMA public TO servicedesk;"
```

#### Issue 2: Role Does Not Exist
```bash
# Error: role "servicedesk" does not exist
# Solution: Create role before restore
sudo -u postgres psql << EOF
CREATE ROLE servicedesk WITH LOGIN PASSWORD 'your_password';
ALTER ROLE servicedesk CREATEDB;
EOF
```

#### Issue 3: Encoding Mismatch
```bash
# Error: encoding "WIN1252" does not match locale
# Solution: Create database with specific encoding
sudo -u postgres createdb -O servicedesk -E UTF8 -T template0 servicedesk
```

#### Issue 4: Version Mismatch
```bash
# Error: unsupported version (1.14) in file header
# Solution: Use matching PostgreSQL versions or upgrade
# Check versions
pg_dump --version  # On Windows
psql --version     # On Linux

# If different, use plain SQL format instead
# On Windows:
pg_dump -h localhost -U postgres -d servicedesk -f servicedesk.sql

# On Linux:
sudo -u postgres psql -d servicedesk -f servicedesk.sql
```

#### Issue 5: Large Database Size
```bash
# For large databases, use compression and split files
# On Windows:
pg_dump -h localhost -U postgres -d servicedesk | gzip > servicedesk_dump.sql.gz

# Transfer and restore on Linux:
gunzip -c servicedesk_dump.sql.gz | sudo -u postgres psql -d servicedesk
```

### Post-Restoration Tasks

#### 1. Update Application Configuration
```bash
# Update .env file with new database credentials
nano /var/www/servicedesk/app/.env

# Ensure DATABASE_URL is correct
DATABASE_URL="postgresql://servicedesk:your_password@localhost:5432/servicedesk"
```

#### 2. Clear Application Cache
```bash
# Clear Next.js cache
rm -rf /var/www/servicedesk/app/.next/cache
```

#### 3. Restart Application
```bash
# Restart PM2 processes
pm2 restart all

# Check application status
pm2 status

# View logs
pm2 logs --lines 50
```

#### 4. Test Application
```bash
# Test database connection
cd /var/www/servicedesk/app
sudo -u servicedesk npx prisma db push --accept-data-loss=false

# Test application endpoints
curl -I http://localhost:4000
```

### Backup Restoration Log
Create a restoration log for documentation:
```bash
cat > /var/www/servicedesk/restoration_log.md << EOF
# Database Restoration Log

**Date**: $(date)
**Source**: Windows Development Machine
**Target**: Linux Production Server
**Database**: servicedesk
**Backup File**: servicedesk_dump.backup
**Size**: $(ls -lh /tmp/servicedesk_dump.backup | awk '{print $5}')

## Restoration Steps Completed:
- [x] Database backup created on Windows
- [x] Backup transferred to Linux server
- [x] Database dropped and recreated
- [x] Data restored successfully
- [x] Permissions fixed
- [x] Prisma migrations applied
- [x] Application restarted
- [x] Verification completed

## Record Counts:
$(sudo -u postgres psql -d servicedesk -t -c "SELECT 'Users: ' || COUNT(*) FROM \"User\" UNION ALL SELECT 'Tickets: ' || COUNT(*) FROM \"Ticket\" UNION ALL SELECT 'Services: ' || COUNT(*) FROM \"Service\" UNION ALL SELECT 'Branches: ' || COUNT(*) FROM \"Branch\";")

## Notes:
- All data transferred successfully
- No errors during restoration
- Application running normally

**Restored by**: $(whoami)
EOF
```

---

## Automated Migration Script

Create a complete migration script that handles everything:

```bash
cat > /home/servicedesk/migrate_database.sh << 'SCRIPT'
#!/bin/bash

###########################################
# ServiceDesk Database Migration Script
# Migrates database from Windows to Linux
###########################################

set -e  # Exit on error

# Configuration
BACKUP_FILE="$1"
DB_NAME="servicedesk"
DB_USER="servicedesk"
DB_PASS="your_secure_password"
APP_DIR="/var/www/servicedesk/app"
LOG_DIR="/var/log/servicedesk"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$LOG_DIR/migration_$TIMESTAMP.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a $LOG_FILE
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a $LOG_FILE
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a $LOG_FILE
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."

    # Check if run as root or with sudo
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root or with sudo"
    fi

    # Check backup file
    if [ -z "$BACKUP_FILE" ]; then
        error "Usage: $0 <backup_file>"
    fi

    if [ ! -f "$BACKUP_FILE" ]; then
        error "Backup file not found: $BACKUP_FILE"
    fi

    # Check PostgreSQL
    if ! command -v psql &> /dev/null; then
        error "PostgreSQL is not installed"
    fi

    # Check PM2
    if ! command -v pm2 &> /dev/null; then
        error "PM2 is not installed"
    fi

    log "Prerequisites check passed"
}

# Backup current database (if exists)
backup_current_db() {
    log "Checking for existing database..."

    if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
        warning "Database $DB_NAME exists. Creating backup..."

        BACKUP_DIR="/backup/pre-migration"
        mkdir -p $BACKUP_DIR

        sudo -u postgres pg_dump -d $DB_NAME -F c -f "$BACKUP_DIR/pre_migration_$TIMESTAMP.backup"

        if [ $? -eq 0 ]; then
            log "Existing database backed up to $BACKUP_DIR/pre_migration_$TIMESTAMP.backup"
        else
            error "Failed to backup existing database"
        fi
    else
        log "No existing database found"
    fi
}

# Stop application
stop_application() {
    log "Stopping application..."

    if pm2 list | grep -q "online"; then
        pm2 stop all
        log "PM2 processes stopped"
    else
        log "No running PM2 processes found"
    fi
}

# Drop and recreate database
prepare_database() {
    log "Preparing database..."

    # Drop existing database
    sudo -u postgres dropdb --if-exists $DB_NAME
    log "Dropped existing database (if any)"

    # Create new database
    sudo -u postgres createdb -O $DB_USER $DB_NAME
    log "Created new database: $DB_NAME"

    # Set permissions
    sudo -u postgres psql << EOF
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER DATABASE $DB_NAME OWNER TO $DB_USER;
EOF

    log "Database permissions set"
}

# Restore database
restore_database() {
    log "Starting database restoration..."
    log "Backup file: $BACKUP_FILE"
    log "Size: $(ls -lh $BACKUP_FILE | awk '{print $5}')"

    # Determine backup format
    if file "$BACKUP_FILE" | grep -q "PostgreSQL custom database dump"; then
        log "Detected custom format backup"

        sudo -u postgres pg_restore \
            -d $DB_NAME \
            -v \
            --no-owner \
            --no-privileges \
            --role=$DB_USER \
            "$BACKUP_FILE" 2>&1 | tee -a $LOG_FILE

    elif file "$BACKUP_FILE" | grep -q "ASCII text"; then
        log "Detected SQL format backup"

        sudo -u postgres psql -d $DB_NAME -f "$BACKUP_FILE" 2>&1 | tee -a $LOG_FILE

    else
        error "Unknown backup format"
    fi

    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        log "Database restored successfully"
    else
        warning "Restoration completed with warnings (check log)"
    fi
}

# Fix permissions
fix_permissions() {
    log "Fixing database permissions..."

    sudo -u postgres psql -d $DB_NAME << EOF
-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO $DB_USER;
GRANT USAGE ON SCHEMA public TO $DB_USER;

-- Fix ownership
DO \$\$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE 'ALTER TABLE public.' || r.tablename || ' OWNER TO $DB_USER';
    END LOOP;
END\$\$;

-- Update statistics
ANALYZE;
EOF

    log "Permissions fixed"
}

# Run Prisma migrations
run_migrations() {
    log "Running Prisma migrations..."

    cd $APP_DIR

    # Generate Prisma client
    sudo -u servicedesk npx prisma generate

    # Deploy migrations
    sudo -u servicedesk npx prisma migrate deploy

    if [ $? -eq 0 ]; then
        log "Prisma migrations completed"
    else
        warning "Prisma migrations may have issues"
    fi
}

# Verify restoration
verify_restoration() {
    log "Verifying database restoration..."

    # Get table count
    TABLE_COUNT=$(sudo -u postgres psql -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
    log "Tables restored: $TABLE_COUNT"

    # Get record counts
    sudo -u postgres psql -d $DB_NAME << EOF | tee -a $LOG_FILE
SELECT 'Users' as table_name, COUNT(*) as count FROM "User"
UNION ALL SELECT 'Tickets', COUNT(*) FROM "Ticket"
UNION ALL SELECT 'Services', COUNT(*) FROM "Service"
UNION ALL SELECT 'Branches', COUNT(*) FROM "Branch"
UNION ALL SELECT 'Categories', COUNT(*) FROM "Category";
EOF

    # Check database size
    DB_SIZE=$(sudo -u postgres psql -d $DB_NAME -t -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));")
    log "Database size: $DB_SIZE"
}

# Start application
start_application() {
    log "Starting application..."

    cd $APP_DIR

    # Clear cache
    rm -rf .next/cache

    # Start PM2
    pm2 start ecosystem.config.js
    pm2 save

    sleep 5

    # Check status
    if pm2 list | grep -q "online"; then
        log "Application started successfully"
        pm2 status
    else
        error "Failed to start application"
    fi
}

# Main execution
main() {
    log "========================================="
    log "ServiceDesk Database Migration Starting"
    log "========================================="

    check_prerequisites
    backup_current_db
    stop_application
    prepare_database
    restore_database
    fix_permissions
    run_migrations
    verify_restoration
    start_application

    log "========================================="
    log "Migration Completed Successfully!"
    log "========================================="
    log "Log file: $LOG_FILE"
    log ""
    log "Next steps:"
    log "1. Test application functionality"
    log "2. Verify all data is present"
    log "3. Check application logs: pm2 logs"
    log "4. Monitor for any issues"
}

# Create log directory
mkdir -p $LOG_DIR

# Run main function
main

SCRIPT

# Make script executable
chmod +x /home/servicedesk/migrate_database.sh

echo "Migration script created at: /home/servicedesk/migrate_database.sh"
echo "Usage: sudo ./migrate_database.sh /path/to/backup_file"
```

---

## Quick Reference Commands

### On Windows (Create Dump)
```cmd
# Quick dump command
pg_dump -h localhost -U postgres -d servicedesk -F c --no-owner --no-privileges -f servicedesk_backup.backup
```

### Transfer
```bash
# Quick transfer
scp servicedesk_backup.backup user@server:/tmp/
```

### On Linux (Restore)
```bash
# Quick restore
sudo ./migrate_database.sh /tmp/servicedesk_backup.backup
```

### Verify
```bash
# Quick verification
pm2 status
curl http://localhost:4000
```

---

## Important Notes

1. **Always backup** before any migration
2. **Test in staging** environment first
3. **Check PostgreSQL versions** for compatibility
4. **Monitor logs** during restoration
5. **Verify data integrity** after migration
6. **Keep the backup file** until you confirm everything works
7. **Document the process** for future reference

## Support Resources

- PostgreSQL Documentation: https://www.postgresql.org/docs/
- Prisma Migration Guide: https://www.prisma.io/docs/guides/deployment
- PM2 Documentation: https://pm2.keymetrics.io/docs/