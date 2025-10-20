@echo off
echo ========================================
echo  Bank SulutGo ServiceDesk
echo  Rebuild and Restart Script
echo ========================================
echo.

REM Stop all PM2 processes
echo [1/5] Stopping PM2 processes...
call pm2 stop all
echo.

REM Delete PM2 processes
echo [2/5] Deleting PM2 processes...
call pm2 delete all
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

REM Start PM2 with HTTPS
echo [5/5] Starting PM2 with HTTPS on port 443...
call pm2 start ecosystem.config.js --only bsg-servicedesk
echo.

REM Save PM2 configuration
echo Saving PM2 configuration...
call pm2 save
echo.

REM Display status
echo ========================================
echo  Deployment Complete!
echo ========================================
call pm2 status
echo.
echo Application is now running on https://hd.bsg.id:443
echo.
pause
