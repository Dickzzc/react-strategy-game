# Codex Local + Cloud + Git Worktree 工作流

## 当前边界

仓库是 React + Vite + HTML5 Canvas 的浏览器 RTS Demo。Codex Local 负责 Windows 上的开发、浏览器玩法检查和本机性能证据；Codex Cloud 只能处理可以在干净 Linux/云端环境验证的代码、测试、文档和审查任务。GitHub Actions 负责可重复的安装、测试和构建，不代替本机 GPU 验证。

当前没有绑定远程 GitHub 仓库。首次创建私有仓库、添加 `origin`、首次推送、创建 PR、配置分支保护都需要单独确认；本地配置不依赖 OpenAI API Key，也不复制用户级 Codex 登录令牌。

## 开始本地任务

在仓库根目录执行：

```powershell
.\scripts\codex\new-task.ps1 -TaskName 'ui-readability'
.\scripts\codex\list-tasks.ps1
.\scripts\codex\check-task.ps1 -TaskPath 'D:\User\下载\react-strategy-game-worktrees\ui-readability'
```

脚本会创建 `codex/<task-name>` 分支和独立 Worktree。不要在两个 Worktree 中同时检出同一分支，也不要让桌面版托管 Worktree 与这些手工 Worktree 使用同一分支。

## 提交和审查

每个任务只负责一个边界。提交前至少执行：

```powershell
npm run test:ci
npm run build
git status --short
git diff --check
```

性能或渲染任务还要在同一台 Windows 机器、相同地图/单位数量/分辨率/设置下执行三次本地流程。没有 `perf:quick` 或没有可核验指标时，报告 `NOT CONFIGURED` 或 `NOT MEASURED`，不换用另一个未经批准的基准。

远程 PR 的建议顺序是：检查分支状态 → 推送任务分支 → 创建一个 PR → 等待 Linux CI 和 Windows 兼容性检查 → 本地完成玩法/GPU 验收 → 人工合并。不要自动合并 `main`。

## 安全清理

```powershell
.\scripts\codex\cleanup-task.ps1 -TaskPath 'D:\User\下载\react-strategy-game-worktrees\ui-readability'
.\scripts\codex\cleanup-task.ps1 -TaskPath 'D:\User\下载\react-strategy-game-worktrees\ui-readability' -AllowNoUpstream -AllowUnmerged -ConfirmCleanup
# 只有确认目录内全是可重建产物时，才显式清理依赖和构建输出：
.\scripts\codex\cleanup-task.ps1 -TaskPath 'D:\User\下载\react-strategy-game-worktrees\ui-readability' -AllowNoUpstream -AllowUnmerged -ConfirmCleanup -RemoveGenerated
```

默认只做检查。脚本拒绝删除有未提交修改、存在未推送提交或未合并的 Worktree；使用 `-AllowUnmerged` 时只删除干净 Worktree，保留未合并分支。
`-RemoveGenerated` 只处理固定的 `node_modules`、`dist` 和 `.codex-perf-logs` 目录，且必须由操作者显式传入。

## 失败处理

CI 失败时保留完整日志，先修复根因再重跑同一检查。不要删除测试、放宽性能门槛、吞掉异常或用 `if-present` 把必需检查伪装成成功。Codex Cloud 不能访问本地 Windows 文件、Blender/Unreal 服务或本机 GPU；这些检查必须留在本地验收清单中。
