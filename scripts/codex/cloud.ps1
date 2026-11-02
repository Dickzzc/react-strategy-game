[CmdletBinding()]
param(
  [ValidateSet('Check', 'Submit', 'Status')][string]$Action = 'Check',
  [string]$EnvironmentId,
  [string]$Branch,
  [string]$TaskId,
  [string]$CodexCommand = 'codex',
  [string]$Prompt = 'Validate Dickzzc/react-strategy-game read-only: report git HEAD; run npm ci --no-audit --no-fund, npm run test:ci, npm run build, and npm run perf:quick. Report exact exit codes. Do not modify tracked files, commit, push, merge, or publish.'
)

$ErrorActionPreference = 'Stop'
$repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$config = Get-Content -Raw -LiteralPath (Join-Path $repo '.codex/cloud.json') | ConvertFrom-Json
if (-not $EnvironmentId) { $EnvironmentId = $config.environmentId }
if (-not $Branch) { $Branch = $config.branch }
if ([string]::IsNullOrWhiteSpace($EnvironmentId)) { throw 'Missing environmentId in .codex/cloud.json.' }
$command = Get-Command $CodexCommand -ErrorAction Stop
Push-Location -LiteralPath $repo
try {
  $origin = & git remote get-url origin
  if ($LASTEXITCODE -ne 0) { throw 'Cannot read Git origin.' }
  if ($origin.TrimEnd('/') -notin @("https://github.com/$($config.repository)", "https://github.com/$($config.repository).git", "git@github.com:$($config.repository).git")) {
    throw "Git origin does not match configured repository $($config.repository)."
  }
  & $command.Source --version
  if ($LASTEXITCODE -ne 0) { throw 'Cannot run Codex CLI.' }
  & $command.Source login status
  if ($LASTEXITCODE -ne 0) { throw 'Codex login failed. Sign in to the account/workspace that published the environment.' }
  if ($Action -eq 'Status') {
    if ([string]::IsNullOrWhiteSpace($TaskId)) { throw 'Status requires -TaskId.' }
    & $command.Source cloud status $TaskId
    if ($LASTEXITCODE -ne 0) { throw "Cloud task status failed (exit $LASTEXITCODE)." }
  } else {
    # Unlike an unfiltered task list, this also validates environment visibility.
    & $command.Source cloud list --env $EnvironmentId --limit 1 --json
    if ($LASTEXITCODE -ne 0) {
      throw "Cloud environment check failed (exit $LASTEXITCODE). No task was submitted. Compare the publishing account/workspace and CLI account. CLI diagnostic log: $(Join-Path $repo 'error.log')"
    }
    if ($Action -eq 'Submit') {
      & $command.Source cloud exec --env $EnvironmentId --branch $Branch --attempts 1 $Prompt
      if ($LASTEXITCODE -ne 0) { throw "Cloud task submission failed (exit $LASTEXITCODE)." }
    } else {
      Write-Host "Cloud environment is visible: $EnvironmentId. No task submitted."
    }
  }
} finally {
  Pop-Location
}
