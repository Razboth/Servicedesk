#!/bin/bash

# Database restore script for PostgreSQL in Docker
# This script restores database from backup files

set -e

# Configuration
BACKUP_DIR="/backup"
POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-servicedesk}"
POSTGRES_USER="${POSTGRES_USER:-servicedesk}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Function to list available backups
list_backups() {
    log "Available backups:"
    echo

    if ls "${BACKUP_DIR}"/backup_*.sql.gz 1> /dev/null 2>&1; then
        i=1
        for backup in "${BACKUP_DIR}"/backup_*.sql.gz; do
            filename=$(basename "$backup")
            size=$(du -h "$backup" | cut -f1)
            date_created=$(stat -c %y "$backup" 2>/dev/null || stat -f "%Sm" "$backup" 2>/dev/null)

            # Extract metadata if available
            meta_file="${backup%.sql.gz}.meta"
            if [ -f "$meta_file" ]; then
                db_name=$(grep '"database"' "$meta_file" | cut -d'"' -f4 || echo "Unknown")
                echo -e "${BLUE}[$i]${NC} ${filename}"
                echo "    Database: ${db_name}"
                echo "    Size: ${size}"
                echo "    Created: ${date_created}"
            else
                echo -e "${BLUE}[$i]${NC} ${filename} (${size}) - ${date_created}"
            fi
            echo
            i=$((i+1))
        done
    else
        warning "No backup files found in ${BACKUP_DIR}"
        exit 1
    fi
}

# Function to select backup file
select_backup() {
    backups=(${BACKUP_DIR}/backup_*.sql.gz)

    if [ ${#backups[@]} -eq 0 ]; then
        error "No backup files found"
        exit 1
    fi

    if [ ${#backups[@]} -eq 1 ]; then
        BACKUP_FILE="${backups[0]}"
        log "Only one backup found, using: $(basename ${BACKUP_FILE})"
    else
        list_backups

        read -p "Select backup number to restore (or enter filename): " selection

        # Check if user entered a number
        if [[ "$selection" =~ ^[0-9]+$ ]]; then
            index=$((selection-1))
            if [ $index -ge 0 ] && [ $index -lt ${#backups[@]} ]; then
                BACKUP_FILE="${backups[$index]}"
            else
                error "Invalid selection"
                exit 1
            fi
        else
            # User entered a filename
            if [ -f "${BACKUP_DIR}/$selection" ]; then
                BACKUP_FILE="${BACKUP_DIR}/$selection"
            elif [ -f "$selection" ]; then
                BACKUP_FILE="$selection"
            else
                error "Backup file not found: $selection"
                exit 1
            fi
        fi
    fi

    log "Selected backup: $(basename ${BACKUP_FILE})"
}

# Function to create a safety backup before restore
create_safety_backup() {
    log "Creating safety backup of current database..."

    SAFETY_BACKUP="${BACKUP_DIR}/safety_backup_$(date +%Y%m%d_%H%M%S).sql.gz"

    if PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
        -h "${POSTGRES_HOST}" \
        -p "${POSTGRES_PORT}" \
        -U "${POSTGRES_USER}" \
        -d "${POSTGRES_DB}" \
        --no-owner \
        --no-privileges \
        | gzip > "${SAFETY_BACKUP}"; then
        log "Safety backup created: $(basename ${SAFETY_BACKUP})"
        return 0
    else
        warning "Failed to create safety backup"
        return 1
    fi
}

# Function to restore database
perform_restore() {
    local backup_file=$1

    log "Starting database restore from: $(basename ${backup_file})"

    # Check if file exists
    if [ ! -f "${backup_file}" ]; then
        error "Backup file not found: ${backup_file}"
        exit 1
    fi

    # Decompress and restore
    info "Decompressing and restoring database..."

    # First, drop existing connections to the database
    log "Terminating existing connections to database..."
    PGPASSWORD="${POSTGRES_PASSWORD}" psql \
        -h "${POSTGRES_HOST}" \
        -p "${POSTGRES_PORT}" \
        -U "${POSTGRES_USER}" \
        -d postgres \
        -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${POSTGRES_DB}' AND pid <> pg_backend_pid();" \
        2>/dev/null || true

    # Restore the database
    if gunzip -c "${backup_file}" | PGPASSWORD="${POSTGRES_PASSWORD}" psql \
        -h "${POSTGRES_HOST}" \
        -p "${POSTGRES_PORT}" \
        -U "${POSTGRES_USER}" \
        -d postgres \
        -v ON_ERROR_STOP=1; then

        log "Database restored successfully"
        return 0
    else
        error "Database restore failed!"
        return 1
    fi
}

# Function to verify restore
verify_restore() {
    log "Verifying database restore..."

    # Check if we can connect to the database
    if PGPASSWORD="${POSTGRES_PASSWORD}" pg_isready \
        -h "${POSTGRES_HOST}" \
        -p "${POSTGRES_PORT}" \
        -U "${POSTGRES_USER}" \
        -d "${POSTGRES_DB}"; then

        # Count tables
        TABLE_COUNT=$(PGPASSWORD="${POSTGRES_PASSWORD}" psql \
            -h "${POSTGRES_HOST}" \
            -p "${POSTGRES_PORT}" \
            -U "${POSTGRES_USER}" \
            -d "${POSTGRES_DB}" \
            -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" \
            | xargs)

        log "Database is accessible. Found ${TABLE_COUNT} tables"
        return 0
    else
        error "Cannot connect to restored database"
        return 1
    fi
}

# Function to run Prisma migrations after restore
run_migrations() {
    if [ -f "/app/prisma/schema.prisma" ]; then
        log "Running Prisma migrations..."

        cd /app
        if npx prisma migrate deploy; then
            log "Migrations completed successfully"
        else
            warning "Migrations failed - manual intervention may be required"
        fi
    else
        info "Skipping migrations - Prisma schema not found"
    fi
}

# Main execution
main() {
    log "=== Database Restore Script ==="
    log "Target database: ${POSTGRES_DB}"
    log "Host: ${POSTGRES_HOST}"
    log "Backup directory: ${BACKUP_DIR}"
    echo

    # Check if PostgreSQL is accessible
    if ! PGPASSWORD="${POSTGRES_PASSWORD}" pg_isready \
        -h "${POSTGRES_HOST}" \
        -p "${POSTGRES_PORT}" \
        -U "${POSTGRES_USER}"; then
        error "Cannot connect to PostgreSQL server"
        exit 1
    fi

    # Check for command line argument
    if [ $# -eq 1 ]; then
        if [ "$1" == "--list" ]; then
            list_backups
            exit 0
        elif [ -f "$1" ]; then
            BACKUP_FILE="$1"
            log "Using backup file: $(basename ${BACKUP_FILE})"
        else
            error "Backup file not found: $1"
            exit 1
        fi
    else
        # Interactive mode - select backup
        select_backup
    fi

    # Confirm restore
    warning "This will replace the current database with the backup!"
    read -p "Are you sure you want to continue? (yes/no): " confirm

    if [ "$confirm" != "yes" ]; then
        log "Restore cancelled"
        exit 0
    fi

    # Create safety backup
    info "Creating safety backup before restore..."
    create_safety_backup

    # Perform restore
    if perform_restore "${BACKUP_FILE}"; then
        # Verify restore
        if verify_restore; then
            # Run migrations
            run_migrations

            log "=== Database restore completed successfully ==="
            info "Safety backup is available at: $(basename ${SAFETY_BACKUP})"
            exit 0
        else
            error "Restore verification failed"

            # Attempt to restore from safety backup
            if [ -n "${SAFETY_BACKUP}" ] && [ -f "${SAFETY_BACKUP}" ]; then
                warning "Attempting to restore from safety backup..."
                if perform_restore "${SAFETY_BACKUP}"; then
                    log "Restored from safety backup"
                else
                    error "Failed to restore from safety backup - manual intervention required!"
                fi
            fi
            exit 1
        fi
    else
        error "Restore process failed"

        # Attempt to restore from safety backup
        if [ -n "${SAFETY_BACKUP}" ] && [ -f "${SAFETY_BACKUP}" ]; then
            warning "Attempting to restore from safety backup..."
            if perform_restore "${SAFETY_BACKUP}"; then
                log "Restored from safety backup"
                exit 0
            else
                error "Failed to restore from safety backup - manual intervention required!"
            fi
        fi
        exit 1
    fi
}

# Show usage
if [ "$1" == "--help" ]; then
    echo "Usage: $0 [backup_file|--list]"
    echo ""
    echo "Options:"
    echo "  backup_file    Path to backup file to restore"
    echo "  --list         List available backups"
    echo "  --help         Show this help message"
    echo ""
    echo "If no arguments provided, interactive mode will be used"
    exit 0
fi

# Run main function
main "$@"