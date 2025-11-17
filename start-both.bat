@echo off
echo ========================================
echo  Bank SulutGo ServiceDesk
echo  Start Both Production and Development
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

REM Start both instances
echo [2/2] Starting both instances...
call pm2 start ecosystem.config.js --only "bsg-servicedesk,bsg-servicedesk-dev"
echo.

REM Save PM2 configuration
echo Saving PM2 configuration...
call pm2 save
echo.

REM Display status
echo ========================================
echo  Both Instances Started!
echo ========================================
call pm2 status
echo.
echo Production:  https://hd.bsg.id:443
echo Development: https://[your-server-ip]:3000
echo.
echo NOTE: Update NEXTAUTH_URL in .env.development with your actual server IP
echo.
pause
