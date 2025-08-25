# PowerShell Script to Verify Environment Variables and Application Config
# Can be run without Administrator privileges

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ServiceDesk Environment Verification" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Check if Node.js is available
function Test-NodeJS {
    try {
        $nodeVersion = node --version 2>$null
        if ($nodeVersion) {
            Write-Host "✓ Node.js: $nodeVersion" -ForegroundColor Green
            return $true
        }
    } catch {}
    Write-Host "✗ Node.js: Not found" -ForegroundColor Red
    return $false
}

# Check if PostgreSQL is available
function Test-PostgreSQL {
    try {
        $pgVersion = psql --version 2>$null
        if ($pgVersion) {
            Write-Host "✓ PostgreSQL: $pgVersion" -ForegroundColor Green
            return $true
        }
    } catch {}
    Write-Host "✗ PostgreSQL: Not found in PATH" -ForegroundColor Yellow
    Write-Host "  Note: PostgreSQL might be installed but not in PATH" -ForegroundColor Gray
    return $false
}

# Check required environment variables
function Test-EnvironmentVariables {
    Write-Host "`n=== ENVIRONMENT VARIABLES ===" -ForegroundColor Cyan
    
    $required = @(
        "DATABASE_URL",
        "NEXTAUTH_URL", 
        "NEXTAUTH_SECRET"
    )
    
    $optional = @(
        "NODE_ENV",
        "PORT",
        "EMAIL_SERVER",
        "EMAIL_FROM",
        "MAX_FILE_SIZE",
        "UPLOAD_DIR",
        "AUTO_START_MONITORING",
        "SESSION_TIMEOUT",
        "LOG_LEVEL",
        "LOG_DIR"
    )
    
    $allValid = $true
    
    Write-Host "`nRequired Variables:" -ForegroundColor Yellow
    foreach ($var in $required) {
        # Check both prefixed and non-prefixed versions
        $prefixedVar = "SERVICEDESK_$var"
        $value = [System.Environment]::GetEnvironmentVariable($prefixedVar, [System.EnvironmentVariableTarget]::Machine)
        if (-not $value) {
            $value = [System.Environment]::GetEnvironmentVariable($var, [System.EnvironmentVariableTarget]::Machine)
        }
        if (-not $value) {
            $value = $env:$prefixedVar
            if (-not $value) {
                $value = $env:$var
            }
        }
        
        if ($value) {
            if ($var -like "*SECRET*" -or $var -like "*PASSWORD*" -or $var -like "*DATABASE_URL*") {
                Write-Host "  ✓ $var = [SET]" -ForegroundColor Green
            } else {
                Write-Host "  ✓ $var = $value" -ForegroundColor Green
            }
        } else {
            Write-Host "  ✗ $var = [NOT SET]" -ForegroundColor Red
            $allValid = $false
        }
    }
    
    Write-Host "`nOptional Variables:" -ForegroundColor Yellow
    foreach ($var in $optional) {
        $prefixedVar = "SERVICEDESK_$var"
        $value = [System.Environment]::GetEnvironmentVariable($prefixedVar, [System.EnvironmentVariableTarget]::Machine)
        if (-not $value) {
            $value = [System.Environment]::GetEnvironmentVariable($var, [System.EnvironmentVariableTarget]::Machine)
        }
        if (-not $value) {
            $value = $env:$prefixedVar
            if (-not $value) {
                $value = $env:$var
            }
        }
        
        if ($value) {
            Write-Host "  ✓ $var = $value" -ForegroundColor Green
        } else {
            Write-Host "  - $var = [DEFAULT]" -ForegroundColor Gray
        }
    }
    
    return $allValid
}

# Test database connection
function Test-DatabaseConnection {
    Write-Host "`n=== DATABASE CONNECTION ===" -ForegroundColor Cyan
    
    # Get database URL
    $dbUrl = [System.Environment]::GetEnvironmentVariable("SERVICEDESK_DATABASE_URL", [System.EnvironmentVariableTarget]::Machine)
    if (-not $dbUrl) {
        $dbUrl = [System.Environment]::GetEnvironmentVariable("DATABASE_URL", [System.EnvironmentVariableTarget]::Machine)
    }
    if (-not $dbUrl) {
        $dbUrl = $env:SERVICEDESK_DATABASE_URL
        if (-not $dbUrl) {
            $dbUrl = $env:DATABASE_URL
        }
    }
    
    if (-not $dbUrl) {
        Write-Host "✗ Cannot test - DATABASE_URL not set" -ForegroundColor Red
        return $false
    }
    
    # Parse connection string
    if ($dbUrl -match "postgresql://([^:]+):([^@]+)@([^:/]+):?(\d+)?/(.+)") {
        $dbUser = $matches[1]
        $dbPass = $matches[2]
        $dbHost = $matches[3]
        $dbPort = if ($matches[4]) { $matches[4] } else { "5432" }
        $dbName = $matches[5]
        
        Write-Host "Testing connection to:" -ForegroundColor Yellow
        Write-Host "  Host: $dbHost" -ForegroundColor Gray
        Write-Host "  Port: $dbPort" -ForegroundColor Gray
        Write-Host "  Database: $dbName" -ForegroundColor Gray
        Write-Host "  User: $dbUser" -ForegroundColor Gray
        
        # Test connection using psql
        $env:PGPASSWORD = $dbPass
        try {
            $result = psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -c "SELECT version();" 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✓ Database connection successful" -ForegroundColor Green
                return $true
            } else {
                Write-Host "✗ Database connection failed" -ForegroundColor Red
                Write-Host "  Error: $result" -ForegroundColor Gray
                return $false
            }
        } catch {
            Write-Host "✗ Cannot test - psql not available" -ForegroundColor Yellow
            return $false
        } finally {
            Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
        }
    } else {
        Write-Host "✗ Invalid DATABASE_URL format" -ForegroundColor Red
        return $false
    }
}

# Check application files
function Test-ApplicationFiles {
    Write-Host "`n=== APPLICATION FILES ===" -ForegroundColor Cyan
    
    $requiredFiles = @(
        "package.json",
        "next.config.js",
        "prisma\schema.prisma",
        "lib\env-config.ts"
    )
    
    $allPresent = $true
    foreach ($file in $requiredFiles) {
        if (Test-Path $file) {
            Write-Host "  ✓ $file" -ForegroundColor Green
        } else {
            Write-Host "  ✗ $file - Missing" -ForegroundColor Red
            $allPresent = $false
        }
    }
    
    # Check if node_modules exists
    if (Test-Path "node_modules") {
        $moduleCount = (Get-ChildItem "node_modules" | Measure-Object).Count
        Write-Host "  ✓ node_modules ($moduleCount packages)" -ForegroundColor Green
    } else {
        Write-Host "  ✗ node_modules - Not installed (run: npm install)" -ForegroundColor Yellow
    }
    
    # Check if .next build exists
    if (Test-Path ".next") {
        Write-Host "  ✓ .next (build directory)" -ForegroundColor Green
    } else {
        Write-Host "  - .next - Not built yet (run: npm run build)" -ForegroundColor Gray
    }
    
    return $allPresent
}

# Check ports
function Test-Ports {
    Write-Host "`n=== PORT AVAILABILITY ===" -ForegroundColor Cyan
    
    # Get configured port
    $port = [System.Environment]::GetEnvironmentVariable("SERVICEDESK_PORT", [System.EnvironmentVariableTarget]::Machine)
    if (-not $port) {
        $port = $env:SERVICEDESK_PORT
        if (-not $port) {
            $port = "3000"
        }
    }
    
    # Check if port is in use
    $tcpConnection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($tcpConnection) {
        Write-Host "  ✗ Port $port is already in use" -ForegroundColor Red
        Write-Host "    Process: $($tcpConnection.OwningProcess)" -ForegroundColor Gray
        return $false
    } else {
        Write-Host "  ✓ Port $port is available" -ForegroundColor Green
    }
    
    # Check PostgreSQL port
    $pgConnection = Get-NetTCPConnection -LocalPort 5432 -ErrorAction SilentlyContinue
    if ($pgConnection) {
        Write-Host "  ✓ PostgreSQL port 5432 is in use (service running)" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ PostgreSQL port 5432 is not in use (service may not be running)" -ForegroundColor Yellow
    }
    
    return $true
}

# Run verification with Node.js script
function Test-NodeEnvironment {
    Write-Host "`n=== NODE.JS ENVIRONMENT TEST ===" -ForegroundColor Cyan
    
    if (-not (Test-NodeJS)) {
        Write-Host "  Cannot test - Node.js not installed" -ForegroundColor Red
        return $false
    }
    
    # Create a test script
    $testScript = @'
const envConfig = require('./lib/env-config');

try {
    const config = envConfig.loadEnvConfig();
    console.log('✓ Environment configuration loaded successfully');
    console.log('  Source:', process.env.SERVICEDESK_DATABASE_URL ? 'Windows Environment Variables' : 'Other/Default');
    process.exit(0);
} catch (error) {
    console.error('✗ Environment configuration failed:', error.message);
    process.exit(1);
}
'@
    
    $testFile = "test-env.js"
    Set-Content -Path $testFile -Value $testScript
    
    try {
        $result = node $testFile 2>&1
        Write-Host $result
        $success = $LASTEXITCODE -eq 0
        return $success
    } catch {
        Write-Host "  ✗ Failed to test Node environment" -ForegroundColor Red
        return $false
    } finally {
        Remove-Item $testFile -ErrorAction SilentlyContinue
    }
}

# Main verification
Write-Host "`n=== SYSTEM REQUIREMENTS ===" -ForegroundColor Cyan
$nodeOk = Test-NodeJS
$pgOk = Test-PostgreSQL

$envOk = Test-EnvironmentVariables
$filesOk = Test-ApplicationFiles
$portsOk = Test-Ports
$dbOk = Test-DatabaseConnection

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "VERIFICATION SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$results = @{
    "Node.js" = $nodeOk
    "PostgreSQL" = $pgOk
    "Environment Variables" = $envOk
    "Application Files" = $filesOk
    "Port Availability" = $portsOk
    "Database Connection" = $dbOk
}

$allPassed = $true
foreach ($key in $results.Keys) {
    if ($results[$key]) {
        Write-Host "✓ $key" -ForegroundColor Green
    } else {
        Write-Host "✗ $key" -ForegroundColor Red
        $allPassed = $false
    }
}

if ($allPassed) {
    Write-Host "`n✅ All checks passed! System is ready." -ForegroundColor Green
    Write-Host "You can start the application with: npm run start" -ForegroundColor Cyan
} else {
    Write-Host "`n⚠️  Some checks failed. Please resolve the issues above." -ForegroundColor Yellow
    Write-Host "`nTo set up environment variables, run:" -ForegroundColor Cyan
    Write-Host "  .\deployment\setup-environment-variables.ps1" -ForegroundColor White
}

Write-Host "`nPress any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")