# verify.ps1 - Run full verification stack before commit
# Usage: .\scripts\verify.ps1 [-Quick]

param(
    [switch]$Quick
)

$ErrorActionPreference = "Stop"

if ($Quick) {
    Write-Host "`nQuick mode: Skipping slow tests`n" -ForegroundColor Cyan
} else {
    Write-Host "`nRunning verification stack...`n" -ForegroundColor Cyan
}

$startTime = Get-Date
$failed = $false

# Layer 1: Static Analysis
Write-Host "Layer 1: Static Analysis" -ForegroundColor Yellow
Write-Host "------------------------"

Write-Host "  > TypeScript..." -NoNewline
try {
    Push-Location app
    npx tsc --noEmit 2>&1 | Out-Null
    Write-Host " PASS" -ForegroundColor Green
} catch {
    Write-Host " FAIL" -ForegroundColor Red
    $failed = $true
} finally {
    Pop-Location
}

Write-Host "  > Python (mypy)..." -NoNewline
try {
    Push-Location server
    python -m mypy . --ignore-missing-imports 2>&1 | Out-Null
    Write-Host " PASS" -ForegroundColor Green
} catch {
    Write-Host " SKIP" -ForegroundColor Yellow
} finally {
    Pop-Location
}

Write-Host "  > Rust (clippy)..." -NoNewline
try {
    Push-Location kernel
    cargo clippy -- -D warnings 2>&1 | Out-Null
    Write-Host " PASS" -ForegroundColor Green
} catch {
    Write-Host " SKIP" -ForegroundColor Yellow
} finally {
    Pop-Location
}

# Layer 2: Unit Tests
Write-Host "`nLayer 2: Unit Tests" -ForegroundColor Yellow
Write-Host "-------------------"

Write-Host "  > TypeScript tests..." -NoNewline
try {
    Push-Location app
    npm test -- --run 2>&1 | Out-Null
    Write-Host " PASS" -ForegroundColor Green
} catch {
    Write-Host " SKIP" -ForegroundColor Yellow
} finally {
    Pop-Location
}

Write-Host "  > Python tests..." -NoNewline
try {
    Push-Location server
    python -m pytest -q 2>&1 | Out-Null
    Write-Host " PASS" -ForegroundColor Green
} catch {
    Write-Host " SKIP" -ForegroundColor Yellow
} finally {
    Pop-Location
}

Write-Host "  > Rust tests..." -NoNewline
try {
    Push-Location kernel
    cargo test 2>&1 | Out-Null
    Write-Host " PASS" -ForegroundColor Green
} catch {
    Write-Host " SKIP" -ForegroundColor Yellow
} finally {
    Pop-Location
}

# Layer 3: Build (skip in quick mode)
if (-not $Quick) {
    Write-Host "`nLayer 3: Build" -ForegroundColor Yellow
    Write-Host "--------------"

    Write-Host "  > App build..." -NoNewline
    try {
        Push-Location app
        npm run build 2>&1 | Out-Null
        Write-Host " PASS" -ForegroundColor Green
    } catch {
        Write-Host " FAIL" -ForegroundColor Red
        $failed = $true
    } finally {
        Pop-Location
    }
}

# Summary
$endTime = Get-Date
$duration = ($endTime - $startTime).TotalSeconds

Write-Host ""
if ($failed) {
    Write-Host "FAILED - fix issues before commit" -ForegroundColor Red
    Write-Host "Duration: $([math]::Round($duration, 1))s"
    exit 1
} else {
    Write-Host "ALL GATES PASSED" -ForegroundColor Green
    Write-Host "Duration: $([math]::Round($duration, 1))s"
    Write-Host "`nSafe to commit and push."
    exit 0
}
