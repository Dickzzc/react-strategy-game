[CmdletBinding()]
param(
  [ValidateRange(1, 20)][int]$Runs = 3,
  [string]$RepoPath = (Get-Location).Path,
  [switch]$SkipInstall,
  [string]$ReportPath
)

$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path -LiteralPath $RepoPath).Path
$packagePath = Join-Path $repo 'package.json'
if (-not (Test-Path -LiteralPath $packagePath)) {
  throw "package.json was not found under $repo."
}

$package = Get-Content -Raw -LiteralPath $packagePath | ConvertFrom-Json
$scriptNames = @()
if ($package.scripts) { $scriptNames = @($package.scripts.PSObject.Properties.Name) }
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$logDir = Join-Path $repo (Join-Path '.codex-perf-logs' $stamp)
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
if (-not $ReportPath) { $ReportPath = Join-Path $logDir 'report.md' }
$reportPath = [IO.Path]::GetFullPath($ReportPath)
$runResults = [System.Collections.Generic.List[object]]::new()
$metricLines = [System.Collections.Generic.List[string]]::new()

function Write-Report([string]$Status, [string]$Reason) {
  $lines = [System.Collections.Generic.List[string]]::new()
  $lines.Add('# Local performance verification')
  $lines.Add('')
  $lines.Add("- Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz')")
  $lines.Add("- Repository: $repo")
  $lines.Add("- Requested runs: $Runs")
  $lines.Add("- Status: **$Status**")
  $lines.Add("- Raw logs: ``$logDir``")
  $lines.Add('')
  $lines.Add('## Gate result')
  $lines.Add('')
  $lines.Add($Reason)
  $lines.Add('')
  $lines.Add('## Run exit codes')
  $lines.Add('')
  $lines.Add('| Run | Exit code | Log |')
  $lines.Add('| --- | ---: | --- |')
  if ($runResults.Count -eq 0) {
    $lines.Add('| none | not run | not run |')
  } else {
    foreach ($result in $runResults) {
      $lines.Add("| $($result.Run) | $($result.ExitCode) | ``$($result.Log)`` |")
    }
  }
  $lines.Add('')
  $lines.Add('## Metrics')
  $lines.Add('')
  $lines.Add('This script records output; it does not invent or derive metrics that `perf:quick` did not print.')
  $lines.Add('')
  foreach ($label in @('Average FPS', '1% Low FPS', 'p95 frame time', 'p99 frame time', 'Long-frame count')) {
    $lines.Add("- ${label}: NOT MEASURED unless an exact supporting line appears in the raw logs.")
  }
  if ($metricLines.Count -gt 0) {
    $lines.Add('')
    $lines.Add('Observed metric-related lines:')
    foreach ($line in $metricLines) { $lines.Add("- ``$line``") }
  }
  $parent = Split-Path -Parent $reportPath
  New-Item -ItemType Directory -Force -Path $parent | Out-Null
  $lines | Set-Content -LiteralPath $reportPath -Encoding utf8
}

if (-not ($scriptNames -contains 'perf:quick')) {
  Write-Report 'BLOCKED' 'The package does not define `perf:quick`; the performance gate is **NOT CONFIGURED** and no substitute benchmark is run.'
  throw "package.json does not define perf:quick. Report written to $reportPath"
}

if (-not $SkipInstall -and -not (Test-Path -LiteralPath (Join-Path $repo 'node_modules'))) {
  if (-not (Test-Path -LiteralPath (Join-Path $repo 'package-lock.json'))) {
    Write-Report 'BLOCKED' 'node_modules is missing and package-lock.json is absent; dependency installation was not attempted.'
    throw 'node_modules missing and no package-lock.json.'
  }
  $installLog = Join-Path $logDir 'npm-ci.log'
  & npm.cmd ci --no-audit --no-fund *> $installLog
  $installCode = $LASTEXITCODE
  if (Test-Path -LiteralPath $installLog) { Get-Content -LiteralPath $installLog | Write-Host }
  if ($installCode -ne 0) {
    Write-Report 'FAILED' "`npm ci` exited with $installCode. See ``$installLog``."
    throw "npm ci failed with exit code $installCode."
  }
}

$failed = $false
for ($run = 1; $run -le $Runs; $run++) {
  $stdoutLog = Join-Path $logDir ("perf-run-{0}-stdout.txt" -f $run)
  $stderrLog = Join-Path $logDir ("perf-run-{0}-stderr.txt" -f $run)
  Write-Host "`n=== perf:quick $run / $Runs ===" -ForegroundColor Cyan
  $process = Start-Process -FilePath $env:ComSpec -ArgumentList @('/d', '/c', 'npm.cmd run perf:quick') -WorkingDirectory $repo -Wait -PassThru -NoNewWindow -RedirectStandardOutput $stdoutLog -RedirectStandardError $stderrLog
  $code = $process.ExitCode
  if (Test-Path -LiteralPath $stdoutLog) { Get-Content -LiteralPath $stdoutLog | Write-Host }
  if (Test-Path -LiteralPath $stderrLog) { Get-Content -LiteralPath $stderrLog | Write-Host }
  $runResults.Add([pscustomobject]@{ Run = $run; ExitCode = $code; Log = $stdoutLog })
  $combined = ((Get-Content -Raw -LiteralPath $stdoutLog -ErrorAction SilentlyContinue) + "`n" + (Get-Content -Raw -LiteralPath $stderrLog -ErrorAction SilentlyContinue))
  [regex]::Matches($combined, '(?im)^.*(fps|1%\s*low|p95|p99|long[- ]frame|frame\s*time).*$', [Text.RegularExpressions.RegexOptions]::Multiline) | ForEach-Object {
    $metricLines.Add($_.Value.Trim())
  }
  if ($code -ne 0) { $failed = $true }
}

if ($failed) {
  Write-Report 'FAILED' 'At least one `perf:quick` run failed. Do not merge a performance change.'
  throw "At least one perf:quick run failed. Report written to $reportPath"
}

Write-Report 'PASSED' "All $Runs `perf:quick` commands exited 0. Review the raw output for real 1% Low, p95/p99, and long-frame evidence before merging."
Write-Host "Performance verification passed at the process level. Report: $reportPath" -ForegroundColor Green
