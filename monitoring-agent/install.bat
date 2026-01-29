@echo off
echo ============================================
echo Bank SulutGo Network Monitoring Agent Setup
echo ============================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://www.python.org/downloads/
    pause
    exit /b 1
)

echo Installing dependencies...
pip install -r requirements.txt

if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Dependencies installed successfully!
echo.

REM Check if config.json exists
if not exist config.json (
    echo Creating config.json from example...
    copy config.example.json config.json
    echo.
    echo IMPORTANT: Please edit config.json and set your API key
    echo.
)

echo Setup complete!
echo.
echo To run the agent:
echo   python agent.py
echo.
echo To run as a Windows service, consider using NSSM:
echo   https://nssm.cc/
echo.
pause
