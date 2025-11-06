@echo off
echo ========================================
echo  Bank SulutGo ServiceDesk
echo  PM2 Status
echo ========================================
echo.

call pm2 status

echo.
echo ========================================
echo  Access URLs
echo ========================================
echo Production:  https://hd.bsg.id:443
echo Development: https://[your-server-ip]:3000
echo.
pause
