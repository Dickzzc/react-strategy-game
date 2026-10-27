# Windows 本地性能验证

## 事实边界

当前 `package.json` 没有 `perf:quick`，所以项目还没有可执行的正式性能门禁，也没有现成的 1% Low、p95/p99 或长帧指标来源。`scripts/verify-local.ps1` 会在发现脚本缺失时生成 `NOT CONFIGURED` 报告并失败；它不会把构建耗时或浏览器主观感受冒充 FPS。

GitHub-hosted Windows Runner 不是本机 RTX 4060 的替代品。Windows CI 只验证依赖安装、脚本读取、单元测试和生产构建；GPU/帧时间必须在目标电脑上完成。

## 当前可用流程

```powershell
cd 'D:\User\下载\react-strategy-game'
npm ci --no-audit --no-fund
npm run test:ci
npm run build
.\scripts\verify-local.ps1 -Runs 3
```

前三条是当前可执行的工程检查。最后一条在 `perf:quick` 尚未实现时会明确失败，并把报告和原始日志放在 `.codex-perf-logs\<timestamp>\`。这个失败是配置缺口，不是性能回归结论。

## 未来接入 perf:quick 的要求

新增真实基准时，先固定地图/种子、单位数量、窗口分辨率、浏览器版本、画质设置和后台进程。基准必须返回非零退出码表示失败，并输出它实际测量的字段。三次运行应保留原始 stdout/stderr；脚本只提取输出中明确出现的指标，不自行推算缺失数据。

合并性能 PR 至少需要：功能测试通过、生产构建通过、玩法 smoke test 通过、三次可比的本地运行、1% Low 和长帧证据，以及没有画质或单位数量缩水。没有这些证据时，PR 状态必须写 `Windows performance verification: NOT RUN`。
