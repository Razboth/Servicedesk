@echo off
echo ========================================
echo  Bank SulutGo ServiceDesk
echo  Development Database Setup
echo ========================================
echo.

echo [1/3] Creating development database...
psql -U postgres -c "DROP DATABASE IF EXISTS servicedesk_database_development;"
psql -U postgres -c "CREATE DATABASE servicedesk_database_development;"
echo.

echo [2/3] Running Prisma migrations on development database...
set DATABASE_URL=postgresql://postgres:admin@localhost:5432/servicedesk_database_development?schema=public
call npx prisma migrate deploy
echo.

echo [3/3] Generating Prisma client...
call npx prisma generate
echo.

echo ========================================
echo  Development Database Setup Complete!
echo ========================================
echo.
echo Database: servicedesk_database_development
echo.
echo Optional: Run seed command to populate with test data
echo   npx prisma db seed
echo.
pause
