# PowerShell Script to Setup ServiceDesk as Windows Service
# Must be run as Administrator

param(
    [string]$ServiceName = "BankSulutGoServiceDesk",
    [string]$AppPath = "C:\ServiceDesk",
    [string]$NodePath = "C:\Program Files\nodejs\node.exe"
)

# Check if running as Administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "This script must be run as Administrator. Exiting..." -ForegroundColor Red
    exit 1
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ServiceDesk Windows Service Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Function to log messages
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    
    switch ($Level) {
        "ERROR" { Write-Host $Message -ForegroundColor Red }
        "WARNING" { Write-Host $Message -ForegroundColor Yellow }
        "SUCCESS" { Write-Host $Message -ForegroundColor Green }
        default { Write-Host $Message }
    }
}

try {
    # Step 1: Install PM2 and Windows Service Support
    Write-Log "Installing PM2 and Windows service support..." "INFO"
    
    Set-Location $AppPath
    
    # Check if PM2 is installed
    $pm2Version = npm list -g pm2 2>$null
    if (!$pm2Version) {
        npm install -g pm2
        npm install -g pm2-windows-startup
        Write-Log "PM2 installed successfully" "SUCCESS"
    } else {
        Write-Log "PM2 is already installed" "INFO"
    }

    # Step 2: Create PM2 ecosystem configuration
    Write-Log "Creating PM2 ecosystem configuration..." "INFO"
    
    $ecosystemConfig = @"
module.exports = {
  apps: [{
    name: 'servicedesk',
    script: 'npm',
    args: 'run start',
    cwd: '$AppPath',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '$AppPath\\logs\\pm2-error.log',
    out_file: '$AppPath\\logs\\pm2-out.log',
    log_file: '$AppPath\\logs\\pm2-combined.log',
    time: true,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
"@

    Set-Content -Path "$AppPath\ecosystem.config.js" -Value $ecosystemConfig
    Write-Log "PM2 configuration created" "SUCCESS"

    # Step 3: Create logs directory
    if (!(Test-Path "$AppPath\logs")) {
        New-Item -ItemType Directory -Path "$AppPath\logs" | Out-Null
        Write-Log "Created logs directory" "SUCCESS"
    }

    # Step 4: Start the application with PM2
    Write-Log "Starting application with PM2..." "INFO"
    pm2 delete servicedesk 2>$null
    pm2 start ecosystem.config.js
    pm2 save
    Write-Log "Application started with PM2" "SUCCESS"

    # Step 5: Setup PM2 as Windows Service
    Write-Log "Setting up PM2 as Windows Service..." "INFO"
    pm2-startup install
    
    # Step 6: Create startup batch file
    $startupBatch = @"
@echo off
cd /d $AppPath
call npm run build
call pm2 start ecosystem.config.js
call pm2 save
"@
    
    Set-Content -Path "$AppPath\start-servicedesk.bat" -Value $startupBatch
    Write-Log "Startup batch file created" "SUCCESS"

    # Step 7: Create Windows Task Scheduler task for monitoring
    Write-Log "Creating scheduled task for network monitoring..." "INFO"
    
    $taskName = "ServiceDeskMonitoring"
    $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-File `"$AppPath\deployment\start-monitoring.ps1`"" -WorkingDirectory $AppPath
    $trigger = New-ScheduledTaskTrigger -AtStartup
    $principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
    
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force
    Write-Log "Scheduled task created for monitoring" "SUCCESS"

    # Step 8: Configure Windows Firewall
    Write-Log "Configuring Windows Firewall..." "INFO"
    
    # Remove existing rules
    Remove-NetFirewallRule -DisplayName "ServiceDesk Application" -ErrorAction SilentlyContinue
    Remove-NetFirewallRule -DisplayName "ServiceDesk PostgreSQL" -ErrorAction SilentlyContinue
    
    # Add new rules
    New-NetFirewallRule -DisplayName "ServiceDesk Application" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow | Out-Null
    New-NetFirewallRule -DisplayName "ServiceDesk PostgreSQL" -Direction Inbound -Protocol TCP -LocalPort 5432 -Action Allow | Out-Null
    Write-Log "Firewall rules configured" "SUCCESS"

    # Step 9: Create management shortcuts
    Write-Log "Creating management shortcuts..." "INFO"
    
    # Create Start shortcut
    $WshShell = New-Object -comObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut("$AppPath\Start ServiceDesk.lnk")
    $Shortcut.TargetPath = "powershell.exe"
    $Shortcut.Arguments = "-Command `"pm2 start ecosystem.config.js`""
    $Shortcut.WorkingDirectory = $AppPath
    $Shortcut.IconLocation = "shell32.dll,13"
    $Shortcut.Save()
    
    # Create Stop shortcut
    $Shortcut = $WshShell.CreateShortcut("$AppPath\Stop ServiceDesk.lnk")
    $Shortcut.TargetPath = "powershell.exe"
    $Shortcut.Arguments = "-Command `"pm2 stop servicedesk`""
    $Shortcut.WorkingDirectory = $AppPath
    $Shortcut.IconLocation = "shell32.dll,27"
    $Shortcut.Save()
    
    # Create Restart shortcut
    $Shortcut = $WshShell.CreateShortcut("$AppPath\Restart ServiceDesk.lnk")
    $Shortcut.TargetPath = "powershell.exe"
    $Shortcut.Arguments = "-Command `"pm2 restart servicedesk`""
    $Shortcut.WorkingDirectory = $AppPath
    $Shortcut.IconLocation = "shell32.dll,238"
    $Shortcut.Save()
    
    # Create Logs shortcut
    $Shortcut = $WshShell.CreateShortcut("$AppPath\View Logs.lnk")
    $Shortcut.TargetPath = "powershell.exe"
    $Shortcut.Arguments = "-Command `"pm2 logs servicedesk --lines 100`""
    $Shortcut.WorkingDirectory = $AppPath
    $Shortcut.IconLocation = "shell32.dll,21"
    $Shortcut.Save()
    
    Write-Log "Management shortcuts created" "SUCCESS"

    # Step 10: Display status
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "Service Setup Complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    
    Write-Host "`nService Status:" -ForegroundColor Yellow
    pm2 status
    
    Write-Host "`nManagement Commands:" -ForegroundColor Yellow
    Write-Host "  Start:   pm2 start servicedesk" -ForegroundColor White
    Write-Host "  Stop:    pm2 stop servicedesk" -ForegroundColor White
    Write-Host "  Restart: pm2 restart servicedesk" -ForegroundColor White
    Write-Host "  Status:  pm2 status" -ForegroundColor White
    Write-Host "  Logs:    pm2 logs servicedesk" -ForegroundColor White
    Write-Host "  Monitor: pm2 monit" -ForegroundColor White
    
    Write-Host "`nApplication URL: http://localhost:3000" -ForegroundColor Green
    Write-Host "Logs Location: $AppPath\logs\" -ForegroundColor Green
    
} catch {
    Write-Log "ERROR: $_" "ERROR"
    Write-Log "Service setup failed. Please check the error messages above" "ERROR"
    exit 1
}

Write-Host "`nPress any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")