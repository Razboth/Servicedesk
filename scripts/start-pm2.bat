@echo off
echo =========================================
echo     Bank SulutGo ServiceDesk PM2 Starter
echo =========================================
echo.

REM Check if PM2 is installed
where pm2 >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo PM2 is not installed. Installing PM2 globally...
    npm install -g pm2
    if %ERRORLEVEL% NEQ 0 (
        echo Failed to install PM2. Please install manually: npm install -g pm2
        exit /b 1
    )
)

REM Create logs directory if not exists
if not exist "logs" mkdir logs

REM Build the application
echo Building application...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo Build failed! Please fix the errors and try again.
    exit /b 1
)

REM Stop any existing instances
echo Stopping existing PM2 instances...
pm2 stop bsg-servicedesk 2>nul

REM Delete existing instances
pm2 delete bsg-servicedesk 2>nul

REM Start the application with PM2
echo Starting ServiceDesk with PM2...
pm2 start ecosystem.config.js --only bsg-servicedesk

REM Show status
echo.
echo =========================================
echo     ServiceDesk Status
echo =========================================
pm2 status

echo.
echo Application started successfully!
echo.
echo Useful commands:
echo   View logs:     pm2 logs bsg-servicedesk
echo   Monitor:       pm2 monit
echo   Stop:          pm2 stop bsg-servicedesk
echo   Restart:       pm2 restart bsg-servicedesk
echo   Status:        pm2 status
echo.
echo Access the application at: https://localhost
echo.