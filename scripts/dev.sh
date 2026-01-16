#!/bin/bash
# dev.sh - Start all services with hot reload
# Usage: ./scripts/dev.sh

set -e

echo "🚀 Starting Pensaer development environment..."

# Check if concurrently is available
if ! command -v npx &> /dev/null; then
    echo "❌ npx not found. Install Node.js first."
    exit 1
fi

# Start all services in parallel
npx concurrently \
  --names "app,server,kernel" \
  --prefix-colors "cyan,yellow,magenta" \
  --kill-others-on-fail \
  "cd app && npm run dev" \
  "cd server && uvicorn main:app --reload --port 8000" \
  "cd kernel && cargo watch -w src -x 'build --release'"
