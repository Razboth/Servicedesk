#!/bin/bash

# Production Database Schema Dump Script
# Run this on the production server to get current schema
# Usage: ./dump-prod-schema.sh

# Database connection settings (adjust if needed)
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-servicedesk}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

OUTPUT_FILE="/tmp/prod_schema_dump_$(date +%Y%m%d_%H%M%S).txt"

echo "=============================================="
echo "Production Database Schema Dump"
echo "Database: $DB_NAME"
echo "Host: $DB_HOST"
echo "Date: $(date)"
echo "=============================================="
echo ""

# Run the schema dump
psql -U "$DB_USER" -h "$DB_HOST" -p "$DB_PORT" -d "$DB_NAME" << 'EOSQL' > "$OUTPUT_FILE"

-- ============================================
-- TABLES AND COLUMNS
-- ============================================
\echo '=== TABLES AND COLUMNS ==='
SELECT
    t.table_name,
    c.column_name,
    c.data_type,
    c.udt_name,
    c.character_maximum_length,
    c.is_nullable,
    c.column_default
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name, c.ordinal_position;

-- ============================================
-- ENUMS
-- ============================================
\echo ''
\echo '=== ENUMS ==='
SELECT
    t.typname AS enum_name,
    string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) AS enum_values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
GROUP BY t.typname
ORDER BY t.typname;

-- ============================================
-- INDEXES
-- ============================================
\echo ''
\echo '=== INDEXES ==='
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ============================================
-- FOREIGN KEYS
-- ============================================
\echo ''
\echo '=== FOREIGN KEYS ==='
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- ============================================
-- UNIQUE CONSTRAINTS
-- ============================================
\echo ''
\echo '=== UNIQUE CONSTRAINTS ==='
SELECT
    tc.table_name,
    tc.constraint_name,
    string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'UNIQUE'
    AND tc.table_schema = 'public'
GROUP BY tc.table_name, tc.constraint_name
ORDER BY tc.table_name, tc.constraint_name;

-- ============================================
-- TABLE ROW COUNTS (for reference)
-- ============================================
\echo ''
\echo '=== TABLE ROW COUNTS ==='
SELECT
    schemaname,
    relname AS table_name,
    n_live_tup AS row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;

EOSQL

echo ""
echo "Schema dump saved to: $OUTPUT_FILE"
echo ""
echo "To view the output:"
echo "  cat $OUTPUT_FILE"
echo ""
echo "To copy content for sharing:"
echo "  cat $OUTPUT_FILE | head -500"
echo ""
