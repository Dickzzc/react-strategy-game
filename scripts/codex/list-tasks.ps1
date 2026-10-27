[CmdletBinding()]
param(
  [string]$RepoPath = (Get-Location).Path
)

$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path -LiteralPath $RepoPath).Path
& git -C $repo rev-parse --show-toplevel *> $null
if ($LASTEXITCODE -ne 0) { throw "$repo is not a Git repository." }

$records = [System.Collections.Generic.List[object]]::new()
$current = @{}
foreach ($line in @(git -C $repo worktree list --porcelain)) {
  if ($line -like 'worktree *') {
    if ($current.Count -gt 0) { $records.Add($current) }
    $current = @{ Path = $line.Substring(9); Branch = '' }
  } elseif ($line -like 'branch *') {
    $current.Branch = $line.Substring(7) -replace '^refs/heads/', ''
  }
}
if ($current.Count -gt 0) { $records.Add($current) }

if ($records.Count -eq 0) { Write-Host 'No Git worktrees found.'; exit 0 }

$output = foreach ($record in $records) {
  $path = $record.Path
  $status = @(git -C $path status --short 2>$null)
  $branch = if ($record.Branch) { $record.Branch } else { '(detached)' }
  [pscustomobject]@{
    Branch = $branch
    State = if ($status.Count -eq 0) { 'clean' } else { "dirty ($($status.Count) lines)" }
    Path = $path
    HEAD = ((git -C $path rev-parse --short HEAD 2>$null) -join '')
  }
}
$output | Format-Table -AutoSize
