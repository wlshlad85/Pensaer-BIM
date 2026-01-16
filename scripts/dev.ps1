# dev.ps1 - Start all services with hot reload (Windows)
# Usage: .\scripts\dev.ps1

Write-Host "🚀 Starting Pensaer development environment..." -ForegroundColor Green

# Check prerequisites
if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
    Write-Host "❌ npx not found. Install Node.js first." -ForegroundColor Red
    exit 1
}

# Start all services in parallel using concurrently
npx concurrently `
  --names "app,server,kernel" `
  --prefix-colors "cyan,yellow,magenta" `
  --kill-others-on-fail `
  "cd app && npm run dev" `
  "cd server && uvicorn main:app --reload --port 8000" `
  "cd kernel && cargo watch -w src -x 'build --release'"
