@echo off
echo ========================================
echo  Bank SulutGo ServiceDesk
echo  Stop All Instances
echo ========================================
echo.

REM Stop all ServiceDesk instances
echo Stopping all instances...
call pm2 stop bsg-servicedesk bsg-servicedesk-dev
echo.

REM Display status
echo ========================================
echo  All Instances Stopped!
echo ========================================
call pm2 status
echo.
pause
