#!/bin/bash

# ServiceDesk6 Deployment Verification Script
# Run this script after extracting the deployment package

echo "🔍 Verifying ServiceDesk6 Deployment Package..."
echo "================================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Make sure you're in the servicedesk6 directory."
    exit 1
fi

echo "✅ Found package.json"

# Check for essential files
ESSENTIAL_FILES=(
    "package.json"
    "package-lock.json"
    "next.config.js"
    "tailwind.config.ts"
    "tsconfig.json"
    "prisma/schema.prisma"
    "servicedesk_database_dump.sql"
    "DEPLOYMENT_README.md"
    ".env.example"
)

for file in "${ESSENTIAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ Found $file"
    else
        echo "❌ Missing $file"
    fi
done

# Check for essential directories
ESSENTIAL_DIRS=(
    "app"
    "components"
    "lib"
    "prisma"
    "types"
)

for dir in "${ESSENTIAL_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo "✅ Found $dir/ directory"
    else
        echo "❌ Missing $dir/ directory"
    fi
done

# Check database dump size
if [ -f "servicedesk_database_dump.sql" ]; then
    DUMP_SIZE=$(wc -c < "servicedesk_database_dump.sql")
    if [ "$DUMP_SIZE" -gt 1000 ]; then
        echo "✅ Database dump appears valid (${DUMP_SIZE} bytes)"
    else
        echo "⚠️  Database dump seems small (${DUMP_SIZE} bytes) - might be empty"
    fi
fi

# Check if .env.local exists (should not in deployment)
if [ -f ".env.local" ]; then
    echo "⚠️  Found .env.local - this should be created from .env.example"
else
    echo "✅ No .env.local found (correct for deployment)"
fi

# Check if node_modules exists (should not in deployment)
if [ -d "node_modules" ]; then
    echo "⚠️  Found node_modules - run 'rm -rf node_modules' and 'npm install'"
else
    echo "✅ No node_modules found (correct for deployment)"
fi

echo ""
echo "🚀 Next Steps:"
echo "1. Copy .env.example to .env.local and configure your database"
echo "2. Create PostgreSQL database: createdb servicedesk6"
echo "3. Restore database: psql -d servicedesk6 < servicedesk_database_dump.sql"
echo "4. Install dependencies: npm install"
echo "5. Generate Prisma client: npx prisma generate"
echo "6. Start development: npm run dev"
echo ""
echo "📖 See DEPLOYMENT_README.md for detailed instructions"
echo "================================================"