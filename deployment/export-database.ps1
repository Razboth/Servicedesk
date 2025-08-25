# PowerShell Script to Export Current Database for Deployment
# This creates a database dump that can be used for initial deployment

param(
    [string]$OutputPath = ".\deployment\database",
    [string]$DbHost = "localhost",
    [string]$DbPort = "5432",
    [string]$DbName = "servicedesk_database",
    [string]$DbUser = "postgres"
)

# Create output directory if it doesn't exist
if (!(Test-Path -Path $OutputPath)) {
    New-Item -ItemType Directory -Path $OutputPath | Out-Null
    Write-Host "Created output directory: $OutputPath" -ForegroundColor Green
}

$timestamp = Get-Date -Format "yyyyMMdd"
$schemaFile = Join-Path $OutputPath "servicedesk_schema_$timestamp.sql"
$dataFile = Join-Path $OutputPath "servicedesk_data_$timestamp.sql"
$fullBackupFile = Join-Path $OutputPath "servicedesk_full_$timestamp.sql"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Database Export for Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

try {
    # Set PostgreSQL password
    Write-Host "Enter PostgreSQL password for user ${DbUser}:" -ForegroundColor Yellow
    $securePassword = Read-Host -AsSecureString
    $PGPASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword))
    $env:PGPASSWORD = $PGPASSWORD

    # Export schema only
    Write-Host "`nExporting database schema..." -ForegroundColor Yellow
    $schemaArgs = @(
        "-h", $DbHost,
        "-p", $DbPort,
        "-U", $DbUser,
        "-d", $DbName,
        "-f", $schemaFile,
        "--schema-only",
        "--no-owner",
        "--no-privileges",
        "--if-exists",
        "--clean",
        "--create"
    )
    
    $process = Start-Process -FilePath "pg_dump" -ArgumentList $schemaArgs -Wait -PassThru -NoNewWindow
    if ($process.ExitCode -eq 0) {
        Write-Host "Schema exported successfully to: $schemaFile" -ForegroundColor Green
    } else {
        throw "Schema export failed"
    }

    # Export data only (excluding sensitive data)
    Write-Host "`nExporting essential data..." -ForegroundColor Yellow
    $dataArgs = @(
        "-h", $DbHost,
        "-p", $DbPort,
        "-U", $DbUser,
        "-d", $DbName,
        "-f", $dataFile,
        "--data-only",
        "--no-owner",
        "--no-privileges",
        "--disable-triggers",
        # Include only essential tables for initial setup
        "-t", "branches",
        "-t", "support_groups",
        "-t", "service_categories",
        "-t", "service_subcategories",
        "-t", "service_items",
        "-t", "services",
        "-t", "users",
        "-t", "atms",
        "-t", "sla_configurations",
        "-t", "field_templates",
        "-t", "task_templates",
        "-t", "task_template_items",
        "-t", "email_templates",
        "-t", "vendors"
    )
    
    $process = Start-Process -FilePath "pg_dump" -ArgumentList $dataArgs -Wait -PassThru -NoNewWindow
    if ($process.ExitCode -eq 0) {
        Write-Host "Data exported successfully to: $dataFile" -ForegroundColor Green
    } else {
        throw "Data export failed"
    }

    # Create full backup (schema + all data)
    Write-Host "`nCreating full backup..." -ForegroundColor Yellow
    $fullArgs = @(
        "-h", $DbHost,
        "-p", $DbPort,
        "-U", $DbUser,
        "-d", $DbName,
        "-f", $fullBackupFile,
        "--no-owner",
        "--no-privileges",
        "--if-exists",
        "--clean",
        "--create"
    )
    
    $process = Start-Process -FilePath "pg_dump" -ArgumentList $fullArgs -Wait -PassThru -NoNewWindow
    if ($process.ExitCode -eq 0) {
        Write-Host "Full backup created successfully: $fullBackupFile" -ForegroundColor Green
    } else {
        throw "Full backup failed"
    }

    # Compress the files
    Write-Host "`nCompressing export files..." -ForegroundColor Yellow
    $zipFile = Join-Path $OutputPath "servicedesk_deployment_$timestamp.zip"
    
    Compress-Archive -Path @($schemaFile, $dataFile, $fullBackupFile) -DestinationPath $zipFile -CompressionLevel Optimal
    
    if (Test-Path $zipFile) {
        # Remove uncompressed files
        Remove-Item $schemaFile, $dataFile, $fullBackupFile
        
        $zipSize = (Get-Item $zipFile).Length / 1MB
        Write-Host "Export package created: $zipFile" -ForegroundColor Green
        Write-Host "Package size: $([math]::Round($zipSize, 2)) MB" -ForegroundColor Green
    }

    # Create deployment instructions
    $instructions = @"
========================================
DATABASE DEPLOYMENT INSTRUCTIONS
========================================
Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

This package contains:
1. servicedesk_schema_$timestamp.sql - Database schema only
2. servicedesk_data_$timestamp.sql - Essential data for initial setup
3. servicedesk_full_$timestamp.sql - Complete database backup

DEPLOYMENT STEPS:
-----------------
1. Install PostgreSQL on the target server
2. Create database and user:
   CREATE DATABASE servicedesk_database;
   CREATE USER servicedesk_user WITH PASSWORD 'YourSecurePassword';
   GRANT ALL PRIVILEGES ON DATABASE servicedesk_database TO servicedesk_user;

3. For NEW installation (recommended):
   - Restore schema: psql -U servicedesk_user -d servicedesk_database -f servicedesk_schema_$timestamp.sql
   - Restore data: psql -U servicedesk_user -d servicedesk_database -f servicedesk_data_$timestamp.sql
   - Run additional seeds: npm run db:seed

4. For FULL restore (includes all existing data):
   - Restore full backup: psql -U servicedesk_user -d servicedesk_database -f servicedesk_full_$timestamp.sql

5. After restore:
   - Update .env.production with correct DATABASE_URL
   - Run: npx prisma generate
   - Run: npx prisma db push
   - Start application: npm run build && npm run start

INCLUDED DATA:
--------------
- All branches
- Support groups
- Service catalog (categories, subcategories, items)
- Default users
- ATM configurations
- SLA configurations
- Task templates
- Email templates
- Vendors

NOT INCLUDED (in essential data):
----------------------------------
- Tickets
- Ticket comments
- Audit logs
- Login attempts
- Session data
- Monitoring logs

These will be created fresh in the new installation.

========================================
"@
    
    $instructionsFile = Join-Path $OutputPath "DEPLOYMENT_INSTRUCTIONS.txt"
    Set-Content -Path $instructionsFile -Value $instructions
    Write-Host "`nDeployment instructions saved to: $instructionsFile" -ForegroundColor Green

    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "Export Complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Deployment package: $zipFile" -ForegroundColor Yellow
    Write-Host "Instructions: $instructionsFile" -ForegroundColor Yellow

} catch {
    Write-Host "ERROR: $_" -ForegroundColor Red
    exit 1
} finally {
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}