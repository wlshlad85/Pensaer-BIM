$env:Path = "C:\Users\RICHARD\.cargo\bin;" + $env:Path
Set-Location "C:\Users\RICHARD\Pensaer-BIM\kernel\pensaer-geometry"

# Create venv if it doesn't exist
if (-not (Test-Path ".venv")) {
    Write-Host "Creating virtual environment..."
    python -m venv .venv
}

# Activate venv
Write-Host "Activating virtual environment..."
.\.venv\Scripts\Activate.ps1

# Install maturin in venv if needed
pip install maturin

# Build and install
Write-Host "Building Python bindings..."
python -m maturin develop --features python
