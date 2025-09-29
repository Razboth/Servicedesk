#!/bin/bash

# Database backup script for PostgreSQL in Docker
# This script creates timestamped backups and manages retention

set -e

# Configuration
BACKUP_DIR="/backup"
POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-servicedesk}"
POSTGRES_USER="${POSTGRES_USER:-servicedesk}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILENAME="backup_${POSTGRES_DB}_${TIMESTAMP}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

# Function to perform backup
perform_backup() {
    log "Starting database backup for ${POSTGRES_DB}..."

    # Create SQL dump
    if PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
        -h "${POSTGRES_HOST}" \
        -p "${POSTGRES_PORT}" \
        -U "${POSTGRES_USER}" \
        -d "${POSTGRES_DB}" \
        -f "${BACKUP_DIR}/${BACKUP_FILENAME}.sql" \
        --verbose \
        --no-owner \
        --no-privileges \
        --clean \
        --if-exists \
        --create; then

        log "SQL dump created successfully"

        # Compress the backup
        log "Compressing backup..."
        gzip "${BACKUP_DIR}/${BACKUP_FILENAME}.sql"

        # Calculate backup size
        BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILENAME}.sql.gz" | cut -f1)
        log "Backup completed: ${BACKUP_FILENAME}.sql.gz (${BACKUP_SIZE})"

        # Create backup metadata
        cat > "${BACKUP_DIR}/${BACKUP_FILENAME}.meta" <<EOF
{
    "timestamp": "${TIMESTAMP}",
    "database": "${POSTGRES_DB}",
    "host": "${POSTGRES_HOST}",
    "size": "${BACKUP_SIZE}",
    "retention_days": ${RETENTION_DAYS},
    "postgres_version": "$(PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "${POSTGRES_HOST}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -t -c 'SELECT version();' | head -n 1 | xargs)"
}
EOF

        return 0
    else
        error "Backup failed!"
        return 1
    fi
}

# Function to cleanup old backups
cleanup_old_backups() {
    log "Cleaning up backups older than ${RETENTION_DAYS} days..."

    # Count files before cleanup
    BEFORE_COUNT=$(find "${BACKUP_DIR}" -name "backup_*.sql.gz" -type f | wc -l)

    # Delete old backup files
    find "${BACKUP_DIR}" -name "backup_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete
    find "${BACKUP_DIR}" -name "backup_*.meta" -type f -mtime +${RETENTION_DAYS} -delete

    # Count files after cleanup
    AFTER_COUNT=$(find "${BACKUP_DIR}" -name "backup_*.sql.gz" -type f | wc -l)

    DELETED=$((BEFORE_COUNT - AFTER_COUNT))
    if [ ${DELETED} -gt 0 ]; then
        log "Removed ${DELETED} old backup(s)"
    else
        log "No old backups to remove"
    fi
}

# Function to verify backup
verify_backup() {
    log "Verifying backup integrity..."

    if gunzip -t "${BACKUP_DIR}/${BACKUP_FILENAME}.sql.gz" 2>/dev/null; then
        log "Backup verification successful"
        return 0
    else
        error "Backup verification failed!"
        return 1
    fi
}

# Function to list existing backups
list_backups() {
    log "Existing backups:"
    ls -lh "${BACKUP_DIR}"/backup_*.sql.gz 2>/dev/null || warning "No backups found"
}

# Function to upload backup to S3 (optional)
upload_to_s3() {
    if [ -n "${S3_BUCKET}" ]; then
        log "Uploading backup to S3 bucket: ${S3_BUCKET}"

        if aws s3 cp "${BACKUP_DIR}/${BACKUP_FILENAME}.sql.gz" \
            "s3://${S3_BUCKET}/database-backups/${BACKUP_FILENAME}.sql.gz" \
            --storage-class "${S3_STORAGE_CLASS:-STANDARD_IA}"; then
            log "Backup uploaded to S3 successfully"
        else
            warning "Failed to upload backup to S3"
        fi
    fi
}

# Main execution
main() {
    log "=== Database Backup Script ==="
    log "Database: ${POSTGRES_DB}"
    log "Host: ${POSTGRES_HOST}"
    log "Backup directory: ${BACKUP_DIR}"
    log "Retention: ${RETENTION_DAYS} days"

    # Check if PostgreSQL is accessible
    if ! PGPASSWORD="${POSTGRES_PASSWORD}" pg_isready -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}"; then
        error "Cannot connect to PostgreSQL server"
        exit 1
    fi

    # Perform backup
    if perform_backup; then
        # Verify backup
        if verify_backup; then
            # Cleanup old backups
            cleanup_old_backups

            # Upload to S3 if configured
            upload_to_s3

            # List all backups
            list_backups

            log "=== Backup process completed successfully ==="
            exit 0
        else
            error "Backup verification failed"
            rm -f "${BACKUP_DIR}/${BACKUP_FILENAME}.sql.gz"
            exit 1
        fi
    else
        error "Backup process failed"
        exit 1
    fi
}

# Run main function
main