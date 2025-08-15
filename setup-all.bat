@echo off
echo.
echo === ServiceDesk Setup Script ===
echo.

echo 1. Generating Prisma Client...
call npx prisma generate

echo.
echo 2. Fixing demo users...
node fix-demo-users.js

echo.
echo 3. Seeding branches and ATMs...
node seed-branches-atms.js

echo.
echo === Setup Complete! ===
echo.
echo Demo credentials:
echo   admin@banksulutgo.co.id / password123
echo   manager@banksulutgo.co.id / password123
echo   tech@banksulutgo.co.id / password123
echo.
echo Start the application with: npm run dev
echo.
pause