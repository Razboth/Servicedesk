@echo off
echo ========================================
echo  Bank SulutGo ServiceDesk
echo  Rebuild and Restart Production
echo ========================================
echo.

REM Stop production
echo [1/5] Stopping production instance...
call pm2 stop bsg-servicedesk
echo.

REM Delete production PM2 process
echo [2/5] Deleting PM2 process...
call pm2 delete bsg-servicedesk
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

REM Start production instance
echo [5/5] Starting production instance...
call pm2 start ecosystem.config.js --only bsg-servicedesk
echo.

REM Save PM2 configuration
echo Saving PM2 configuration...
call pm2 save
echo.

REM Display status
echo ========================================
echo  Production Restarted!
echo ========================================
call pm2 status
echo.
echo Production is running on https://hd.bsg.id:443
echo.
pause
