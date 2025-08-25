# PowerShell Script to Backup PostgreSQL Database
# Run as Administrator

param(
    [string]$BackupPath = "C:\ServiceDesk\backups",
    [string]$DbHost = "localhost",
    [string]$DbPort = "5432",
    [string]$DbName = "servicedesk_database",
    [string]$DbUser = "servicedesk_user",
    [string]$RetentionDays = 30
)

# Create backup directory if it doesn't exist
if (!(Test-Path -Path $BackupPath)) {
    New-Item -ItemType Directory -Path $BackupPath | Out-Null
    Write-Host "Created backup directory: $BackupPath" -ForegroundColor Green
}

# Generate timestamp for backup file
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = Join-Path $BackupPath "servicedesk_backup_$timestamp.sql"
$logFile = Join-Path $BackupPath "backup_log_$timestamp.txt"

# Function to log messages
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $logMessage = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') [$Level] $Message"
    Add-Content -Path $logFile -Value $logMessage
    
    switch ($Level) {
        "ERROR" { Write-Host $Message -ForegroundColor Red }
        "WARNING" { Write-Host $Message -ForegroundColor Yellow }
        "SUCCESS" { Write-Host $Message -ForegroundColor Green }
        default { Write-Host $Message }
    }
}

Write-Log "Starting database backup process" "INFO"
Write-Log "Backup file: $backupFile" "INFO"

try {
    # Set PostgreSQL password as environment variable
    Write-Host "Enter PostgreSQL password for user ${DbUser}:" -ForegroundColor Yellow
    $securePassword = Read-Host -AsSecureString
    $PGPASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword))
    $env:PGPASSWORD = $PGPASSWORD

    # Check if pg_dump exists
    $pgDumpPath = Get-Command pg_dump -ErrorAction SilentlyContinue
    if (!$pgDumpPath) {
        # Try common PostgreSQL installation paths
        $possiblePaths = @(
            "C:\Program Files\PostgreSQL\15\bin\pg_dump.exe",
            "C:\Program Files\PostgreSQL\14\bin\pg_dump.exe",
            "C:\Program Files\PostgreSQL\13\bin\pg_dump.exe",
            "C:\Program Files (x86)\PostgreSQL\15\bin\pg_dump.exe"
        )
        
        foreach ($path in $possiblePaths) {
            if (Test-Path $path) {
                $pgDumpPath = $path
                break
            }
        }
        
        if (!$pgDumpPath) {
            throw "pg_dump not found. Please ensure PostgreSQL is installed and added to PATH"
        }
    }

    Write-Log "Using pg_dump from: $pgDumpPath" "INFO"

    # Perform database backup
    Write-Log "Backing up database..." "INFO"
    
    $arguments = @(
        "-h", $DbHost,
        "-p", $DbPort,
        "-U", $DbUser,
        "-d", $DbName,
        "-f", $backupFile,
        "--verbose",
        "--no-owner",
        "--no-privileges",
        "--if-exists",
        "--clean",
        "--create"
    )

    $process = Start-Process -FilePath "pg_dump" -ArgumentList $arguments -Wait -PassThru -NoNewWindow -RedirectStandardError "$logFile.err"
    
    if ($process.ExitCode -eq 0) {
        $backupSize = (Get-Item $backupFile).Length / 1MB
        Write-Log "Database backup completed successfully!" "SUCCESS"
        Write-Log "Backup size: $([math]::Round($backupSize, 2)) MB" "INFO"
        
        # Compress the backup
        Write-Log "Compressing backup file..." "INFO"
        $zipFile = "$backupFile.zip"
        Compress-Archive -Path $backupFile -DestinationPath $zipFile -CompressionLevel Optimal
        
        if (Test-Path $zipFile) {
            Remove-Item $backupFile
            $zipSize = (Get-Item $zipFile).Length / 1MB
            Write-Log "Compression completed. Compressed size: $([math]::Round($zipSize, 2)) MB" "SUCCESS"
            Write-Log "Compression ratio: $([math]::Round((1 - $zipSize/$backupSize) * 100, 2))%" "INFO"
        }
    } else {
        throw "Backup failed with exit code: $($process.ExitCode)"
    }

    # Clean up old backups
    Write-Log "Cleaning up old backups (retention: $RetentionDays days)..." "INFO"
    $cutoffDate = (Get-Date).AddDays(-$RetentionDays)
    $oldBackups = Get-ChildItem -Path $BackupPath -Filter "servicedesk_backup_*.zip" | 
                  Where-Object { $_.CreationTime -lt $cutoffDate }
    
    if ($oldBackups) {
        foreach ($oldBackup in $oldBackups) {
            Remove-Item $oldBackup.FullName
            Write-Log "Removed old backup: $($oldBackup.Name)" "INFO"
        }
    }

    # Generate backup report
    $backupReport = @"
========================================
DATABASE BACKUP REPORT
========================================
Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
Database: $DbName
Host: $DbHost
Backup File: $zipFile
Status: SUCCESS
========================================
"@
    
    Write-Host $backupReport -ForegroundColor Cyan
    Add-Content -Path $logFile -Value $backupReport

} catch {
    Write-Log "ERROR: $_" "ERROR"
    Write-Log "Backup failed. Check the log file for details: $logFile" "ERROR"
    exit 1
} finally {
    # Clear password from environment
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Log "Backup process completed" "SUCCESS"
Write-Host "`nBackup location: $zipFile" -ForegroundColor Green