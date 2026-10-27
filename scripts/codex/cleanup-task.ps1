[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$TaskPath,
  [string]$MainBranch = 'main',
  [switch]$ConfirmCleanup,
  [switch]$AllowUnmerged,
  [switch]$AllowNoUpstream
)

$ErrorActionPreference = 'Stop'
$task = (Resolve-Path -LiteralPath $TaskPath).Path
& git -C $task rev-parse --show-toplevel *> $null
if ($LASTEXITCODE -ne 0) { throw "$task is not a Git worktree." }
$branch = ((git -C $task symbolic-ref --quiet --short HEAD 2>$null) -join '')
if (-not $branch) { throw 'Detached worktrees are not cleaned automatically.' }
if ($branch -eq $MainBranch) { throw "Refusing to clean the main branch." }

$status = @(git -C $task status --porcelain)
if ($status.Count -gt 0) {
  throw "Refusing to remove dirty worktree $task. Commit or explicitly preserve these changes first."
}

$upstream = ((git -C $task rev-parse --abbrev-ref "$branch@{upstream}" 2>$null) -join '')
$gitCommonDir = ((git -C $task rev-parse --path-format=absolute --git-common-dir 2>$null) -join '')
if (-not $gitCommonDir) { throw 'Could not resolve the common Git directory before cleanup.' }
$mainRepo = Split-Path -Parent $gitCommonDir
$isMerged = $false
& git -C $task merge-base --is-ancestor $branch $MainBranch *> $null
if ($LASTEXITCODE -eq 0) { $isMerged = $true }

if (-not $upstream -and -not $AllowNoUpstream) {
  throw "Branch $branch has no upstream. Pass -AllowNoUpstream only after verifying no remote work must be preserved."
}
if ($upstream) {
  $counts = ((git -C $task rev-list --left-right --count "$upstream...$branch") -join '') -split '\s+'
  $behind = [int]$counts[0]
  $ahead = [int]$counts[1]
  if ($ahead -gt 0) { throw "Branch $branch has $ahead unpushed commit(s)." }
  if ($behind -gt 0) { Write-Warning "Branch $branch is $behind commit(s) behind its upstream." }
}
if (-not $isMerged -and -not $AllowUnmerged) {
  throw "Branch $branch is not merged into $MainBranch. Pass -AllowUnmerged to remove only the clean worktree and retain the branch."
}

Write-Host "Verified clean worktree: $task"
Write-Host "Branch: $branch"
Write-Host "Merged into ${MainBranch}: $isMerged"
if (-not $ConfirmCleanup) {
  Write-Host 'Dry run only. Pass -ConfirmCleanup to remove this worktree.' -ForegroundColor Yellow
  exit 0
}

& git -C $task worktree remove $task
if ($LASTEXITCODE -ne 0) { throw "Git refused to remove worktree $task." }
if ($isMerged) {
  & git -C $mainRepo branch -d $branch
  if ($LASTEXITCODE -ne 0) { Write-Warning "Worktree removed, but branch $branch was retained because Git refused branch deletion." }
} else {
  Write-Host "Worktree removed; unmerged branch $branch was retained." -ForegroundColor Yellow
}
