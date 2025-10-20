@echo off
echo ========================================
echo  Bank SulutGo ServiceDesk
echo  Stop Script
echo ========================================
echo.

REM Stop PM2
echo Stopping PM2 service...
call pm2 stop bsg-servicedesk
echo.

REM Display status
echo ========================================
echo  Service Stopped!
echo ========================================
call pm2 status
echo.
pause
