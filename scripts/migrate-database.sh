#!/bin/bash

# ==========================================================
# Bank SulutGo ServiceDesk - Database Migration Script
# ==========================================================
# Script untuk mengupgrade database lama ke schema terbaru
#
# Penggunaan:
#   ./scripts/migrate-database.sh [OPTIONS]
#
# Options:
#   -h, --host      Database host (default: localhost)
#   -p, --port      Database port (default: 5432)
#   -d, --database  Database name (default: servicedesk_database)
#   -u, --user      Database user (default: postgres)
#   -b, --backup    Create backup before migration (recommended)
#   --skip-backup   Skip backup step
#   --dry-run       Show what would be done without executing
#
# ==========================================================

set -e

# Default values
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="servicedesk_database"
DB_USER="postgres"
CREATE_BACKUP=true
DRY_RUN=false
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/backups"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --host      Database host (default: localhost)"
    echo "  -p, --port      Database port (default: 5432)"
    echo "  -d, --database  Database name (default: servicedesk_database)"
    echo "  -u, --user      Database user (default: postgres)"
    echo "  -b, --backup    Create backup before migration (default: enabled)"
    echo "  --skip-backup   Skip backup step"
    echo "  --dry-run       Show what would be done without executing"
    echo "  --help          Show this help message"
    echo ""
    echo "Example:"
    echo "  $0 -d my_database -u postgres -b"
    echo "  $0 --skip-backup --dry-run"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--host)
            DB_HOST="$2"
            shift 2
            ;;
        -p|--port)
            DB_PORT="$2"
            shift 2
            ;;
        -d|--database)
            DB_NAME="$2"
            shift 2
            ;;
        -u|--user)
            DB_USER="$2"
            shift 2
            ;;
        -b|--backup)
            CREATE_BACKUP=true
            shift
            ;;
        --skip-backup)
            CREATE_BACKUP=false
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --help)
            show_usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Header
echo ""
echo "=========================================================="
echo "  Bank SulutGo ServiceDesk - Database Migration"
echo "=========================================================="
echo ""

# Show configuration
log_info "Configuration:"
echo "  Database Host: $DB_HOST"
echo "  Database Port: $DB_PORT"
echo "  Database Name: $DB_NAME"
echo "  Database User: $DB_USER"
echo "  Create Backup: $CREATE_BACKUP"
echo "  Dry Run: $DRY_RUN"
echo ""

# Check if psql is available
if ! command -v psql &> /dev/null; then
    log_error "psql command not found. Please install PostgreSQL client."
    exit 1
fi

# Check if pg_dump is available (for backup)
if $CREATE_BACKUP && ! command -v pg_dump &> /dev/null; then
    log_error "pg_dump command not found. Please install PostgreSQL client."
    exit 1
fi

# Test database connection
log_info "Testing database connection..."
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    log_error "Cannot connect to database. Please check your credentials."
    echo "  You may need to set PGPASSWORD environment variable or configure ~/.pgpass"
    exit 1
fi
log_success "Database connection successful"

# Create backup
if $CREATE_BACKUP; then
    log_info "Creating database backup..."

    # Create backup directory
    mkdir -p "$BACKUP_DIR"

    # Generate backup filename with timestamp
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_backup_${TIMESTAMP}.sql"

    if $DRY_RUN; then
        log_info "[DRY-RUN] Would create backup: $BACKUP_FILE"
    else
        if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -F p -f "$BACKUP_FILE"; then
            log_success "Backup created: $BACKUP_FILE"

            # Compress backup
            if command -v gzip &> /dev/null; then
                gzip "$BACKUP_FILE"
                log_success "Backup compressed: ${BACKUP_FILE}.gz"
            fi
        else
            log_error "Failed to create backup"
            exit 1
        fi
    fi
else
    log_warning "Skipping backup (--skip-backup)"
fi

# Run migration SQL
log_info "Running database migration..."

if $DRY_RUN; then
    log_info "[DRY-RUN] Would execute: $SCRIPT_DIR/migrate-database.sql"
    log_info "[DRY-RUN] Preview of migration script:"
    head -50 "$SCRIPT_DIR/migrate-database.sql"
    echo "..."
else
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SCRIPT_DIR/migrate-database.sql"; then
        log_success "SQL migration completed"
    else
        log_error "SQL migration failed"
        if $CREATE_BACKUP; then
            log_info "To restore from backup, run:"
            echo "  gunzip -c ${BACKUP_FILE}.gz | psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"
        fi
        exit 1
    fi
fi

# Sync Prisma schema
log_info "Syncing Prisma schema..."

if $DRY_RUN; then
    log_info "[DRY-RUN] Would run: npx prisma generate"
    log_info "[DRY-RUN] Would run: npx prisma db push --accept-data-loss"
else
    cd "$PROJECT_DIR"

    log_info "Generating Prisma client..."
    if npx prisma generate; then
        log_success "Prisma client generated"
    else
        log_error "Failed to generate Prisma client"
        exit 1
    fi

    log_info "Pushing schema to database..."
    if npx prisma db push --accept-data-loss; then
        log_success "Schema pushed to database"
    else
        log_warning "Some schema changes may need manual review"
    fi
fi

# Run seed data (optional)
echo ""
read -p "Do you want to run seed data for new tables? (y/N) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "Running seed data..."

    if $DRY_RUN; then
        log_info "[DRY-RUN] Would run: npx prisma db seed"
    else
        cd "$PROJECT_DIR"
        if npx prisma db seed; then
            log_success "Seed data completed"
        else
            log_warning "Seed data had issues (this may be normal if data already exists)"
        fi
    fi
fi

# Summary
echo ""
echo "=========================================================="
echo "  Migration Summary"
echo "=========================================================="
echo ""

if $DRY_RUN; then
    log_info "This was a DRY RUN - no changes were made"
else
    log_success "Database migration completed successfully!"
    echo ""
    log_info "Next steps:"
    echo "  1. Verify your application works correctly"
    echo "  2. Test new features (Shift Reports, PC Management, etc.)"
    echo "  3. If issues occur, restore from backup:"

    if $CREATE_BACKUP; then
        echo "     gunzip -c ${BACKUP_FILE}.gz | psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"
    fi
fi

echo ""
echo "=========================================================="
