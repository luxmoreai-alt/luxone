param(
  [Parameter(Mandatory = $true)]
  [string]$BackupFile
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $BackupFile)) {
  throw "Backup file not found: $BackupFile"
}

$resolvedBackupFile = Resolve-Path $BackupFile

Write-Host "Restoring PostgreSQL backup from $resolvedBackupFile"
Get-Content $resolvedBackupFile | docker compose exec -T db psql -U postgres -d tenant_zora
Write-Host "Restore completed."
