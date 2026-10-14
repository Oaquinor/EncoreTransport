param(
    [Parameter(Position=0)]
    [string]$RepoRoot = "."
)

$ErrorActionPreference = "Stop"

$PackRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path $RepoRoot).Path

if (-not (Test-Path (Join-Path $RepoRoot "package.json"))) {
    throw "La ruta indicada no parece ser la raiz de EncoreTransport."
}

if (-not (Test-Path (Join-Path $RepoRoot "backend\laravel\artisan"))) {
    throw "No se encontro backend\laravel\artisan."
}

Write-Host ""
Write-Host "=== ESTADO ANTES DE MODIFICAR ===" -ForegroundColor Cyan

try {
    git -C $RepoRoot rev-parse --abbrev-ref HEAD
    git -C $RepoRoot rev-parse HEAD
    git -C $RepoRoot status --short
} catch {
    Write-Host "No se pudo consultar Git. Se continuara solo con backup local." -ForegroundColor Yellow
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupRoot = Join-Path $RepoRoot ".encore_audit_backup_$timestamp"
New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null

$replacementFiles = @(
    "server.mjs",
    "tests\server-routing.test.mjs",
    "package.json",
    "apps\passenger-mobile\package.json",
    "README.md",
    "robots.txt",
    "docs\AUDITORIA_INTEGRAL_20261014.md"
)

foreach ($relative in $replacementFiles) {
    $source = Join-Path $PackRoot $relative
    $target = Join-Path $RepoRoot $relative

    if (-not (Test-Path $source)) {
        throw "Falta archivo en el pack: $relative"
    }

    if (Test-Path $target) {
        $backup = Join-Path $backupRoot $relative
        New-Item -ItemType Directory -Path (Split-Path -Parent $backup) -Force | Out-Null
        Copy-Item $target $backup -Force
    }

    New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null
    Copy-Item $source $target -Force
}

function Backup-And-Patch {
    param(
        [string]$Relative,
        [scriptblock]$Patch
    )

    $target = Join-Path $RepoRoot $Relative

    if (-not (Test-Path $target)) {
        throw "No existe el archivo requerido: $Relative"
    }

    $backup = Join-Path $backupRoot $Relative
    New-Item -ItemType Directory -Path (Split-Path -Parent $backup) -Force | Out-Null
    Copy-Item $target $backup -Force

    $content = Get-Content $target -Raw
    $newContent = & $Patch $content

    Set-Content -Path $target -Value $newContent -Encoding UTF8
}

Backup-And-Patch "apps\website\index.html" {
    param($content)

    if ($content -notmatch 'packages/shared/premium\.css') {
        $content = $content.Replace(
            '<link rel="stylesheet" href="../../packages/shared/styles.css" />',
            '<link rel="stylesheet" href="../../packages/shared/styles.css" />' + [Environment]::NewLine +
            '  <link rel="stylesheet" href="../../packages/shared/premium.css" />'
        )
    }

    if ($content -notmatch 'href="\./premium\.css"') {
        $content = $content.Replace(
            '<link rel="stylesheet" href="./styles.css" />',
            '<link rel="stylesheet" href="./styles.css" />' + [Environment]::NewLine +
            '  <link rel="stylesheet" href="./premium.css" />'
        )
    }

    return $content
}

Backup-And-Patch "apps\driver-pwa\index.html" {
    param($content)

    if ($content -notmatch 'packages/shared/premium\.css') {
        $content = $content.Replace(
            '<link rel="stylesheet" href="../../packages/shared/styles.css" />',
            '<link rel="stylesheet" href="../../packages/shared/styles.css" />' + [Environment]::NewLine +
            '    <link rel="stylesheet" href="../../packages/shared/premium.css" />'
        )
    }

    if ($content -notmatch 'href="\./premium\.css"') {
        $content = $content.Replace(
            '<link rel="stylesheet" href="./styles.css" />',
            '<link rel="stylesheet" href="./styles.css" />' + [Environment]::NewLine +
            '    <link rel="stylesheet" href="./premium.css" />'
        )
    }

    return $content
}

Backup-And-Patch "apps\admin-dashboard\index.html" {
    param($content)

    if ($content -notmatch 'packages/shared/premium\.css') {
        $content = $content.Replace(
            '<link rel="stylesheet" href="../../packages/shared/styles.css">',
            '<link rel="stylesheet" href="../../packages/shared/styles.css">' + [Environment]::NewLine +
            '  <link rel="stylesheet" href="../../packages/shared/premium.css">'
        )
    }

    if ($content -notmatch 'href="\./premium\.css"') {
        $content = $content.Replace(
            '<link rel="stylesheet" href="./styles.css">',
            '<link rel="stylesheet" href="./styles.css">' + [Environment]::NewLine +
            '  <link rel="stylesheet" href="./premium.css">'
        )
    }

    return $content
}

Backup-And-Patch "apps\passenger\src\main.tsx" {
    param($content)

    if ($content -notmatch "packages/shared/premium\.css") {
        $content = $content.Replace(
            "import './styles.css';",
            "import '../../../packages/shared/premium.css';" + [Environment]::NewLine +
            "import './styles.css';"
        )
    }

    if ($content -notmatch "import '\./premium\.css';") {
        $content = $content.Replace(
            "import './styles.css';",
            "import './styles.css';" + [Environment]::NewLine +
            "import './premium.css';"
        )
    }

    return $content
}

Write-Host ""
Write-Host "Pack aplicado." -ForegroundColor Green
Write-Host "Backup: $backupRoot" -ForegroundColor Cyan
Write-Host ""
Write-Host "Ejecuta desde la RAIZ:" -ForegroundColor Yellow
Write-Host "  npm install"
Write-Host "  npm run validate:frontend"
Write-Host "  npm run validate:mobile"
Write-Host ""
Write-Host "Luego:" -ForegroundColor Yellow
Write-Host "  npm run validate:backend"
Write-Host ""
Write-Host "Revisa antes de commit:" -ForegroundColor Yellow
Write-Host "  git diff"
Write-Host "  git status --short"
