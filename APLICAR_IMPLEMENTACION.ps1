param([string]$RepoRoot = ".")
$ErrorActionPreference = "Stop"
$source = Split-Path -Parent $MyInvocation.MyCommand.Path
$target = (Resolve-Path $RepoRoot).Path
if (-not (Test-Path (Join-Path $target "backend\laravel"))) { throw "Ejecuta este script indicando la raiz de EncoreTransport." }
$backup = Join-Path $target (".encore_backup_" + (Get-Date -Format "yyyyMMdd_HHmmss"))
New-Item -ItemType Directory -Path $backup | Out-Null
$files = Get-ChildItem $source -Recurse -File | Where-Object { $_.Name -ne "APLICAR_IMPLEMENTACION.ps1" -and $_.FullName -notlike "*docs\IMPLEMENTATION_STATUS.md" }
foreach ($file in $files) {
    $rel = $file.FullName.Substring($source.Length).TrimStart('\','/')
    if ($rel -eq "backend\laravel\config_encore.php") { $rel = "backend\laravel\config\encore.php" }
    if ($rel -eq "backend\laravel\.env.example.additions") { continue }
    $dest = Join-Path $target $rel
    if (Test-Path $dest) {
        $bk = Join-Path $backup $rel
        New-Item -ItemType Directory -Force -Path (Split-Path $bk) | Out-Null
        Copy-Item $dest $bk -Force
    }
    New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
    Copy-Item $file.FullName $dest -Force
    Write-Host "Aplicado: $rel"
}
$envExample = Join-Path $target "backend\laravel\.env.example"
$additions = Get-Content (Join-Path $source "backend\laravel\.env.example.additions") -Raw
if ((Get-Content $envExample -Raw) -notmatch "BOOKING_HOLD_MINUTES") { Add-Content $envExample "`r`n$additions" }
Write-Host "Backup: $backup"
Write-Host "Implementacion aplicada. Ejecuta composer install, php artisan migrate y php artisan test."
