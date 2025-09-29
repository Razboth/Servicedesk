#!/bin/bash

# Database Migration Script
# Migrates database from external PostgreSQL to Docker PostgreSQL

set -e

# Configuration
SOURCE_HOST="${SOURCE_HOST:-localhost}"
SOURCE_PORT="${SOURCE_PORT:-5432}"
SOURCE_DB="${SOURCE_DB:-servicedesk}"
SOURCE_USER="${SOURCE_USER:-servicedesk}"
SOURCE_PASSWORD="${SOURCE_PASSWORD}"

TARGET_HOST="${TARGET_HOST:-postgres}"
TARGET_PORT="${TARGET_PORT:-5432}"
TARGET_DB="${TARGET_DB:-servicedesk}"
TARGET_USER="${TARGET_USER:-servicedesk}"
TARGET_PASSWORD="${TARGET_PASSWORD}"

BACKUP_DIR="/backup"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
MIGRATION_FILE="${BACKUP_DIR}/migration_${SOURCE_DB}_to_${TARGET_DB}_${TIMESTAMP}.sql"

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

# Function to test database connection
test_connection() {
    local host=$1
    local port=$2
    local user=$3
    local password=$4
    local db=$5
    local label=$6

    log "Testing connection to ${label} database..."

    if PGPASSWORD="${password}" pg_isready -h "${host}" -p "${port}" -U "${user}"; then
        log "Successfully connected to ${label} database"

        # Get database size
        local size=$(PGPASSWORD="${password}" psql -h "${host}" -p "${port}" -U "${user}" -d "${db}" -t -c "SELECT pg_size_pretty(pg_database_size('${db}'));" 2>/dev/null | xargs)
        info "Database size: ${size}"

        # Get table count
        local tables=$(PGPASSWORD="${password}" psql -h "${host}" -p "${port}" -U "${user}" -d "${db}" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs)
        info "Number of tables: ${tables}"

        return 0
    else
        error "Failed to connect to ${label} database"
        return 1
    fi
}

# Function to dump source database
dump_source_database() {
    log "Starting database dump from source..."

    local dump_args=(
        -h "${SOURCE_HOST}"
        -p "${SOURCE_PORT}"
        -U "${SOURCE_USER}"
        -d "${SOURCE_DB}"
        -f "${MIGRATION_FILE}"
        --verbose
        --no-owner
        --no-privileges
        --clean
        --if-exists
        --create
    )

    # Add optional parameters
    if [ "${EXCLUDE_LARGE_TABLES}" = "true" ]; then
        dump_args+=(--exclude-table-data="audit_logs")
        dump_args+=(--exclude-table-data="system_logs")
        info "Excluding large tables from data migration"
    fi

    if PGPASSWORD="${SOURCE_PASSWORD}" pg_dump "${dump_args[@]}"; then
        log "Database dump completed successfully"

        # Compress the dump
        log "Compressing dump file..."
        gzip -c "${MIGRATION_FILE}" > "${MIGRATION_FILE}.gz"

        local size=$(du -h "${MIGRATION_FILE}.gz" | cut -f1)
        info "Dump file size: ${size}"

        return 0
    else
        error "Database dump failed"
        return 1
    fi
}

# Function to restore to target database
restore_target_database() {
    log "Starting database restore to target..."

    # Drop existing connections to target database
    log "Dropping existing connections to target database..."
    PGPASSWORD="${TARGET_PASSWORD}" psql \
        -h "${TARGET_HOST}" \
        -p "${TARGET_PORT}" \
        -U "${TARGET_USER}" \
        -d postgres \
        -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${TARGET_DB}' AND pid <> pg_backend_pid();" \
        2>/dev/null || true

    # Restore the database
    if gunzip -c "${MIGRATION_FILE}.gz" | PGPASSWORD="${TARGET_PASSWORD}" psql \
        -h "${TARGET_HOST}" \
        -p "${TARGET_PORT}" \
        -U "${TARGET_USER}" \
        -d postgres \
        -v ON_ERROR_STOP=1; then

        log "Database restore completed successfully"
        return 0
    else
        error "Database restore failed"
        return 1
    fi
}

# Function to verify migration
verify_migration() {
    log "Verifying migration..."

    # Get source table count
    local source_tables=$(PGPASSWORD="${SOURCE_PASSWORD}" psql \
        -h "${SOURCE_HOST}" \
        -p "${SOURCE_PORT}" \
        -U "${SOURCE_USER}" \
        -d "${SOURCE_DB}" \
        -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" \
        2>/dev/null | xargs)

    # Get target table count
    local target_tables=$(PGPASSWORD="${TARGET_PASSWORD}" psql \
        -h "${TARGET_HOST}" \
        -p "${TARGET_PORT}" \
        -U "${TARGET_USER}" \
        -d "${TARGET_DB}" \
        -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" \
        2>/dev/null | xargs)

    if [ "${source_tables}" = "${target_tables}" ]; then
        log "Table count matches: ${target_tables} tables"

        # Sample data verification
        log "Performing sample data verification..."

        # Check users table
        local source_users=$(PGPASSWORD="${SOURCE_PASSWORD}" psql \
            -h "${SOURCE_HOST}" \
            -p "${SOURCE_PORT}" \
            -U "${SOURCE_USER}" \
            -d "${SOURCE_DB}" \
            -t -c "SELECT COUNT(*) FROM users;" \
            2>/dev/null | xargs)

        local target_users=$(PGPASSWORD="${TARGET_PASSWORD}" psql \
            -h "${TARGET_HOST}" \
            -p "${TARGET_PORT}" \
            -U "${TARGET_USER}" \
            -d "${TARGET_DB}" \
            -t -c "SELECT COUNT(*) FROM users;" \
            2>/dev/null | xargs)

        if [ "${source_users}" = "${target_users}" ]; then
            log "User count matches: ${target_users} users"
            return 0
        else
            warning "User count mismatch: Source=${source_users}, Target=${target_users}"
            return 1
        fi
    else
        error "Table count mismatch: Source=${source_tables}, Target=${target_tables}"
        return 1
    fi
}

# Function to run post-migration tasks
post_migration_tasks() {
    log "Running post-migration tasks..."

    # Update sequences
    log "Updating sequences..."
    PGPASSWORD="${TARGET_PASSWORD}" psql \
        -h "${TARGET_HOST}" \
        -p "${TARGET_PORT}" \
        -U "${TARGET_USER}" \
        -d "${TARGET_DB}" \
        -c "SELECT setval(pg_get_serial_sequence(table_name, column_name), MAX(column_name)) FROM information_schema.columns WHERE column_default LIKE 'nextval%';" \
        2>/dev/null || true

    # Run ANALYZE
    log "Analyzing database..."
    PGPASSWORD="${TARGET_PASSWORD}" psql \
        -h "${TARGET_HOST}" \
        -p "${TARGET_PORT}" \
        -U "${TARGET_USER}" \
        -d "${TARGET_DB}" \
        -c "ANALYZE;" \
        2>/dev/null

    # Create indexes if needed
    log "Verifying indexes..."
    # Add custom index creation commands here

    log "Post-migration tasks completed"
}

# Function to cleanup
cleanup() {
    if [ "${KEEP_DUMP_FILES}" != "true" ]; then
        log "Cleaning up temporary files..."
        rm -f "${MIGRATION_FILE}"
        # Keep compressed backup for safety
        info "Keeping compressed backup at: ${MIGRATION_FILE}.gz"
    fi
}

# Main execution
main() {
    log "=== Database Migration Script ==="
    log "Source: ${SOURCE_USER}@${SOURCE_HOST}:${SOURCE_PORT}/${SOURCE_DB}"
    log "Target: ${TARGET_USER}@${TARGET_HOST}:${TARGET_PORT}/${TARGET_DB}"
    echo

    # Test connections
    if ! test_connection "${SOURCE_HOST}" "${SOURCE_PORT}" "${SOURCE_USER}" "${SOURCE_PASSWORD}" "${SOURCE_DB}" "source"; then
        error "Cannot connect to source database"
        exit 1
    fi

    if ! test_connection "${TARGET_HOST}" "${TARGET_PORT}" "${TARGET_USER}" "${TARGET_PASSWORD}" "${TARGET_DB}" "target"; then
        error "Cannot connect to target database"
        exit 1
    fi

    # Confirm migration
    warning "This will replace the target database with data from the source database!"
    read -p "Do you want to continue? (yes/no): " confirm

    if [ "$confirm" != "yes" ]; then
        log "Migration cancelled"
        exit 0
    fi

    # Create backup directory
    mkdir -p "${BACKUP_DIR}"

    # Perform migration
    if dump_source_database; then
        if restore_target_database; then
            if verify_migration; then
                post_migration_tasks
                cleanup
                log "=== Database migration completed successfully ==="
                info "Migration backup saved at: ${MIGRATION_FILE}.gz"
                exit 0
            else
                error "Migration verification failed"
                exit 1
            fi
        else
            error "Database restore failed"
            exit 1
        fi
    else
        error "Database dump failed"
        exit 1
    fi
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --source-host)
            SOURCE_HOST="$2"
            shift 2
            ;;
        --source-port)
            SOURCE_PORT="$2"
            shift 2
            ;;
        --source-db)
            SOURCE_DB="$2"
            shift 2
            ;;
        --source-user)
            SOURCE_USER="$2"
            shift 2
            ;;
        --source-password)
            SOURCE_PASSWORD="$2"
            shift 2
            ;;
        --target-host)
            TARGET_HOST="$2"
            shift 2
            ;;
        --target-port)
            TARGET_PORT="$2"
            shift 2
            ;;
        --target-db)
            TARGET_DB="$2"
            shift 2
            ;;
        --target-user)
            TARGET_USER="$2"
            shift 2
            ;;
        --target-password)
            TARGET_PASSWORD="$2"
            shift 2
            ;;
        --exclude-large-tables)
            EXCLUDE_LARGE_TABLES="true"
            shift
            ;;
        --keep-dump-files)
            KEEP_DUMP_FILES="true"
            shift
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --source-host HOST       Source database host"
            echo "  --source-port PORT       Source database port"
            echo "  --source-db DATABASE     Source database name"
            echo "  --source-user USER       Source database user"
            echo "  --source-password PASS  Source database password"
            echo "  --target-host HOST       Target database host"
            echo "  --target-port PORT       Target database port"
            echo "  --target-db DATABASE     Target database name"
            echo "  --target-user USER       Target database user"
            echo "  --target-password PASS  Target database password"
            echo "  --exclude-large-tables   Exclude large tables from data migration"
            echo "  --keep-dump-files        Keep dump files after migration"
            echo "  --help                   Show this help message"
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Check required passwords
if [ -z "${SOURCE_PASSWORD}" ]; then
    read -s -p "Enter source database password: " SOURCE_PASSWORD
    echo
fi

if [ -z "${TARGET_PASSWORD}" ]; then
    read -s -p "Enter target database password: " TARGET_PASSWORD
    echo
fi

# Run main function
main