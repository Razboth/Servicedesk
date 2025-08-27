@echo off
echo =========================================
echo  Install ServiceDesk as Windows Service
echo =========================================
echo.
echo This script will install the ServiceDesk as a Windows Service using PM2
echo.

REM Check for administrator privileges
net session >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: This script requires Administrator privileges.
    echo Please run as Administrator.
    pause
    exit /b 1
)

REM Check if PM2 is installed
where pm2 >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo PM2 is not installed. Installing PM2 globally...
    npm install -g pm2
    npm install -g pm2-windows-service
    if %ERRORLEVEL% NEQ 0 (
        echo Failed to install PM2. Please install manually.
        pause
        exit /b 1
    )
)

REM Install pm2-windows-service if not installed
where pm2-service-install >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Installing PM2 Windows Service...
    npm install -g pm2-windows-service
)

echo.
echo Installing PM2 as Windows Service...
echo.

REM Setup PM2 Windows Service
pm2-service-install -n "BSG-ServiceDesk"

echo.
echo Starting the application...
cd /d "%~dp0\.."
pm2 start ecosystem.config.js --only bsg-servicedesk
pm2 save

echo.
echo =========================================
echo     Installation Complete!
echo =========================================
echo.
echo The ServiceDesk has been installed as a Windows Service.
echo Service Name: BSG-ServiceDesk
echo.
echo Service Management Commands:
echo   Start:   net start "BSG-ServiceDesk"
echo   Stop:    net stop "BSG-ServiceDesk"
echo   Status:  sc query "BSG-ServiceDesk"
echo.
echo PM2 Commands:
echo   View logs:     pm2 logs bsg-servicedesk
echo   Monitor:       pm2 monit
echo   Restart:       pm2 restart bsg-servicedesk
echo.
pause