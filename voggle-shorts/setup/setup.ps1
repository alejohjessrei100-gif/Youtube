# One-time setup on Windows (PowerShell). Run from the skill folder:  powershell -ExecutionPolicy Bypass -File setup\setup.ps1
# Needs: Python 3.10+ and Node.js 18+ installed.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
python -m venv .venv
& .\.venv\Scripts\python -m pip install --upgrade pip
& .\.venv\Scripts\python -m pip install -r setup\requirements.txt
New-Item -ItemType Directory -Force models | Out-Null
$task = "models\face_landmarker.task"
if (-not (Test-Path $task)) {
  Invoke-WebRequest "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task" -OutFile $task
}
Set-Location engine
npm install
Write-Host "Setup done. The speech and cut-out models download automatically on first use."
