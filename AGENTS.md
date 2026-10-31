# Tool4Furry — Agent Entry

## Repository Purpose

开源浏览器工具箱，Astro SSG + 按需 React + TypeScript + StyleX。保持工具业务独立，以实际源码、测试和最小可复现验证协作。

## Current State

- Image Converter 是首个且目前唯一的 Published 工具；CN/Global 双语静态构建可用，**两个地区均未部署**。源码 Published 不代表部署授权。
- 当前没有后端、数据库、SSR 服务或用户系统。Lab 仅供 DEV，不能进入生产路由/资源图。
- Image Resize & Crop 是第二款真实工具，当前为 CN/Global 双语单图 Draft；实现与人工入口见 [Resize/Crop 说明](docs/image-resize-crop-implementation.md)。生产仍排除其页面、实现和专属资源，批量阶段尚未实现。
- 当前能力与 D2 证据见 [Converter 说明](docs/image-converter-implementation.md)；旧阶段的 Draft、零工具、三格式和 CN-only 结论属于历史。

## Start Here

1. 核对当前分支、工作区、任务范围和禁止事项。
2. 按需阅读 [.agents/architecture.md](.agents/architecture.md)、[.agents/playbook.md](.agents/playbook.md)。
3. 阅读相关契约：[兼容性](contracts/compatibility.md)、[发布](contracts/publication.md)、[图片处理](contracts/image-processing.md)、[上游](contracts/upstream.md)。
4. 从 [docs 索引](docs/README.md) 找当前模块说明，再检查对应源码和测试；重要架构变化另查 [ADRs](docs/decisions/README.md)。无需每次通读所有 History/Research/Evidence。

## Repository Map

| 位置 | 所有者 / 职责 |
| --- | --- |
| `src/pages/`、`src/layouts/`、`src/components/` | 静态路由、SEO、站点/首页 UI |
| `src/site/`、`src/config/`、`src/i18n/` | 内容/发现投影、地区与语言 |
| `src/tools/` | 元数据 Registry、Loader、ToolRuntime 及工具业务 |
| `src/ui/`、`src/workbench/` | 受控原语、可选工作区布局 |
| `src/styles/`、`src/visuals/`、`src/lab/` | 样式、正式视觉增强、隔离的 DEV 演示 |
| `tests/`、`scripts/`、`.github/workflows/ci.yml` | 行为测试、静态守卫和既有 CI |
| `.agents/`、`contracts/`、`docs/` | 执行上下文、稳定约束、当前说明与历史证据 |

## Sources of Truth

优先级从高到低：

1. 当前源码与实际行为测试。
2. 类型、配置、Schema、构建契约及机器可读约束。
3. 当前 `contracts/` 与已接受 ADR。
4. 当前模块说明。
5. 历史设计、研究及验收记录。

发现冲突先核实代码与测试，标记过时说明并在当前入口记录真实状态；不能静默改写旧结果，也不能为了文档一致而改变已验收行为。

## Critical Rules

- **可用性**：Registry 的 `status` + `regions` 是唯一发布来源；DEV 为本地区 Draft + Published，生产仅 Published。Loader/Vite 只投影该状态，不新增发布开关、路径或 Store，不泄漏 Draft/Lab/Fixture 及其专用资源。
- **地区/语言**：CN/Global 独立产物，各有中英文；语言切换同源，地区外链才跨来源。Canonical/hreflang/发现文件与实际页面一致，规则由配置与测试控制。
- **静态与交互**：页面正文、唯一 H1、指南/FAQ 保留 Astro 静态输出；固定 ToolRuntime/LabRuntime 才挂必要 React，工具实现懒加载。无全站 React Provider/业务 Store；静态页面受精确脚本审计，不随意加 JS 或 preload。
- **所有权**：WorkbenchShell 只管布局/插槽/面板，UI 原语受控；文件、设置、任务和释放归工具。不得因断点切换或开关面板重建业务状态。具体 Canvas/预览合同见 [工作区说明](docs/workbench-appearance.md)。
- **样式**：继续 StyleX 与统一语义 Token，global.css 限于 reset/基础桥接；保留静态主题、Portal 继承及现有 DEV FOUC 兼容补丁，不另建主题系统或恢复旧 Babel 配置。
- **本地文件与隐私**：不上传/持久存储用户文件；真实输出、默认隐私、版本隔离、取消和资源预算不可放宽。名称不触发编码，失效结果不得下载或进入 ZIP。详见图片处理契约。
- **范围与授权**：最小完整修改，不顺带依赖升级、重构或伪造工具。保留 BSD 和第三方授权。未经授权不合并发布分支、创建 Release/Tag 或部署；当前流程为 `develop → PR → pre-master → PR → master`。

## Verification

按下面政策选最小充分验证；实际命令及适用场景见 [playbook](.agents/playbook.md#验证选择)。完整工程命令仍为 `pnpm check`、`pnpm test`、`pnpm build:cn`、`pnpm build:global`，不替换为模板命令。

check/build 前停止两个 DEV 服务，不混用同地区缓存；日常定向验证，完整 CI 优先由既有 GitHub Actions 执行。报告未测平台，不以 jsdom 或手机视口模拟代替真实浏览器/移动设备证据。

## MVP Beta release policy (2026-10-10)

This policy supersedes conflicting mandatory cross-browser/device/resource-matrix release requirements in V0.4-A/B documents. Preserve historical evidence, safety checks, format verification and necessary automated tests. A policy update does not authorize publication.

- **L1 — Daily development:** UI/copy/style changes need relevant behavior and necessary viewports only; controls/state changes need related tests; image-core changes need the affected formats, failures and actual outputs verified. Documentation-only changes need text consistency, diff review and `git diff --check`. Do not repeat all browsers, all Lab regressions, the full test suite or both regional builds for every small change; full CI primarily runs in existing GitHub Actions.
- **L2 — MVP Beta:** all seven requirements must hold:

  1. Existing GitHub Actions CI passes.
  2. At least one real Chromium browser completes import, conversion, preview and download.
  3. Actual output format, MIME, file contents and downloaded result are correct.
  4. Desktop and common phone viewport layouts are usable without blocking interactions.
  5. Runtime capability detection safely disables unsupported encoders or reports an explicit error.
  6. No known data corruption, severe crashes or other blocking issues remain.
  7. The maintainer makes the final decision to enter Beta.

- **L3 — Compatibility follow-up:** after Beta, target Firefox, Safari/WebKit, real iOS/Android devices and performance testing according to feedback and need. A full browser/device matrix or universal resource-limit validation is not a Beta prerequisite. Record untested platforms and resource-limit uncertainty honestly; never claim universal compatibility. Known blocking defects still block L2.
