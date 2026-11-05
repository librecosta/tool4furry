# Tool4Furry — Agent Entry

## Repository Purpose

开源浏览器工具箱，Astro SSG + 按需 React + TypeScript。全站 Astro、React、29 款工具及 DEV Lab 使用 SCSS Modules / CSS Variables，V0.9 已移除 StyleX。保持工具业务独立，以实际源码、测试和最小可复现验证协作。

## Current State

- Image Converter、Image Resize & Crop、Palette Extractor、Image Compressor、Comic Page Organizer、Image Watermark、EXIF Metadata、PDF Merge、PDF Split、Images to PDF 与 ZIP Manager 十一款工具均为 Published；CN/Global 双语正式构建与产物守卫通过，**两个地区均未部署**。源码 Published 不代表部署授权。
- 当前没有后端、数据库、SSR 服务或用户系统。Lab 仅供 DEV，不能进入生产路由/资源图。
- Image Compressor 已完成 B1-D1 SEO 与 Beta 资格收尾，保留 C1-R1 最长边步进器；EXIF Metadata 已完成 B4-D1 双语 SEO 与 Beta 收尾；Image Watermark 已完成 B3-D1 双语 SEO 与 Beta 收尾；Comic Page Organizer 已完成 B2-D1 双语 SEO，并按维护者明确要求提升为 CN/Global Published；转换归档真实落盘验收仍缺证据，不能声明 L2 已全部通过。当前能力、审计证据和 L3 边界见 [基础图片工具说明](docs/image-basics.md)。
- Image Resize & Crop 已完成 A1-D2 Beta 资格审计；单张裁剪、批量缩放、双语静态页面与所需资源进入两地区正式构建。实现、资格证据及 L3 未测范围见 [Resize/Crop 说明](docs/image-resize-crop-implementation.md)。A1 已收尾，不继续扩展裁剪工作区。
- Palette Extractor 已完成 A2-D2 Beta 资格审计；有界提色、色卡编辑/图片取色和 PNG 分享卡进入两地区正式构建，首页复用既有画家/动画师精选。证据与 L3 边界见 [Palette 说明](docs/palette-extractor.md#a2-d2-beta-资格审计2026-11-01)。A2 已收尾，不继续新增功能阶段。
- 当前能力与 D2 证据见 [Converter 说明](docs/image-converter-implementation.md)；旧阶段的 Draft、零工具、三格式和 CN-only 结论属于历史。

- V0.8 两批已增加 22 款通用工具初版（15 + 7）；PDF Merge / PDF Split / Images to PDF / ZIP Manager 已完成各自双语静态 SEO 与核心输出复核并具备 CN/Global Published 源码资格，其余 18 款保持 Draft；最新远程 CI 状态单独记录，不能把本地验收等同于 L2 七项全部通过。PDF Split 的预览使用按需本地 PDF.js，真实输出仍由 pdf-lib 负责；三款 PDF 工具在点击下载时生成安全文件名和本地毫秒时间戳。Images to PDF 保留画廊排序、预览和宽松非阻断资源策略。共 29 款工具（11 Published / 18 Draft）。实际能力、限制和验证见 [通用工具说明](docs/general-toolbox-v0.8.md)。

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
- **文件表单布局**：具备文件导入、文件列表以及参数或操作面板的 Form/Batch 工具，默认采用左侧文件与预览、右侧设置与操作的布局。优先复用 `src/workbench/form-tool-layout.module.scss` 和既有 WorkbenchShell，不自行创建重复的双栏样式。复用同时包括完整设置面板、标题、间距、空状态、嵌入式模式切换和操作区，以 Image Converter 为视觉基准；仅复用左右列不算完成。没有真实参数时不得为了填充设置栏添加无意义控件。Canvas、单一输入工具及其他不适用场景可以例外，例外应有明确理由。
- **样式**：组件、工具和 Lab 使用所有权内的 SCSS Modules；`global.scss` 只负责 reset、字体与基础规则，`tokens.scss` 是完整 `--t4f-*` 主题值的唯一来源。层顺序为 reset → base → t4f-controls → t4f-ui → t4f-tools；工具通过 className 在工具层覆盖公共控件，状态与响应式优先级须明确，不依赖 Chunk 顺序。同步 head 控制器只通过 `data-appearance` 管理主题与偏好，Portal 继承根变量；不恢复 StyleX、运行时 CSS 注入器或主题 Provider。见 [样式基础](docs/styling-foundation-v0.9.md)。
- **静态素材**：组件内部图片、插画与工具图标默认放在 `src/assets/`，用 Astro/Vite 静态导入参与构建；只有确实需要固定公开 URL 或原样独立分发的品牌、Favicon、OG、法律声明等资源放在 `public/`。不将 Draft 私有素材提前导入公共模块；既有 Worker/WASM、局部 CSS 与按需许可证维持工具所有权。字节必须保持的 PNG/AVIF 使用 `?url&no-inline`，不交由图片优化器重编码。
- **固定 DEV 端口**：CN `4321`、Global `4322` 由 `src/config/dev-origins.mjs` 唯一定义。未经维护者明确要求，禁止修改端口、引入备用端口或关闭 `strictPort` 来绕过占用。占用者可能是维护者自行启动的同仓库服务；先确认归属，再通过 `pnpm dev stop` 或已核实的精确 PID 停止旧实例，仍用原端口调试。归属不明时保留进程并报告，不误杀、不改端口。操作步骤见 [playbook](.agents/playbook.md#本地服务与固定端口)。
- **本地文件与隐私**：不上传/持久存储用户文件；不削弱真实输出、默认隐私、版本隔离与取消保证，资源策略按工具授权调整。名称不触发编码，失效结果不得下载或进入 ZIP。详见图片处理契约。
- **本地资源策略**：纯浏览器本地工具原则上采用宽松、用户可控的资源策略；人为预算优先作为性能提醒，只有真实技术、安全或数据正确性边界才硬性拒绝。按工具授权逐项调整，不借此批量放宽其他工具的现有预算。
- **范围与授权**：最小完整修改，不顺带依赖升级、重构或伪造工具。保留 BSD 和第三方授权。未经授权不合并发布分支、创建 Release/Tag 或部署；当前流程为 `develop → PR → pre-master → PR → master`。
- **本地提交**：有改动的任务完成后默认提交到本地；推送须有维护者明确要求，并以最新指令为准。不把“本地提交”自动扩展为推送、PR、合并或发布。

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
