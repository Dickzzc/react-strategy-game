[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$TaskPath,
  [switch]$SkipInstall,
  [switch]$RunPerf
)

$ErrorActionPreference = 'Stop'
$task = (Resolve-Path -LiteralPath $TaskPath).Path
$packagePath = Join-Path $task 'package.json'
if (-not (Test-Path -LiteralPath $packagePath)) { throw "package.json was not found under $task." }

$package = Get-Content -Raw -LiteralPath $packagePath | ConvertFrom-Json
$scriptNames = @()
if ($package.scripts) { $scriptNames = @($package.scripts.PSObject.Properties.Name) }

function Invoke-NpmScript([string]$Name) {
  Write-Host "`n=== npm run $Name ===" -ForegroundColor Cyan
  & npm.cmd run $Name
  if ($LASTEXITCODE -ne 0) { throw "npm run $Name failed with exit code $LASTEXITCODE." }
}

Write-Host "Task: $task"
Push-Location -LiteralPath $task
try {
  git status --short --branch

  if (-not $SkipInstall -and -not (Test-Path -LiteralPath 'node_modules')) {
    if (-not (Test-Path -LiteralPath 'package-lock.json')) { throw 'node_modules is missing and package-lock.json is absent.' }
    & npm.cmd ci --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw "npm ci failed with exit code $LASTEXITCODE." }
  }

  if ($scriptNames -contains 'test:ci') {
    Invoke-NpmScript 'test:ci'
  } elseif ($scriptNames -contains 'test') {
    Invoke-NpmScript 'test'
  } else {
    throw 'No test or test:ci script is configured.'
  }

  if ($scriptNames -notcontains 'build') { throw 'No build script is configured.' }
  Invoke-NpmScript 'build'

  if ($RunPerf) {
    if ($scriptNames -notcontains 'perf:quick') { throw 'perf:quick is not configured; no substitute benchmark is allowed.' }
    & npm.cmd run perf:quick
    if ($LASTEXITCODE -ne 0) { throw "npm run perf:quick failed with exit code $LASTEXITCODE." }
  } else {
    Write-Host '`nPerformance gate: NOT RUN (pass -RunPerf only when perf:quick exists).' -ForegroundColor Yellow
  }

  Write-Host "`nTask checks passed." -ForegroundColor Green
} finally {
  Pop-Location
}
