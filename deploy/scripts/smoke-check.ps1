param(
  [string]$BaseUrl = "http://localhost"
)

$ErrorActionPreference = "Stop"

$checks = @(
  @{ Name = "Frontend"; Url = "$BaseUrl/" },
  @{ Name = "Health"; Url = "$BaseUrl/health/" },
  @{ Name = "API root"; Url = "$BaseUrl/api/" }
)

foreach ($check in $checks) {
  Write-Host "Checking $($check.Name): $($check.Url)"
  $response = Invoke-WebRequest -Uri $check.Url -UseBasicParsing -TimeoutSec 15
  if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 400) {
    throw "$($check.Name) check failed with status $($response.StatusCode)"
  }
}

Write-Host "Smoke checks passed."
