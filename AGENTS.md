# RTS repository rules for Codex

## Project truth

- This repository is a React 18 + Vite 8 browser RTS demo using HTML5 Canvas. It does not use PixiJS.
- `src/game/engine.js` owns the animation loop, update order, rendering entry point, save/load, and input setup.
- `src/game/world.js` owns the 50x50 tile map, entities, placement checks, selection queries, serialization, and Canvas rendering.
- `src/game/entities.js` defines buildings and units. `src/game/player.js` and `src/game/ai.js` own player and AI rules. `src/ui/` contains React HUD, minimap, build menu, and selection UI.
- `index.html` is the Vite entry point. `public/index.html` is retained from the imported baseline and is not the authoritative Vite entry.

Do not invent Pixi, pathfinding, vehicle-avoidance, GPU-buffer, or `perf:quick` capabilities that are not present in the source. The current demo has simple direct movement and random map/AI placement; future work must be explicit about that limitation.

## Change boundaries

- One task uses one branch and one worktree. Do not edit `main` directly.
- Do not rewrite lockfiles, change runtime or dependency versions, mass-format unrelated files, or change CI/AGENTS.md outside the task scope.
- Do not force-push, reset, delete branches, or bind/push a remote repository without explicit approval.
- Preserve existing gameplay behavior: unit movement, targeting, attack cadence, team ownership, map coordinates, selection, building placement, production, and save/load.
- Do not reduce resolution, unit counts, effects, animation detail, or other visual quality to claim a performance improvement.

## Verification and observability

- Add or update deterministic tests for pure calculations and world/entity rules where practical.
- Run `npm run test:ci` and `npm run build` for code changes. The scripts must fail loudly; never use an empty command, `|| true`, or a swallowed exception to make CI green.
- `npm run perf:quick` is a required performance gate only when it exists. If it is absent, report `NOT CONFIGURED`, not a fabricated metric.
- Cloud jobs and GitHub-hosted runners cannot validate this machine's browser GPU or 1% Low FPS. Rendering/performance changes require three comparable Windows runs and a gameplay smoke test before merge.
- Record commands, exit codes, changed files, risks, and unresolved blockers. Never claim a test, PR, Cloud task, or performance result that was not actually executed.

## Worktree and generated files

- Use `scripts/codex/new-task.ps1`, `list-tasks.ps1`, `check-task.ps1`, and `cleanup-task.ps1` for repeatable local task isolation.
- Never clean a worktree with uncommitted changes. A clean but unmerged branch is retained unless the operator explicitly allows unmerged cleanup.
- Do not commit `node_modules/`, `dist/`, `.codex-perf-logs/`, `.env`, credentials, machine-specific paths, profiler traces, or large generated assets.

## Definition of done

Provide a concise summary, exact files touched, risks, and the commands actually run with their exit status. CI build/tests must be green where configured. If a local GPU benchmark, GitHub remote, Cloud environment, PR, or branch protection was not available or authorized, say so plainly.
