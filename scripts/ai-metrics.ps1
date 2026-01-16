# ai-metrics.ps1 - Calculate AI code percentage
# Usage: .\scripts\ai-metrics.ps1 [-Days 7]

param(
    [int]$Days = 7
)

Write-Host "`n=== AI Code Metrics (Last $Days Days) ===" -ForegroundColor Cyan

$since = (Get-Date).AddDays(-$Days).ToString("yyyy-MM-dd")

# Count commits
$total = (git log --oneline --since="$since" 2>$null | Measure-Object -Line).Lines
$aiFull = (git log --oneline --since="$since" --grep="\[AI\]" 2>$null | Measure-Object -Line).Lines
$aiPartial = (git log --oneline --since="$since" --grep="\[AI:partial\]" 2>$null | Measure-Object -Line).Lines

$aiTotal = $aiFull + $aiPartial

if ($total -gt 0) {
    $percent = [math]::Round(($aiTotal / $total) * 100, 1)
} else {
    $percent = 0
}

# Output results
Write-Host "Total commits:      $total"
Write-Host "AI-full commits:    $aiFull" -ForegroundColor Green
Write-Host "AI-partial commits: $aiPartial" -ForegroundColor Yellow
Write-Host "Human commits:      $($total - $aiTotal)" -ForegroundColor Blue
Write-Host ""
Write-Host "AI Code Percentage: $percent%" -ForegroundColor $(if ($percent -ge 80) { "Green" } elseif ($percent -ge 50) { "Yellow" } else { "Red" })

# Target check
if ($percent -ge 80) {
    Write-Host "✅ Meeting >80% target" -ForegroundColor Green
} else {
    Write-Host "⚠️  Below 80% target" -ForegroundColor Yellow
}
