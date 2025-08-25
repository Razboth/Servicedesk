# PowerShell Script to Restore PostgreSQL Database
# Run as Administrator

param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFile,
    [string]$DbHost = "localhost",
    [string]$DbPort = "5432",
    [string]$DbName = "servicedesk_database",
    [string]$DbUser = "servicedesk_user",
    [switch]$CreateDatabase
)

# Function to log messages
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $logMessage = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') [$Level] $Message"
    
    switch ($Level) {
        "ERROR" { Write-Host $Message -ForegroundColor Red }
        "WARNING" { Write-Host $Message -ForegroundColor Yellow }
        "SUCCESS" { Write-Host $Message -ForegroundColor Green }
        default { Write-Host $Message }
    }
}

Write-Log "Starting database restore process" "INFO"

# Check if backup file exists
if (!(Test-Path $BackupFile)) {
    Write-Log "Backup file not found: $BackupFile" "ERROR"
    exit 1
}

# Extract if it's a zip file
$sqlFile = $BackupFile
if ($BackupFile.EndsWith(".zip")) {
    Write-Log "Extracting compressed backup..." "INFO"
    $extractPath = [System.IO.Path]::GetDirectoryName($BackupFile)
    Expand-Archive -Path $BackupFile -DestinationPath $extractPath -Force
    $sqlFile = $BackupFile.Replace(".zip", "")
    
    if (!(Test-Path $sqlFile)) {
        Write-Log "Failed to extract SQL file from archive" "ERROR"
        exit 1
    }
}

try {
    # Set PostgreSQL password as environment variable
    Write-Host "Enter PostgreSQL password for user ${DbUser}:" -ForegroundColor Yellow
    $securePassword = Read-Host -AsSecureString
    $PGPASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword))
    $env:PGPASSWORD = $PGPASSWORD

    # Check if psql exists
    $psqlPath = Get-Command psql -ErrorAction SilentlyContinue
    if (!$psqlPath) {
        # Try common PostgreSQL installation paths
        $possiblePaths = @(
            "C:\Program Files\PostgreSQL\15\bin\psql.exe",
            "C:\Program Files\PostgreSQL\14\bin\psql.exe",
            "C:\Program Files\PostgreSQL\13\bin\psql.exe",
            "C:\Program Files (x86)\PostgreSQL\15\bin\psql.exe"
        )
        
        foreach ($path in $possiblePaths) {
            if (Test-Path $path) {
                $psqlPath = $path
                break
            }
        }
        
        if (!$psqlPath) {
            throw "psql not found. Please ensure PostgreSQL is installed and added to PATH"
        }
    }

    Write-Log "Using psql from: $psqlPath" "INFO"

    # Confirm restore action
    Write-Host "`n" -NoNewline
    Write-Host "WARNING: This will restore the database from backup!" -ForegroundColor Yellow
    Write-Host "Database: $DbName" -ForegroundColor Yellow
    Write-Host "Backup file: $sqlFile" -ForegroundColor Yellow
    Write-Host "`nDo you want to continue? (Y/N): " -ForegroundColor Red -NoNewline
    $confirmation = Read-Host
    
    if ($confirmation -ne 'Y' -and $confirmation -ne 'y') {
        Write-Log "Restore cancelled by user" "WARNING"
        exit 0
    }

    # Drop existing connections to the database
    Write-Log "Terminating existing database connections..." "INFO"
    $dropConnectionsQuery = @"
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = '$DbName'
  AND pid <> pg_backend_pid();
"@

    psql -h $DbHost -p $DbPort -U $DbUser -d postgres -c $dropConnectionsQuery 2>$null

    # Create database if needed
    if ($CreateDatabase) {
        Write-Log "Creating database if it doesn't exist..." "INFO"
        $createDbQuery = "CREATE DATABASE $DbName;"
        psql -h $DbHost -p $DbPort -U $DbUser -d postgres -c $createDbQuery 2>$null
    }

    # Restore the database
    Write-Log "Restoring database from backup..." "INFO"
    Write-Log "This may take several minutes depending on the database size..." "INFO"
    
    $arguments = @(
        "-h", $DbHost,
        "-p", $DbPort,
        "-U", $DbUser,
        "-d", $DbName,
        "-f", $sqlFile,
        "-v", "ON_ERROR_STOP=1"
    )

    $process = Start-Process -FilePath "psql" -ArgumentList $arguments -Wait -PassThru -NoNewWindow
    
    if ($process.ExitCode -eq 0) {
        Write-Log "Database restored successfully!" "SUCCESS"
        
        # Run post-restore tasks
        Write-Log "Running post-restore tasks..." "INFO"
        
        # Update Prisma
        Write-Log "Updating Prisma schema..." "INFO"
        Set-Location "C:\ServiceDesk"
        npx prisma generate
        npx prisma db push --skip-generate
        
        Write-Log "Post-restore tasks completed" "SUCCESS"
    } else {
        throw "Restore failed with exit code: $($process.ExitCode)"
    }

    # Clean up extracted SQL file if it was from a zip
    if ($BackupFile.EndsWith(".zip") -and (Test-Path $sqlFile)) {
        Remove-Item $sqlFile
        Write-Log "Cleaned up temporary SQL file" "INFO"
    }

    # Generate restore report
    $restoreReport = @"
========================================
DATABASE RESTORE REPORT
========================================
Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
Database: $DbName
Host: $DbHost
Backup File: $BackupFile
Status: SUCCESS
========================================
"@
    
    Write-Host $restoreReport -ForegroundColor Cyan

} catch {
    Write-Log "ERROR: $_" "ERROR"
    Write-Log "Restore failed. Please check the error messages above" "ERROR"
    exit 1
} finally {
    # Clear password from environment
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Log "Restore process completed successfully" "SUCCESS"
Write-Host "`nNext steps:" -ForegroundColor Green
Write-Host "1. Restart the application: pm2 restart servicedesk" -ForegroundColor White
Write-Host "2. Verify the application is working correctly" -ForegroundColor White
Write-Host "3. Check for any data inconsistencies" -ForegroundColor White