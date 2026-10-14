param(
    [Parameter(Position=0)]
    [string]$RepoRoot = ".",
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$PackRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path $RepoRoot).Path

if (-not (Test-Path (Join-Path $RepoRoot "package.json"))) {
    throw "No se encontro package.json en la raiz indicada: $RepoRoot"
}

if (-not (Test-Path (Join-Path $RepoRoot "backend\laravel\artisan"))) {
    throw "Ejecuta este script contra la raiz de EncoreTransport."
}

Write-Host ""
Write-Host "=== ESTADO REAL ANTES DE MODIFICAR ===" -ForegroundColor Cyan
$head = $null
try {
    $head = (git -C $RepoRoot rev-parse HEAD).Trim()
    Write-Host "HEAD: $head"
    git -C $RepoRoot log -5 --oneline
    Write-Host ""
    Write-Host "Cambios locales:" -ForegroundColor Cyan
    git -C $RepoRoot status --short
} catch {
    Write-Host "No se pudo consultar Git." -ForegroundColor Yellow
}

$files = @(
    "server.mjs",
    "README.md",
    "apps\website\index.html",
    "apps\website\app.mjs",
    "apps\website\enhancements.mjs",
    "apps\website\mandate-fixes.css",
    "apps\admin-dashboard\index.html",
    "apps\admin-dashboard\app.mjs",
    "apps\admin-dashboard\mandate-fixes.css",
    "apps\passenger\src\main.tsx",
    "apps\passenger\src\mandate-motion.css",
    "apps\driver-pwa\index.html",
    "apps\driver-pwa\mandate-motion.css",
    "packages\shared\real-map.mjs",
    "backend\laravel\.env.example",
    "backend\laravel\app\Exceptions\MapProviderException.php",
    "backend\laravel\app\Http\Controllers\Api\V1\MapController.php",
    "backend\laravel\app\Http\Controllers\Api\V1\SeatController.php",
    "backend\laravel\app\Services\Maps\TomTomMapService.php",
    "backend\laravel\routes\console.php",
    "backend\laravel\tests\Feature\TomTomIntegrationTest.php",
    "backend\laravel\tests\Feature\RealMapTileProxyTest.php",
    "backend\laravel\tests\Feature\TomTomCountryFallbackTest.php",
    "tests\ux-regression.test.mjs",
    "tests\map-runtime-contract.test.mjs",
    "docs\ESTADO_MAESTRO_20261013.md",
    "docs\PLAN_PRUEBA_MAESTRO_20261013.md"
)

if (-not $Force) {
    $dirty = New-Object System.Collections.Generic.HashSet[string] ([System.StringComparer]::OrdinalIgnoreCase)
    try {
        $statusLines = git -C $RepoRoot status --porcelain
        foreach ($line in $statusLines) {
            if ($line.Length -lt 4) { continue }
            $path = $line.Substring(3).Trim()
            if ($path.Contains(" -> ")) { $path = $path.Split(" -> ")[-1] }
            $path = $path.Replace('/', '\')
            [void]$dirty.Add($path)
        }
    } catch {}

    $conflicts = @()
    foreach ($relative in $files) {
        if ($dirty.Contains($relative)) { $conflicts += $relative }
    }

    if ($conflicts.Count -gt 0) {
        Write-Host ""
        Write-Host "ABORTADO: hay cambios locales en archivos que este pack modifica:" -ForegroundColor Red
        $conflicts | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
        Write-Host ""
        Write-Host "Revisa/reconcilia esos cambios primero. Usa -Force solo si decidiste conscientemente reemplazarlos." -ForegroundColor Yellow
        exit 2
    }
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupRoot = Join-Path $RepoRoot ".encore_cierre_backup_$timestamp"
New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null

foreach ($relative in $files) {
    $source = Join-Path $PackRoot $relative
    if (-not (Test-Path $source)) { throw "Falta archivo del pack: $relative" }

    $target = Join-Path $RepoRoot $relative
    if (Test-Path $target) {
        $backup = Join-Path $backupRoot $relative
        New-Item -ItemType Directory -Path (Split-Path -Parent $backup) -Force | Out-Null
        Copy-Item $target $backup -Force
    }

    New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null
    Copy-Item $source $target -Force
}

Push-Location $RepoRoot
try {
    node (Join-Path $PackRoot "tools\merge-package-json.mjs")
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "Cierre maestro aplicado." -ForegroundColor Green
Write-Host "Backup: $backupRoot" -ForegroundColor Cyan
Write-Host ""
Write-Host "NO se modifico backend\laravel\.env ni se copiaron secretos." -ForegroundColor Yellow
Write-Host ""
Write-Host "Siguiente paso:" -ForegroundColor Yellow
Write-Host "  git diff"
Write-Host "  npm install"
Write-Host "  npm run validate:frontend"
Write-Host "  cd backend\laravel"
Write-Host "  php artisan optimize:clear"
Write-Host "  php artisan encore:maps:diagnose"
Write-Host "  php artisan l5-swagger:generate"
Write-Host "  php artisan test"
