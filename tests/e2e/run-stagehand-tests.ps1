# PowerShell Script: Run Stagehand E2E Tests
# Usage: .\run-stagehand-tests.ps1 [test-file]

param(
    [string]$TestFile = "",
    [switch]$Headed = $false,
    [switch]$UI = $false,
    [switch]$Debug = $false,
    [switch]$Trace = $false
)

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Stagehand E2E Test Runner" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if server is running
$serverUrl = "http://localhost:3008"
Write-Host "Checking if server is running on $serverUrl..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri $serverUrl -Method HEAD -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
    Write-Host "✓ Server is running!" -ForegroundColor Green
} catch {
    Write-Host "✗ Server is NOT running!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please start the server first:" -ForegroundColor Yellow
    Write-Host "  npm run dev" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host ""

# Build test command
$command = "npx playwright test"

# Add test file if specified
if ($TestFile) {
    Write-Host "Running specific test file: $TestFile" -ForegroundColor Yellow
    $command += " tests/e2e/$TestFile"
} else {
    Write-Host "Running all Stagehand tests..." -ForegroundColor Yellow
    $command += " tests/e2e/*.stagehand.spec.ts"
}

# Add options
if ($Headed) {
    Write-Host "  Mode: Headed (visible browser)" -ForegroundColor Cyan
    $command += " --headed"
}

if ($UI) {
    Write-Host "  Mode: UI Mode" -ForegroundColor Cyan
    $command += " --ui"
}

if ($Debug) {
    Write-Host "  Mode: Debug (inspector)" -ForegroundColor Cyan
    $command += " --debug"
}

if ($Trace) {
    Write-Host "  Trace: Enabled" -ForegroundColor Cyan
    $command += " --trace on"
}

Write-Host ""
Write-Host "Executing: $command" -ForegroundColor Gray
Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Execute the command
Invoke-Expression $command

$exitCode = $LASTEXITCODE

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan

if ($exitCode -eq 0) {
    Write-Host "✓ All tests passed!" -ForegroundColor Green
} else {
    Write-Host "✗ Some tests failed!" -ForegroundColor Red
}

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Exit with the same code as the test run
exit $exitCode
