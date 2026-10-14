param(
    [Parameter(Position=0)]
    [string]$RepoRoot = "."
)

$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path $RepoRoot).Path

if (-not (Test-Path (Join-Path $RepoRoot "package.json"))) {
    throw "Ejecuta este script desde la raiz de EncoreTransport."
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupRoot = Join-Path $RepoRoot ".encore_premium_fix_backup_$timestamp"
New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null

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
Write-Host "Fix premium aplicado." -ForegroundColor Green
Write-Host "Backup: $backupRoot" -ForegroundColor Cyan
Write-Host ""
Write-Host "Valida ahora:" -ForegroundColor Yellow
Write-Host "  npm run test:premium-design"
Write-Host "  npm run test:premium-responsive"
Write-Host "  npm run validate:frontend"
