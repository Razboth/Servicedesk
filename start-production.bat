@echo off
echo ========================================
echo  Bank SulutGo ServiceDesk
echo  Start Production Instance
echo ========================================
echo.

REM Start production instance only
echo Starting production instance (port 443)...
call pm2 start ecosystem.config.js --only bsg-servicedesk
echo.

REM Save PM2 configuration
echo Saving PM2 configuration...
call pm2 save
echo.

REM Display status
echo ========================================
echo  Production Started!
echo ========================================
call pm2 status
echo.
echo Production is running on https://hd.bsg.id:443
echo.
pause
