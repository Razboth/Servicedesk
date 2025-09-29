#!/bin/bash
set -e

# Database initialization script for PostgreSQL

echo "Starting database initialization..."

# Create extensions if they don't exist
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Enable required extensions
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
    CREATE EXTENSION IF NOT EXISTS "pg_trgm";
    CREATE EXTENSION IF NOT EXISTS "btree_gist";

    -- Create indexes for better performance
    -- These will be created after tables are populated by Prisma

    -- Grant necessary permissions
    GRANT ALL PRIVILEGES ON DATABASE $POSTGRES_DB TO $POSTGRES_USER;

    -- Set optimal configuration for application
    ALTER DATABASE $POSTGRES_DB SET shared_preload_libraries = 'pg_stat_statements';
    ALTER DATABASE $POSTGRES_DB SET pg_stat_statements.track = 'all';
    ALTER DATABASE $POSTGRES_DB SET effective_cache_size = '1GB';
    ALTER DATABASE $POSTGRES_DB SET maintenance_work_mem = '256MB';
    ALTER DATABASE $POSTGRES_DB SET checkpoint_completion_target = '0.9';
    ALTER DATABASE $POSTGRES_DB SET wal_buffers = '16MB';
    ALTER DATABASE $POSTGRES_DB SET default_statistics_target = '100';
    ALTER DATABASE $POSTGRES_DB SET random_page_cost = '1.1';
    ALTER DATABASE $POSTGRES_DB SET effective_io_concurrency = '200';
    ALTER DATABASE $POSTGRES_DB SET work_mem = '4MB';
    ALTER DATABASE $POSTGRES_DB SET min_wal_size = '1GB';
    ALTER DATABASE $POSTGRES_DB SET max_wal_size = '4GB';
EOSQL

echo "Database initialization completed successfully!"

# Create backup directory if it doesn't exist
mkdir -p /backup

echo "Database is ready for use."