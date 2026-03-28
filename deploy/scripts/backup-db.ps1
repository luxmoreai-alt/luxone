$ErrorActionPreference = "Stop"

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = Join-Path $PSScriptRoot "..\backups"
$backupDir = [System.IO.Path]::GetFullPath($backupDir)
$backupFile = Join-Path $backupDir "crm-backup-$timestamp.sql"

New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

Write-Host "Creating PostgreSQL backup at $backupFile"
docker compose exec -T db pg_dump -U postgres -d tenant_zora > $backupFile

if (-not (Test-Path $backupFile)) {
  throw "Backup failed. Output file was not created."
}

Write-Host "Backup completed: $backupFile"
