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

## 实际命令

版本以 [package.json](../package.json) 的 engines / packageManager 和锁文件为准；使用 `pnpm install --frozen-lockfile`，不更换工程入口。

- `pnpm dev` 同时启动 CN `127.0.0.1:54321`、Global `127.0.0.1:54322`，各自包含双语；Ctrl+C 或 `pnpm dev stop` 同时停止。
- 测试定向运行：`pnpm exec vitest run tests/<受影响测试>.test.ts`（或实际 `.tsx` / `.mjs` 文件）。
- `pnpm check`：Astro/TypeScript；仅在相关范围需要时执行。
- `pnpm test`：现有完整 Vitest。
- `pnpm build:cn`、`pnpm build:global`：分别构建并运行 `scripts/verify-build.mjs`；`pnpm build` 是 CN 别名，不是双地区构建。
- `pnpm preview` / `pnpm preview:global`：现有产物预览。普通 HTTP Server 也可分别以 `dist/cn` / `dist/global` 为根，不需要 SSR 服务；不能用 SPA 回退伪造不存在路由。

先停止两个 DEV 服务，再做 check/build；同地区不要把 dev 与 check/build 混跑。需要完整验证时顺序执行 `pnpm check` → `pnpm test` → `pnpm build:cn` → `pnpm build:global`，不为小改动反复运行全量矩阵。现有 [GitHub Actions](../.github/workflows/ci.yml) 使用 frozen 安装及同一组四条工程命令，无 CD。

通用平台夹具 `node scripts/verify-tool-fixture.mjs cn` / `global` 仅在平台模板变更需要时执行，产物不得部署。目录 `compact` / `pagination` 夹具用法见 [site-tools](../docs/site-tools.md#dev-catalog-samples-c7-r1r2)；默认 off。历史 Converter CN-only 发布模拟脚本已经退役，不恢复另一套发布流程。

## 完成任务

1. 检查最终 diff、工作区与受影响契约；不混入无关格式化、生成资产、秘密或用户改动。
2. 更新对应当前文档及链接；重大功能/兼容性/工程能力更新 CHANGELOG，重大架构决策才建立 ADR。普通样式/文案/夹具小修不强制记条目。
3. 准确报告执行过的检查、结果、未覆盖项与残余风险，不将旧证据称作本轮复测。
4. 按授权范围暂存明确文件、审查 staged diff、提交并推送指定分支。常规集成方向为 `develop → PR → pre-master → PR → master`；不因完成任务自动创建 PR、Tag、Release、合并或部署。
