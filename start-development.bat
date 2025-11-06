@echo off
echo ========================================
echo  Bank SulutGo ServiceDesk
echo  Start Development Instance
echo ========================================
echo.

REM Build the application first
echo [1/2] Building application...
call npm run build
if errorlevel 1 (
    echo ERROR: Build failed!
    pause
    exit /b 1
)
echo Build completed successfully
echo.

REM Start development instance only
echo [2/2] Starting development instance (port 3000)...
call pm2 start ecosystem.config.js --only bsg-servicedesk-dev
echo.

REM Save PM2 configuration
echo Saving PM2 configuration...
call pm2 save
echo.

REM Display status
echo ========================================
echo  Development Started!
echo ========================================
call pm2 status
echo.
echo Development is running on https://[your-server-ip]:3000
echo.
echo NOTE: Update NEXTAUTH_URL in .env.development with your actual server IP
echo.
pause
