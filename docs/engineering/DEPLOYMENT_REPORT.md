# Codex Cloud + Local + GitHub 协同部署报告

## 报告范围

本报告记录对 `D:\User\下载\react-strategy-game` 的实际检查和本地配置。`D:\User\下载\RTS_Codex_Cloud_Local_GitHub_Starter` 是模板包，未直接安装，因为其安装脚本引用了包内不存在的 GitHub Actions 模板；配置以真实项目结构为准。

## 项目事实

- 技术栈：React 18、Vite 8、HTML5 Canvas。
- 本地初始 Git 提交：`87f0267 chore: import existing RTS baseline`。
- 当前部署分支：`codex/deploy-collaboration-system`，PR #1 的 head 为本次部署提交。
- GitHub 私有仓库：`https://github.com/Dickzzc/react-strategy-game`，默认分支 `main`。
- 已推送：`main` 与 `codex/deploy-collaboration-system`；尚未创建 PR 或配置分支保护。
- 原始项目没有 Git 历史、远程地址、测试脚本、`perf:quick` 或 GitHub Actions。
- 基线构建首次失败，真实根因是 Vite 根目录缺少 `index.html`；部署分支新增正确入口，保留原 `public/index.html`。
- 干净 Worktree 安装首次失败，真实根因是 `@vitejs/plugin-react@4.7.0` 不支持 Vite 8；已升级到官方兼容的 `@vitejs/plugin-react@6.1.2`，并重新生成锁文件。

## 状态

| 项目 | 状态 | 证据/限制 |
| --- | --- | --- |
| 项目级 AGENTS.md | 已部署 | 根据实际 Canvas 架构编写 |
| 项目级 `.codex/config.toml` | 已部署 | 仅设置项目级审批/沙盒，不改全局配置 |
| Git 本地基线与部署分支 | 已部署 | 无远程推送 |
| Worktree 脚本 | 已部署并验证 | 创建、列出、目标路径安装/测试/构建、保守清理均已实跑 |
| Linux CI | 已部署 | 尚未在 GitHub 远程执行 |
| Windows 兼容性工作流 | 已部署 | 尚未在 GitHub Runner 执行 |
| 单元测试入口 | 已部署并验证 | `npm run test:ci`：4 passed, 0 failed |
| 生产构建 | 已修复并验证 | `npm ci` 与 `npm run build` 均退出 0 |
| `perf:quick` / GPU 门禁 | 未实施 | 项目没有真实基准脚本；不能伪造性能数据 |
| GitHub 远程仓库 | 已部署并验证 | 私有仓库已创建，`origin`、`main` 和部署分支均已验证 |
| GitHub Actions 实际运行 | 已部署并验证 | PR #1 的 Linux CI 与 Windows 兼容性均成功 |
| Pull Request | 已创建并验证 | PR #1，未合并 |
| 分支保护 | 因套餐阻塞 | GitHub 返回 HTTP 403：私有仓库需升级到 Pro；`main.protected=false` |
| Codex Cloud 环境 | 未实施 | `codex cloud list` 退出 0，当前没有任务；没有提交 Cloud 任务 |

## 环境检查

初始检查确认：Windows 11 Professional build 26300；Node.js `v24.16.0`；npm `11.13.0`；Git `2.53.0.windows.1`；GitHub CLI `2.93.0`；Codex CLI `0.149.1`；本机存在 NVIDIA GeForce RTX 4060 Laptop GPU。`gh` 已登录 `Dickzzc`，GitHub HTTP 连通；没有用户级 `CODEX_CLI_PATH`。

Codex Doctor 的现有环境告警包括：node_repl 缺少内部运行时变量、Microsoft Defender 排除项未验证、历史 rollout 状态不一致，以及当前非交互终端为 `TERM=dumb`。这些不是本项目部署脚本造成的，我没有修改用户级配置、MCP、Defender 或 Codex 历史数据。

## 已执行命令

初始基线：

```text
npm run build                         exit 1
npm run test:ci                       exit 1 (script missing)
npm run perf:quick                    exit 1 (script missing)
codex doctor                         exit 1 (existing environment warnings)
codex mcp list                       exit 0
gh auth status                       authenticated as Dickzzc
```

部署后验证：

```text
npm install --save-dev @vitejs/plugin-react@^6.1.2  exit 0
npm ci --no-audit --no-fund                         exit 0
npm run test:ci                                     exit 0 (4 passed, 0 failed)
npm run build                                       exit 0
scripts/preflight.ps1                               exit 0
scripts/codex/new-task.ps1                          exit 0
scripts/codex/list-tasks.ps1                        exit 0
scripts/codex/check-task.ps1 (fresh Worktree)       exit 0
scripts/codex/cleanup-task.ps1                     exit 0
codex cloud list                                    exit 0 (No tasks found)
scripts/verify-local.ps1 -Runs 3                    exit 1 (perf:quick missing; report says NOT CONFIGURED)
gh repo create Dickzzc/react-strategy-game          exit 0 (private repository)
git push -u origin main                             exit 0
git push -u origin codex/deploy-collaboration-system exit 0
gh run list                                         exit 0 (no runs found)
gh pr create                                         exit 0 (PR #1)
gh run watch 40451190555                             exit 0 (CI success)
gh run watch 40451190587                             exit 0 (Windows compatibility success)
PUT branches/main/protection                      exit 1 (HTTP 403, private-repository plan limit)
GET branches/main                                  exit 0 (`protected: false`)
```

构建和测试日志来自本机终端；性能阻塞报告位于 `.codex-perf-logs\20261027-123507\report.md`。未执行的 GitHub Actions、PR、Cloud agent、浏览器玩法 smoke test 和本机 GPU/1% Low 测试保持明确的未验证状态。

GitHub Actions 页面：<https://github.com/Dickzzc/react-strategy-game/actions>。

- Linux CI：<https://github.com/Dickzzc/react-strategy-game/actions/runs/40451190555>，success。
- Windows compatibility：<https://github.com/Dickzzc/react-strategy-game/actions/runs/40451190587>，success。
- Pull Request：<https://github.com/Dickzzc/react-strategy-game/pull/1>，open，未合并。

GitHub 免费套餐当前不允许为该私有仓库启用分支保护。可选替代方案是升级 GitHub Pro；不建议为了获得规则而把仓库公开。升级前继续使用 PR、CI 必须通过的审查约定，但 GitHub 不会在服务器端强制阻止绕过。

## 变更文件

- `index.html`：补齐 Vite 根入口，修复原始构建失败。
- `package.json` / `package-lock.json`：添加 `test`/`test:ci`，并把 React Vite 插件对齐到 Vite 8。
- `AGENTS.md`、`.codex/config.toml`：项目规则和项目级 Codex 边界。
- `.github/`：Linux CI、Windows 兼容性工作流和 PR 模板。
- `scripts/`：只读预检、本机性能证据、Worktree 创建/列出/检查/清理。
- `test/world.test.js`：地图放置、选择查询、单位边界移动和生产队列测试。
- `docs/engineering/`：工作流、Cloud 任务模板、本地性能门禁和本报告。

## 用户确认后才能继续的动作

1. 如需服务器端强制保护，升级 GitHub Pro 后重新配置；当前 PR 尚未合并。
2. 确认 Codex Cloud 连接到该仓库后，再提交 Cloud A/B/C 任务。
