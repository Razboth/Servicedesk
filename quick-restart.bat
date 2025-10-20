@echo off
echo ========================================
echo  Bank SulutGo ServiceDesk
echo  Quick Restart Script (No Rebuild)
echo ========================================
echo.

REM Restart PM2
echo Restarting PM2 service...
call pm2 restart bsg-servicedesk
echo.

REM Display status
echo ========================================
echo  Restart Complete!
echo ========================================
call pm2 status
echo.
echo Application is now running on https://hd.bsg.id:443
echo.
pause
