$ErrorActionPreference = "Stop"

Write-Host "=== Encore Transport dependency repair ===" -ForegroundColor Cyan

Set-Location $PSScriptRoot

Write-Host "Stopping stale Node/Expo/Vite processes is recommended before continuing." -ForegroundColor Yellow

$paths = @(
  ".\node_modules",
  ".\apps\passenger\node_modules",
  ".\apps\passenger-mobile\node_modules",
  ".\apps\driver-mobile\node_modules"
)

foreach ($path in $paths) {
  if (Test-Path $path) {
    Write-Host "Removing $path"
    Remove-Item -Recurse -Force $path
  }
}

if (Test-Path ".\package-lock.json") {
  Write-Host "Removing package-lock.json so npm can rebuild optional native dependencies."
  Remove-Item -Force ".\package-lock.json"
}

npm cache verify

Write-Host "Installing workspace dependencies..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) { throw "npm install failed." }

Write-Host "Building Passenger React..." -ForegroundColor Cyan
npm run build:passenger
if ($LASTEXITCODE -ne 0) { throw "Passenger build failed." }

Write-Host "Checking Passenger Mobile..." -ForegroundColor Cyan
Push-Location ".\apps\passenger-mobile"
npx expo install --fix
npx expo-doctor@latest
Pop-Location

Write-Host "Checking Driver Mobile..." -ForegroundColor Cyan
Push-Location ".\apps\driver-mobile"
npx expo install --fix
npx expo-doctor@latest
Pop-Location

Write-Host ""
Write-Host "Repair completed." -ForegroundColor Green
Write-Host "Run:"
Write-Host "  npm run dev               # website/admin/new Passenger build on :4173"
Write-Host "  npm run dev:passenger     # Passenger Vite dev server on :5173"
Write-Host "  npm run mobile:passenger  # Expo Passenger"
Write-Host "  npm run mobile:driver     # Expo Driver"
