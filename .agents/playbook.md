# 工程工作流

## 开始任务

1. 核对分支、远端基线与 `git status`，保留已有用户修改；当前开发分支为 `develop`。
2. 明确目标、验收和禁止事项，用 `rg` 定位已有实现与测试。
3. 从 [AGENTS](../AGENTS.md) 按任务进入 [架构](architecture.md)、有关契约、[当前模块文档](../docs/README.md#current--当前说明)；架构变化再读相关 ADR。无需遍读历史档案。
4. 按 Sources of Truth 核实冲突。不要猜测不存在的后台、部署能力或测试结果。

## 修改期间

- 完成必要工作，保持最小完整范围；不顺带升级依赖、改视觉、创建发布流程或通用框架。
- 改权威来源及对应验证，不手改构建产物来掩盖源码问题。
- 文档冲突先核实代码/测试，当前说明记录真实状态，旧验收仍按原环境保留并标明历史；不把未测能力补写成通过。
- 具体数值留在类型、配置和测试中；说明写职责、约束、入口，不重复维护参数表。
- 用户文件不上传、不持久存储；日志、临时样本和截图不能成为生产资源。隔离实验不污染正式依赖。

## 验证选择

唯一风险政策为 [L1/L2/L3](../AGENTS.md#mvp-beta-release-policy-2026-10-10)，不另设发布门。

| 修改范围 | 验证重点 |
| --- | --- |
| 纯文档 | 文本/当前状态一致、内部文件与锚点链接、归档完整性、diff、`git diff --check` |
| UI/文案/样式 | 受影响交互、键盘/Reduced Motion、必要语言/主题/视口，不重跑全部 Lab |
| 控件/任务状态 | 对应组件/状态/取消/失效回归测试 |
| Image Core | 受影响格式的真实文件头、MIME、尺寸、完整回解码、异常及资源清理，不能仅信扩展名或非空 Blob |
| 路由/地区/SEO/静态资源 | 有关测试与实际产物守卫；涉及地区边界时检查两地区产物 |
| 正式资格提升 | 满足 L2 七项，必要完整工程验证及真实 Chromium 用户路径；维护者作最终决定 |

模拟手机视口不是 iOS/Android 真机；jsdom 不证明布局、原生编解码或浏览器文件选择器。L3 按真实反馈跟进，未验证范围必须披露。已知严重缺陷仍阻止 L2。

### 测试职责（不是新的风险等级）

| 职责 | 现有入口与证明范围 |
| --- | --- |
| Contract | Vitest 的 Registry、编译资格、Loader、地区/语言与静态内容测试；验证元数据及路由资格，不用它代替产物隔离证据 |
| Unit / Component | Vitest 中对应工具的算法、任务/取消、资源和 React 交互测试；按实际工具选择，不要求统一文件结构或覆盖率比例 |
| Build Artifact | 两地区 build 内置的 `verify-build.mjs` 检查实际 HTML/发现文件/脚本与资源；平台机制实质变更另运行多工具夹具检查真实依赖归属及反例 |
| Browser Smoke | 真实浏览器核心用户路径，按既有 L2 与受影响范围验收；不纳入日常 CI，不将构建图当作浏览器执行证明 |

## 实际命令

版本以 [package.json](../package.json) 的 engines / packageManager 和锁文件为准；使用 `pnpm install --frozen-lockfile`，不更换工程入口。

- `pnpm dev` 同时启动 CN `127.0.0.1:54321`、Global `127.0.0.1:54322`，各自包含双语；Ctrl+C 或 `pnpm dev stop` 同时停止。
- 测试定向运行：`pnpm exec vitest run tests/<受影响测试>.test.ts`（或实际 `.tsx` / `.mjs` 文件）。
- `pnpm check`：Astro/TypeScript；仅在相关范围需要时执行。
- `pnpm test`：现有完整 Vitest。
- `pnpm build:cn`、`pnpm build:global`：分别构建并运行 `scripts/verify-build.mjs`；`pnpm build` 是 CN 别名，不是双地区构建。
- `pnpm preview` / `pnpm preview:global`：现有产物预览。普通 HTTP Server 也可分别以 `dist/cn` / `dist/global` 为根，不需要 SSR 服务；不能用 SPA 回退伪造不存在路由。

先停止两个 DEV 服务，再做 check/build；同地区不要把 dev 与 check/build 混跑。需要完整验证时顺序执行 `pnpm check` → `pnpm test` → `pnpm build:cn` → `pnpm build:global`，不为小改动反复运行全量矩阵。现有 [GitHub Actions](../.github/workflows/ci.yml) 使用 frozen 安装及同一组四条工程命令，无 CD。

通用平台夹具 `node scripts/verify-tool-fixture.mjs cn` / `global` 在 Registry、Loader、构建配置、资源打包或发布/依赖契约发生实质变化时执行；普通文案、UI 与工具内部参数调整不重复运行。两条命令保留地区组合、升降级、缺 Loader/内容检查，并验证实际模块/Chunk、动态入口、私有 CSS/Worker/WASM 归属，以及提前加载、共享入口带入 Draft、Loader 互换的反例。依赖归属反例必须先成功构建，再由指定归属断言拒绝，不能以无关编译错误充数。

夹具在仓库外 `../.validation/multi-tool-*` 保存源码副本、分阶段产物、构建日志、`*-graph/` 和 `evidence.json`；图证据只在副本配置中采集，不部署 Manifest。Worker 是独立构建图，用生成的 Worker URL 和 WASM 引用连接，仍需独立的 Browser Smoke 验证实际运行。专项夹具不加入日常 CI、不新增 Job/地区矩阵，构建内置守卫不另跑重复步骤。目录 `compact` / `pagination` 夹具用法见 [site-tools](../docs/site-tools.md#dev-catalog-samples-c7-r1r2)；默认 off。历史 Converter CN-only 发布模拟脚本已经退役，不恢复另一套发布流程。

## 完成任务

1. 检查最终 diff、工作区与受影响契约；不混入无关格式化、生成资产、秘密或用户改动。
2. 更新对应当前文档及链接；重大功能/兼容性/工程能力更新 CHANGELOG，重大架构决策才建立 ADR。普通样式/文案/夹具小修不强制记条目。
3. 准确报告执行过的检查、结果、未覆盖项与残余风险，不将旧证据称作本轮复测。
4. 按授权范围暂存明确文件、审查 staged diff、提交并推送指定分支。常规集成方向为 `develop → PR → pre-master → PR → master`；不因完成任务自动创建 PR、Tag、Release、合并或部署。
