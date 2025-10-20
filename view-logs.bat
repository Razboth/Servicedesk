@echo off
echo ========================================
echo  Bank SulutGo ServiceDesk
echo  Logs Viewer
echo ========================================
echo.
echo Press Ctrl+C to stop viewing logs
echo.
call pm2 logs bsg-servicedesk
