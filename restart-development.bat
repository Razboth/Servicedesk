@echo off
echo ========================================
echo  Bank SulutGo ServiceDesk
echo  Rebuild and Restart Development
echo ========================================
echo.

REM Stop development
echo [1/5] Stopping development instance...
call pm2 stop bsg-servicedesk-dev
echo.

REM Delete development PM2 process
echo [2/5] Deleting PM2 process...
call pm2 delete bsg-servicedesk-dev
echo.

REM Clear build cache
echo [3/5] Clearing build cache...
if exist .next (
    rmdir /S /Q .next
    echo Build cache cleared successfully
) else (
    echo No build cache found
)
echo.

REM Rebuild the application
echo [4/5] Building application...
call npm run build
if errorlevel 1 (
    echo ERROR: Build failed!
    pause
    exit /b 1
)
echo Build completed successfully
echo.

REM Start development instance
echo [5/5] Starting development instance...
call pm2 start ecosystem.config.js --only bsg-servicedesk-dev
echo.

REM Save PM2 configuration
echo Saving PM2 configuration...
call pm2 save
echo.

REM Display status
echo ========================================
echo  Development Restarted!
echo ========================================
call pm2 status
echo.
echo Development is running on https://[your-server-ip]:3000
echo.
pause
