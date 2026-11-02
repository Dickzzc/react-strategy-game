# Codex Cloud 任务模板

这些提示词描述允许的范围，不代表任务已经提交或完成。当前仓库已绑定到 GitHub 公开仓库 `Dickzzc/react-strategy-game`；提交 Cloud 任务前仍需确认 Cloud 连接、分支和权限。

## 本地 CLI 入口

环境 ID 和默认目标分支保存在 `.codex/cloud.json`；该文件不含凭据，也不表示环境已经连通。在任务工作树根目录执行：

```powershell
./scripts/codex/cloud.ps1 -Action Check
./scripts/codex/cloud.ps1 -Action Submit
./scripts/codex/cloud.ps1 -Action Status -TaskId '<实际任务 ID>'
```

`Check` 通过带 `--env` 的查询验证环境可见性；`Submit` 在检查通过后提交一个只读安装、测试、构建和 CPU 门禁任务。默认分支为 `main`，它必须已经包含本次新增的性能脚本；合并前可在推送功能分支后用 `-Branch codex/perf-cloud-config` 验证该分支。`-EnvironmentId`、`-Branch`、`-CodexCommand` 和 `-Prompt` 可显式覆盖本次调用，不改变全局 Codex 设置。子命令失败会保留错误并退出，脚本不会将空列表算作连接成功。

2026-11-02 的诊断：默认 CLI `0.149.1`、桌面自带 CLI `0.166.0-alpha.5.1`、隔离运行的稳定版 `0.166.0` 均返回 `no cloud environments are available for this workspace`。仓库和全局环境查询的 HTTP 状态均为 200，全局列表为 `[]`；登录状态正常。用户已确认网页发布环境与 CLI 使用同一个个人账号，不再要求重复发布或创建环境。稳定版仅安装到 npm 缓存用于比较，全局 CLI 和认证未修改。

源码排查确认：`codex-rs/cloud-tasks/src/lib.rs` 中 `resolve_environment_id` 先获取环境列表，列表为空时直接报错，尚未比较用户传入的 ID；`env_detect.rs` 使用 `/backend-api/wham/environments` 及其 by-repo 查询。因此，此错误不能证明 ID 格式错误，也不是仓库构建失败。不要解码 ID、改写服务地址或绕过可见性检查来制造成功。

官方文档分别描述新版 Cloud environments 和 Cloud (Legacy)；截图中的 Install script、Start skill、保存草稿/发布与新版设置相符。结合 CLI 的空目录，目录兼容或服务端可见性问题是合理推测，尚无直接证据确认其具体根因，也没有验证有效的本地配置修复。

保留已发布环境，通过网页/桌面的 Cloud 环境选择器启动普通任务可继续工作；设置聊天中的后续修改用于更新环境本身。CLI 接入仍为 BLOCKED，不等同于整个 Cloud 不可用。若需向产品支持报告，可提供以下脱敏复现（原始 `error.log` 不直接公开）：

```text
Date: 2026-11-02
Repository: Dickzzc/react-strategy-game
Account/workspace: same personal account (confirmed by user)
Published web environment: reported by user; Install script and Start skill configured
CLI versions: 0.149.1, 0.166.0-alpha.5.1, 0.166.0
Command: codex cloud list --env react-strategy-game --limit 1 --json
Result: exit 1, no cloud environments are available for this workspace
Environment discovery: HTTP 200, global inventory []
Task submission: not reached
```

CLI 的 `error.log` 可能包含账号标识，保留在本地，不提交或直接公开。官方命令说明：<https://learn.chatgpt.com/docs/cli/reference>；新版环境：<https://learn.chatgpt.com/docs/environments/cloud-environments>；Legacy 环境：<https://learn.chatgpt.com/docs/environments/cloud-environment>。

## Cloud A：移动规则与测试

```text
读取 AGENTS.md、package.json、src/game/world.js、src/game/entities.js 和现有测试。

先确认项目是否真的存在车辆、避障或路径规划模块。当前仓库已知是简单 HTML5 Canvas Demo，不能凭空创建“车辆避障”实现。

如果没有车辆/避障代码：只补充当前移动和地图边界行为的确定性测试，并在 PR 说明缺失的领域；不要发明车辆 API。
如果存在目标代码：只在移动/碰撞相关文件和测试文件内工作，覆盖拥挤位置、重复命令、边界和卡死风险。只有测试证明的缺陷才修复。

禁止修改 React UI、渲染入口、依赖版本、性能门槛和 AGENTS.md。运行 npm run test:ci 与 npm run build，提交实际退出码。创建一个 PR 到 main，不要合并。
```

## Cloud B：UI 可读性

```text
读取 AGENTS.md、src/App.jsx 和 src/ui/，先确认设置页、阵营选择页是否真实存在。

只改善当前已有 UI 的布局、文字可读性、焦点状态和不同窗口尺寸下的行为；如果目标页面不存在，不要虚构页面，改为在 PR 说明缺口并提出最小建议。

禁止修改核心模拟、单位移动、战斗、Canvas 渲染器和依赖版本。运行 npm run test:ci 与 npm run build；若没有浏览器截图环境，明确写 Visual test: NOT RUN。创建一个独立 PR 到 main，不要合并。
```

## Cloud C：性能审查

```text
只做只读性能审查，读取实际的 src/game/engine.js、src/game/world.js、src/game/entities.js、src/ui/ 和现有测试。

本项目使用 HTML5 Canvas，不要把 PixiJS、GPU 缓冲区上传或不存在的车辆避障模块写成事实。检查主循环、每帧数组复制/排序、Canvas 绘制、实体视觉同步和潜在分配；每条结论给出真实文件路径、证据和置信度。

只创建 docs/perf-audit.md，不改源码、素材、依赖和性能门槛。明确说明 Cloud/GitHub Runner 不能验证 Windows GPU、1% Low、p95/p99 或长帧。运行可用的构建/测试并记录结果；不能运行的检查写 NOT RUN。创建一个只含文档的 PR 到 main，不要合并。
```

## Local D：本机性能工作

```text
读取 AGENTS.md、package.json 和 docs/engineering/LOCAL_PERF_TEST.md。

先建立可重复基线，再用浏览器/Windows 工具确认 CPU 还是 GPU 成本。只优化一个有证据的热点，保留地图、单位数量、分辨率、效果和玩法规则。不要用降低画质或关闭功能换平均 FPS。

每次改动后运行 npm run test:ci、npm run build，并在相同负载下完成三次本机验证。报告平均 FPS、1% Low、p95/p99 帧时间和长帧；指标没有可靠采集时写 NOT MEASURED。补充玩法 smoke test，最后创建 PR，不要自合并。
```
