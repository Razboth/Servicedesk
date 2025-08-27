@echo off
echo ========================================
echo Starting Bank SulutGo ServiceDesk (HTTPS)
echo ========================================
echo.

cd /d "%~dp0"

echo Checking PM2 status...
pm2 status

echo.
echo Starting application with HTTPS on port 443...
pm2 start ecosystem.config.js --only bsg-servicedesk

echo.
echo Application started!
echo Access the application at: https://localhost
echo.
echo To view logs: pm2 logs
echo To monitor: pm2 monit
echo To stop: pm2 stop bsg-servicedesk
echo.
pause