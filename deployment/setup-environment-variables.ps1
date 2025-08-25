# PowerShell Script to Setup Windows System Environment Variables
# Must be run as Administrator

param(
    [Parameter(Mandatory=$false)]
    [string]$Action = "setup"  # setup, show, remove
)

# Check if running as Administrator
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "This script must be run as Administrator. Exiting..." -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ServiceDesk Environment Variables Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Define all required environment variables
$requiredVars = @{
    # Database
    "SERVICEDESK_DATABASE_URL" = @{
        Description = "PostgreSQL connection string"
        Example = "postgresql://servicedesk_user:YourPassword@localhost:5432/servicedesk_database"
        Required = $true
    }
    
    # NextAuth
    "SERVICEDESK_NEXTAUTH_URL" = @{
        Description = "Application URL for authentication callbacks"
        Example = "http://localhost:3000"
        Required = $true
    }
    "SERVICEDESK_NEXTAUTH_SECRET" = @{
        Description = "Secret key for JWT signing (32+ characters)"
        Example = "generate-with-crypto-random-string"
        Required = $true
    }
    
    # Application
    "SERVICEDESK_NODE_ENV" = @{
        Description = "Node environment"
        Example = "production"
        Required = $true
        Default = "production"
    }
    "SERVICEDESK_PORT" = @{
        Description = "Application port"
        Example = "3000"
        Required = $true
        Default = "3000"
    }
    
    # Optional Email Configuration
    "SERVICEDESK_EMAIL_SERVER" = @{
        Description = "SMTP server for email (optional)"
        Example = "smtp.gmail.com:587"
        Required = $false
    }
    "SERVICEDESK_EMAIL_FROM" = @{
        Description = "From email address (optional)"
        Example = "noreply@banksulutgo.co.id"
        Required = $false
    }
    
    # File Upload
    "SERVICEDESK_MAX_FILE_SIZE" = @{
        Description = "Maximum file upload size in MB"
        Example = "10"
        Required = $false
        Default = "10"
    }
    "SERVICEDESK_UPLOAD_DIR" = @{
        Description = "Upload directory path"
        Example = "C:\ServiceDesk\uploads"
        Required = $false
        Default = "C:\ServiceDesk\uploads"
    }
    
    # Monitoring
    "SERVICEDESK_AUTO_START_MONITORING" = @{
        Description = "Auto-start network monitoring"
        Example = "false"
        Required = $false
        Default = "false"
    }
    "SERVICEDESK_BRANCH_MONITORING_INTERVAL" = @{
        Description = "Branch monitoring interval in ms"
        Example = "120000"
        Required = $false
        Default = "120000"
    }
    "SERVICEDESK_ATM_MONITORING_INTERVAL" = @{
        Description = "ATM monitoring interval in ms"
        Example = "60000"
        Required = $false
        Default = "60000"
    }
    
    # Security
    "SERVICEDESK_SESSION_TIMEOUT" = @{
        Description = "Session timeout in minutes"
        Example = "30"
        Required = $false
        Default = "30"
    }
    "SERVICEDESK_MAX_LOGIN_ATTEMPTS" = @{
        Description = "Max login attempts before lockout"
        Example = "5"
        Required = $false
        Default = "5"
    }
    "SERVICEDESK_LOCKOUT_DURATION" = @{
        Description = "Account lockout duration in minutes"
        Example = "30"
        Required = $false
        Default = "30"
    }
    
    # Logging
    "SERVICEDESK_LOG_LEVEL" = @{
        Description = "Log level (error, warn, info, debug)"
        Example = "info"
        Required = $false
        Default = "info"
    }
    "SERVICEDESK_LOG_DIR" = @{
        Description = "Log directory path"
        Example = "C:\ServiceDesk\logs"
        Required = $false
        Default = "C:\ServiceDesk\logs"
    }
}

function Setup-EnvironmentVariables {
    Write-Host "`nSetting up environment variables..." -ForegroundColor Yellow
    Write-Host "Note: All variables will be prefixed with 'SERVICEDESK_'" -ForegroundColor Cyan
    Write-Host ""
    
    $varsToSet = @{}
    
    # Collect required variables
    Write-Host "=== REQUIRED VARIABLES ===" -ForegroundColor Green
    foreach ($varName in $requiredVars.Keys) {
        $varInfo = $requiredVars[$varName]
        if ($varInfo.Required) {
            Write-Host "`n$varName" -ForegroundColor Yellow
            Write-Host "  Description: $($varInfo.Description)" -ForegroundColor Gray
            Write-Host "  Example: $($varInfo.Example)" -ForegroundColor DarkGray
            
            $currentValue = [System.Environment]::GetEnvironmentVariable($varName, [System.EnvironmentVariableTarget]::Machine)
            if ($currentValue) {
                Write-Host "  Current value: [SET]" -ForegroundColor Green
                $useExisting = Read-Host "  Keep existing value? (Y/N)"
                if ($useExisting -eq 'Y' -or $useExisting -eq 'y') {
                    $varsToSet[$varName] = $currentValue
                    continue
                }
            }
            
            if ($varName -like "*SECRET*" -or $varName -like "*PASSWORD*") {
                $value = Read-Host "  Enter value" -AsSecureString
                $value = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($value))
            } else {
                $value = Read-Host "  Enter value"
            }
            
            if ([string]::IsNullOrWhiteSpace($value) -and $varInfo.Default) {
                $value = $varInfo.Default
                Write-Host "  Using default: $value" -ForegroundColor DarkGreen
            }
            
            $varsToSet[$varName] = $value
        }
    }
    
    # Ask about optional variables
    Write-Host "`n=== OPTIONAL VARIABLES ===" -ForegroundColor Yellow
    $setupOptional = Read-Host "Do you want to configure optional variables? (Y/N)"
    
    if ($setupOptional -eq 'Y' -or $setupOptional -eq 'y') {
        foreach ($varName in $requiredVars.Keys) {
            $varInfo = $requiredVars[$varName]
            if (-not $varInfo.Required) {
                Write-Host "`n$varName" -ForegroundColor Yellow
                Write-Host "  Description: $($varInfo.Description)" -ForegroundColor Gray
                Write-Host "  Example: $($varInfo.Example)" -ForegroundColor DarkGray
                if ($varInfo.Default) {
                    Write-Host "  Default: $($varInfo.Default)" -ForegroundColor DarkGray
                }
                
                $currentValue = [System.Environment]::GetEnvironmentVariable($varName, [System.EnvironmentVariableTarget]::Machine)
                if ($currentValue) {
                    Write-Host "  Current value: [SET]" -ForegroundColor Green
                    $useExisting = Read-Host "  Keep existing value? (Y/N)"
                    if ($useExisting -eq 'Y' -or $useExisting -eq 'y') {
                        continue
                    }
                }
                
                $value = Read-Host "  Enter value (press Enter to skip)"
                
                if (![string]::IsNullOrWhiteSpace($value)) {
                    $varsToSet[$varName] = $value
                } elseif ($varInfo.Default) {
                    $varsToSet[$varName] = $varInfo.Default
                }
            }
        }
    } else {
        # Set defaults for optional variables
        foreach ($varName in $requiredVars.Keys) {
            $varInfo = $requiredVars[$varName]
            if (-not $varInfo.Required -and $varInfo.Default) {
                $currentValue = [System.Environment]::GetEnvironmentVariable($varName, [System.EnvironmentVariableTarget]::Machine)
                if (-not $currentValue) {
                    $varsToSet[$varName] = $varInfo.Default
                }
            }
        }
    }
    
    # Generate NEXTAUTH_SECRET if needed
    if ($varsToSet["SERVICEDESK_NEXTAUTH_SECRET"] -eq "generate") {
        Write-Host "`nGenerating NEXTAUTH_SECRET..." -ForegroundColor Yellow
        Add-Type -AssemblyName System.Web
        $bytes = New-Object byte[] 32
        [System.Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
        $secret = [System.Convert]::ToBase64String($bytes)
        $varsToSet["SERVICEDESK_NEXTAUTH_SECRET"] = $secret
        Write-Host "Generated secret: [HIDDEN]" -ForegroundColor Green
    }
    
    # Confirm before setting
    Write-Host "`n=== CONFIRMATION ===" -ForegroundColor Cyan
    Write-Host "The following environment variables will be set:" -ForegroundColor Yellow
    foreach ($varName in $varsToSet.Keys) {
        if ($varName -like "*SECRET*" -or $varName -like "*PASSWORD*" -or $varName -like "*DATABASE_URL*") {
            Write-Host "  $varName = [HIDDEN]" -ForegroundColor White
        } else {
            Write-Host "  $varName = $($varsToSet[$varName])" -ForegroundColor White
        }
    }
    
    Write-Host "`nProceed with setting these variables? (Y/N): " -ForegroundColor Red -NoNewline
    $confirm = Read-Host
    
    if ($confirm -ne 'Y' -and $confirm -ne 'y') {
        Write-Host "Setup cancelled." -ForegroundColor Yellow
        return
    }
    
    # Set the environment variables
    Write-Host "`nSetting environment variables..." -ForegroundColor Yellow
    foreach ($varName in $varsToSet.Keys) {
        try {
            [System.Environment]::SetEnvironmentVariable($varName, $varsToSet[$varName], [System.EnvironmentVariableTarget]::Machine)
            Write-Host "  ✓ $varName" -ForegroundColor Green
        } catch {
            Write-Host "  ✗ $varName - Error: $_" -ForegroundColor Red
        }
    }
    
    Write-Host "`n✅ Environment variables have been set successfully!" -ForegroundColor Green
    Write-Host "⚠️  IMPORTANT: You need to restart your PowerShell/Command Prompt for changes to take effect" -ForegroundColor Yellow
    Write-Host "⚠️  IMPORTANT: You may need to restart the application/service as well" -ForegroundColor Yellow
}

function Show-EnvironmentVariables {
    Write-Host "`nCurrent ServiceDesk Environment Variables:" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    
    $found = $false
    foreach ($varName in $requiredVars.Keys) {
        $value = [System.Environment]::GetEnvironmentVariable($varName, [System.EnvironmentVariableTarget]::Machine)
        if ($value) {
            $found = $true
            if ($varName -like "*SECRET*" -or $varName -like "*PASSWORD*" -or $varName -like "*DATABASE_URL*") {
                Write-Host "$varName = [SET]" -ForegroundColor Green
            } else {
                Write-Host "$varName = $value" -ForegroundColor White
            }
        }
    }
    
    if (-not $found) {
        Write-Host "No ServiceDesk environment variables found." -ForegroundColor Yellow
        Write-Host "Run this script with 'setup' parameter to configure them." -ForegroundColor Gray
    }
}

function Remove-EnvironmentVariables {
    Write-Host "`n⚠️  WARNING: This will remove all ServiceDesk environment variables!" -ForegroundColor Red
    Write-Host "Are you sure you want to continue? (Y/N): " -ForegroundColor Yellow -NoNewline
    $confirm = Read-Host
    
    if ($confirm -ne 'Y' -and $confirm -ne 'y') {
        Write-Host "Removal cancelled." -ForegroundColor Yellow
        return
    }
    
    Write-Host "`nRemoving environment variables..." -ForegroundColor Yellow
    foreach ($varName in $requiredVars.Keys) {
        $value = [System.Environment]::GetEnvironmentVariable($varName, [System.EnvironmentVariableTarget]::Machine)
        if ($value) {
            try {
                [System.Environment]::SetEnvironmentVariable($varName, $null, [System.EnvironmentVariableTarget]::Machine)
                Write-Host "  ✓ Removed $varName" -ForegroundColor Green
            } catch {
                Write-Host "  ✗ Failed to remove $varName - Error: $_" -ForegroundColor Red
            }
        }
    }
    
    Write-Host "`n✅ Environment variables removed successfully!" -ForegroundColor Green
}

# Main execution
switch ($Action.ToLower()) {
    "setup" {
        Setup-EnvironmentVariables
    }
    "show" {
        Show-EnvironmentVariables
    }
    "remove" {
        Remove-EnvironmentVariables
    }
    default {
        Write-Host "Invalid action. Use: setup, show, or remove" -ForegroundColor Red
        Write-Host "Example: .\setup-environment-variables.ps1 -Action setup" -ForegroundColor Gray
    }
}

Write-Host "`nPress any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")