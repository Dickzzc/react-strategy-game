# Windows 本地性能验证

## 事实边界

`npm run perf:quick` 运行 CPU 模拟门禁，直接调用游戏的 `World.update`，不修改玩法代码。它测量移动、战斗、生产三个固定负载的 update 耗时，记录均值、p95、p99、最大值和逐次原始样本。Canvas、GPU、React、玩家/AI 控制器和浏览器帧率不在采样范围内；1% Low FPS 与整帧耗时仍为 `NOT MEASURED`。

配置位于 `scripts/perf/config.json`：50×50 全草地图、种子 20261102、固定步长 1/60 秒、120 次预热、600 次采样；移动和战斗各从 256 个单位开始，生产从 64 座兵营开始并持续产兵。战斗夹具提高生命值以保持负载，夹具允许实体重叠；这些是逻辑压力场景，不代表完整玩家对局。命令生成、夹具准备和状态断言不计入 update 耗时。

默认策略预算是每个场景 p95 ≤ 8 ms、p99 ≤ 16.667 ms，任一超限退出 1。预算用于发现明显回归，尚未按不同硬件建立相对基线；通过不等于达到 60 FPS。调整预算需说明依据，不能为消除失败而放宽。

GitHub-hosted Windows Runner 不是本机 RTX 4060 的替代品。Windows CI 只验证依赖安装、脚本读取、单元测试和生产构建；GPU/帧时间必须在目标电脑上完成。

## 当前可用流程

```powershell
# 在当前任务工作树根目录执行
npm ci --no-audit --no-fund
npm run test:ci
npm run build
npm run perf:quick
.\scripts\verify-local.ps1 -Runs 3
```

`perf:quick` 每次将 JSON 写入 `.codex-perf-logs/quick-*.json`，包含提交、工作树是否有改动、Node/操作系统/CPU 信息、完整配置、样本和最终状态哈希。`verify-local.ps1` 另存三次 stdout/stderr 和报告；它的 PASSED 只表示 CPU 门禁命令成功。相同配置应得到相同状态哈希，跨硬件的耗时不能直接当作优化幅度。

Linux 和 Windows CI 均执行 CPU 门禁，并上传 `cpu-perf-linux` / `cpu-perf-windows` 样本附件。测试夹具及失败判定由 `test/perf.test.js` 覆盖。不需要新增依赖。

## 浏览器和 GPU 验证要求

接入浏览器帧时间采样时，先固定地图/种子、单位数量、窗口分辨率、浏览器版本、画质设置和后台进程。基准必须返回非零退出码表示失败，并输出它实际测量的字段。三次运行应保留原始 stdout/stderr；CPU update 的 p95/p99 不能替代浏览器整帧指标。

合并性能 PR 至少需要：功能测试通过、生产构建通过、玩法 smoke test 通过、三次可比的本地运行、1% Low 和长帧证据，以及没有画质或单位数量缩水。没有这些证据时，PR 状态必须写 `Windows performance verification: NOT RUN`。
