# PowerShell Script to Create Deployment Package
# Creates a complete package for Windows Server deployment

param(
    [string]$OutputPath = ".\deployment-package"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Creating ServiceDesk Deployment Package" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Create package directory structure
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$packageName = "ServiceDesk_Deployment_$timestamp"
$packagePath = Join-Path $OutputPath $packageName

Write-Host "`nCreating package structure..." -ForegroundColor Yellow

# Create directories
$directories = @(
    $packagePath,
    "$packagePath\application",
    "$packagePath\database",
    "$packagePath\scripts",
    "$packagePath\documentation"
)

foreach ($dir in $directories) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}

try {
    # Step 1: Export application files (excluding node_modules and .next)
    Write-Host "Copying application files..." -ForegroundColor Yellow
    
    $excludes = @(
        'node_modules',
        '.next',
        '.git',
        'deployment-package',
        '*.log',
        '.env',
        '.env.local'
    )
    
    $sourceFiles = Get-ChildItem -Path "." -Exclude $excludes
    foreach ($item in $sourceFiles) {
        if ($item.Name -ne 'deployment-package') {
            Copy-Item -Path $item.FullName -Destination "$packagePath\application" -Recurse -Force
        }
    }
    
    # Step 2: Copy deployment scripts
    Write-Host "Copying deployment scripts..." -ForegroundColor Yellow
    Copy-Item -Path ".\deployment\*.ps1" -Destination "$packagePath\scripts" -Force
    Copy-Item -Path ".\deployment\.env.production.example" -Destination "$packagePath\application" -Force
    
    # Step 3: Copy documentation
    Write-Host "Copying documentation..." -ForegroundColor Yellow
    Copy-Item -Path ".\deployment\*.md" -Destination "$packagePath\documentation" -Force
    Copy-Item -Path ".\README.md" -Destination "$packagePath\documentation" -Force -ErrorAction SilentlyContinue
    Copy-Item -Path ".\CLAUDE.md" -Destination "$packagePath\documentation" -Force -ErrorAction SilentlyContinue
    
    # Step 4: Create quick start script
    Write-Host "Creating quick start script..." -ForegroundColor Yellow
    
    $quickStart = @'
@echo off
echo ========================================
echo ServiceDesk Quick Installation
echo ========================================
echo.
echo This will install the ServiceDesk application.
echo Make sure you have installed:
echo   1. PostgreSQL 15+
echo   2. Node.js 20+
echo   3. Git
echo.
pause

echo.
echo Step 1: Installing dependencies...
cd application
call npm install

echo.
echo Step 2: Setting up environment...
if not exist .env.production (
    copy .env.production.example .env.production
    echo Please edit .env.production with your settings
    notepad .env.production
    pause
)

echo.
echo Step 3: Setting up database...
call npx prisma generate
call npx prisma db push

echo.
echo Step 4: Seeding database...
call npm run db:seed

echo.
echo Step 5: Building application...
call npm run build

echo.
echo Step 6: Installing PM2...
call npm install -g pm2
call npm install -g pm2-windows-startup

echo.
echo ========================================
echo Installation Complete!
echo ========================================
echo.
echo To start the application:
echo   npm run start
echo.
echo Or with PM2:
echo   pm2 start ecosystem.config.js
echo.
echo Access the application at:
echo   http://localhost:3000
echo.
echo Default credentials:
echo   Username: admin
echo   Password: Admin123!
echo.
pause
'@
    
    Set-Content -Path "$packagePath\QUICK_START.bat" -Value $quickStart
    
    # Step 5: Create ecosystem.config.js
    Write-Host "Creating PM2 configuration..." -ForegroundColor Yellow
    
    $ecosystemConfig = @'
module.exports = {
  apps: [{
    name: 'servicedesk',
    script: 'npm',
    args: 'run start',
    cwd: __dirname + '/application',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
'@
    
    Set-Content -Path "$packagePath\ecosystem.config.js" -Value $ecosystemConfig
    
    # Step 6: Create README
    Write-Host "Creating README..." -ForegroundColor Yellow
    
    $readme = @"
# ServiceDesk Deployment Package

Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

## Package Contents

- **application/** - Complete application source code
- **database/** - Database scripts and backups
- **scripts/** - Deployment and maintenance scripts
- **documentation/** - User guides and documentation
- **QUICK_START.bat** - Quick installation script
- **ecosystem.config.js** - PM2 configuration

## Installation Steps

### Prerequisites
1. Install PostgreSQL 15+
2. Install Node.js 20+
3. Create database in PostgreSQL

### Quick Installation
1. Run QUICK_START.bat as Administrator
2. Follow the prompts
3. Edit .env.production when prompted

### Manual Installation
1. Navigate to application folder
2. Run: npm install
3. Copy .env.production.example to .env.production
4. Edit .env.production with your settings
5. Run: npx prisma generate
6. Run: npx prisma db push
7. Run: npm run db:seed
8. Run: npm run build
9. Run: npm run start

## Configuration

Edit application/.env.production:
- DATABASE_URL - PostgreSQL connection string
- NEXTAUTH_URL - Your server URL
- NEXTAUTH_SECRET - Generate secure secret

## Starting the Application

### With NPM:
\`\`\`
cd application
npm run start
\`\`\`

### With PM2:
\`\`\`
pm2 start ecosystem.config.js
\`\`\`

## Default Credentials

- Username: admin
- Password: Admin123!

**IMPORTANT**: Change the default password after first login!

## Support

For issues, check:
- Logs in application/logs/
- PM2 logs: pm2 logs servicedesk
- Documentation in documentation/ folder

## Security Notes

1. Change all default passwords
2. Generate new NEXTAUTH_SECRET
3. Configure firewall rules
4. Enable HTTPS in production
5. Regular backups recommended
"@
    
    Set-Content -Path "$packagePath\README.md" -Value $readme
    
    # Step 7: Compress the package
    Write-Host "`nCompressing deployment package..." -ForegroundColor Yellow
    $zipFile = "$packagePath.zip"
    
    Compress-Archive -Path $packagePath -DestinationPath $zipFile -CompressionLevel Optimal -Force
    
    if (Test-Path $zipFile) {
        $zipSize = (Get-Item $zipFile).Length / 1MB
        Write-Host "`n========================================" -ForegroundColor Cyan
        Write-Host "Deployment Package Created Successfully!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "Package: $zipFile" -ForegroundColor Yellow
        Write-Host "Size: $([math]::Round($zipSize, 2)) MB" -ForegroundColor Yellow
        Write-Host "`nExtract this package on your Windows Server and run QUICK_START.bat" -ForegroundColor White
    }
    
} catch {
    Write-Host "ERROR: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`nPress any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")