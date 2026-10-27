[CmdletBinding()]
param(
  [string]$RepoPath = (Get-Location).Path
)

$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path -LiteralPath $RepoPath).Path
$packagePath = Join-Path $repo 'package.json'

if (-not (Test-Path -LiteralPath $packagePath)) {
  throw "package.json was not found under $repo. Run this script from the real RTS repository."
}

function Write-CommandState([string]$Name) {
  $command = Get-Command $Name -ErrorAction SilentlyContinue
  if ($command) {
    Write-Host "[OK] $Name -> $($command.Source)"
  } else {
    Write-Warning "[MISSING] $Name"
  }
}

Write-Host '=== RTS + Codex preflight (read-only) ===' -ForegroundColor Cyan
foreach ($name in @('git', 'node', 'npm', 'gh', 'codex')) {
  Write-CommandState $name
}

Write-Host "`nGit root:"
& git -C $repo rev-parse --show-toplevel
if ($LASTEXITCODE -ne 0) { throw "$repo is not a Git repository." }

Write-Host "`nBranch and changes:"
& git -C $repo status --short --branch

Write-Host "`nRemote:"
& git -C $repo remote -v

$package = Get-Content -Raw -LiteralPath $packagePath | ConvertFrom-Json
Write-Host "`nPackage: $($package.name)@$($package.version)"
Write-Host "NPM scripts:"
if ($package.scripts) {
  $package.scripts.PSObject.Properties | ForEach-Object {
    Write-Host "  $($_.Name) = $($_.Value)"
  }
} else {
  Write-Warning 'No npm scripts defined.'
}

if (Test-Path -LiteralPath (Join-Path $repo 'package-lock.json')) {
  Write-Host '[OK] package-lock.json'
} else {
  Write-Warning '[MISSING] package-lock.json; npm ci cannot be used safely.'
}

Write-Host "`nProject markers:"
foreach ($relative in @('index.html', 'vite.config.js', 'src/game/engine.js', 'src/game/world.js', 'test')) {
  $path = Join-Path $repo $relative
  if (Test-Path -LiteralPath $path) {
    Write-Host "[OK] $relative"
  } else {
    Write-Warning "[MISSING] $relative"
  }
}

Write-Host "`nNo files or settings were changed." -ForegroundColor Green
