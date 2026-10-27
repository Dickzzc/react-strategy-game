[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$TaskName,
  [string]$RepoPath = (Get-Location).Path,
  [string]$BaseBranch = 'main',
  [string]$BranchName,
  [string]$WorktreeRoot
)

$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path -LiteralPath $RepoPath).Path
& git -C $repo rev-parse --show-toplevel *> $null
if ($LASTEXITCODE -ne 0) { throw "$repo is not a Git repository." }

$slug = ($TaskName.ToLowerInvariant() -replace '[^a-z0-9]+', '-').Trim('-')
if (-not $slug) { throw 'TaskName must contain at least one ASCII letter or digit.' }
if (-not $BranchName) { $BranchName = "codex/$slug" }
if ($BranchName -notmatch '^[A-Za-z0-9._/-]+$') { throw "Invalid branch name: $BranchName" }

& git -C $repo show-ref --verify --quiet "refs/heads/$BaseBranch"
if ($LASTEXITCODE -ne 0) { throw "Base branch does not exist locally: $BaseBranch" }
& git -C $repo show-ref --verify --quiet "refs/heads/$BranchName"
if ($LASTEXITCODE -eq 0) { throw "Branch already exists: $BranchName" }

$worktreeRecords = @(git -C $repo worktree list --porcelain)
if ($worktreeRecords -match "branch refs/heads/$([regex]::Escape($BranchName))") {
  throw "Branch is already checked out in another worktree: $BranchName"
}

if (-not $WorktreeRoot) {
  $WorktreeRoot = Join-Path (Split-Path -Parent $repo) ((Split-Path -Leaf $repo) + '-worktrees')
}
$worktreeRootFull = [IO.Path]::GetFullPath($WorktreeRoot)
New-Item -ItemType Directory -Force -Path $worktreeRootFull | Out-Null
$worktreePath = Join-Path $worktreeRootFull $slug
if (Test-Path -LiteralPath $worktreePath) { throw "Worktree path already exists: $worktreePath" }

& git -C $repo worktree add -b $BranchName $worktreePath $BaseBranch
if ($LASTEXITCODE -ne 0) { throw "Failed to create worktree $worktreePath." }

Write-Host "Created task worktree: $worktreePath" -ForegroundColor Green
Write-Host "Branch: $BranchName"
Write-Host "Base: $BaseBranch"
Write-Host 'Run scripts/codex/check-task.ps1 from the new worktree before committing.'
