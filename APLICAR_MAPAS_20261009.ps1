param(
    [Parameter(Position=0)]
    [string]$RepoRoot = "."
)

$ErrorActionPreference = "Stop"

$PackRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path $RepoRoot).Path
$ExpectedBase = "87bdbfb0dc2549ffc051dac12c3977980009c791"

if (-not (Test-Path (Join-Path $RepoRoot "package.json"))) {
    throw "No se encontro package.json en la raiz indicada."
}

if (-not (Test-Path (Join-Path $RepoRoot "backend\laravel\artisan"))) {
    throw "Ejecuta este script contra la raiz de EncoreTransport."
}

Write-Host ""
Write-Host "=== AUDITORIA PREVIA ===" -ForegroundColor Cyan

try {
    $head = (git -C $RepoRoot rev-parse HEAD).Trim()
    Write-Host "HEAD: $head"

    if ($head -ne $ExpectedBase) {
        Write-Host "ADVERTENCIA: el HEAD local difiere del commit remoto auditado $ExpectedBase." -ForegroundColor Yellow
    }

    git -C $RepoRoot status --short
} catch {
    Write-Host "No se pudo consultar Git. Se continuara con backup." -ForegroundColor Yellow
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupRoot = Join-Path $RepoRoot ".encore_maps_backup_$timestamp"
New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null

$files = @(
    "package.json",
    "backend\laravel\.env.example",
    "backend\laravel\app\Exceptions\MapProviderException.php",
    "backend\laravel\app\Services\Maps\TomTomMapService.php",
    "backend\laravel\app\Http\Controllers\Api\V1\MapController.php",
    "backend\laravel\routes\console.php",
    "backend\laravel\tests\Feature\TomTomIntegrationTest.php",
    "backend\laravel\tests\Feature\RealMapTileProxyTest.php",
    "packages\shared\real-map.mjs",
    "tests\map-runtime-contract.test.mjs",
    "docs\AUDITORIA_MAPAS_GEOLOCALIZACION_20261009.md",
    "docs\VALIDACION_MAPAS_20261009.md"
)

foreach ($relative in $files) {
    $source = Join-Path $PackRoot $relative

    if (-not (Test-Path $source)) {
        throw "Falta archivo del entregable: $relative"
    }

    $target = Join-Path $RepoRoot $relative

    if (Test-Path $target) {
        $backup = Join-Path $backupRoot $relative
        $backupDir = Split-Path -Parent $backup
        New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
        Copy-Item $target $backup -Force
    }

    $targetDir = Split-Path -Parent $target
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    Copy-Item $source $target -Force
}

Write-Host ""
Write-Host "Correcciones de mapas aplicadas." -ForegroundColor Green
Write-Host "Backup: $backupRoot" -ForegroundColor Cyan
Write-Host ""
Write-Host "IMPORTANTE: este script NO modifica backend\laravel\.env ni copia ninguna API key." -ForegroundColor Yellow
Write-Host ""
Write-Host "Siguiente validacion:" -ForegroundColor Yellow
Write-Host "  npm install"
Write-Host "  npm run validate:frontend"
Write-Host "  cd backend\laravel"
Write-Host "  php artisan optimize:clear"
Write-Host "  php artisan encore:maps:diagnose"
Write-Host "  php artisan test"
