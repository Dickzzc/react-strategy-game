# Codex Cloud 任务模板

这些提示词描述允许的范围，不代表任务已经提交或完成。提交前先把仓库绑定到目标 GitHub 私有仓库，并确认 Cloud 连接、分支和权限。当前本地仓库尚未绑定远程。

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
