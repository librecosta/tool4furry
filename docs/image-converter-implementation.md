# V0.4-B — Image Converter 实施与验收记录

本页是代码交接记录，不是用户提供的完整实施合同副本。合同从附件 `image-converter.md` 全文读取；用户明确不要求导入仓库。验收日期：2026-10-10（Asia/Shanghai，JSON 时间为 UTC）。

## 当前状态与入口

**draft，未公开发布。** 开发运行 `pnpm install && pnpm dev` 后访问 `http://127.0.0.1:54321/preview/image-converter/`。英文：`pnpm exec cross-env SITE_REGION=global pnpm dev`。正式目标是 `/tools/image-converter/`，目前两个地区的正式构建均不生成此路由，不在首页、目录或切换器中展示草稿。

这是可真实处理图片的工具预览，不是 Lab 的模拟算法。按 2026-10-10 的 [L1/L2/L3 发布政策](../AGENTS.md#mvp-beta-release-policy-2026-10-10)，Firefox、Safari/WebKit、iOS/Android 真机及全设备资源上限的验证缺口不再自动阻断 Beta，转为后续兼容性待办，仍须如实披露。当前保持 draft，等待视觉打磨及维护者按 L2 最终确认，再单独决定是否提升 published。五个既有 `/lab/*` 保留原职责。

新政策取代旧合同中冲突的强制跨浏览器发布要求；以下 B0–B5 历史实测记录不变，不因政策调整补记任何测试通过。日常修改按 L1 定向验证，完整 CI 优先由 GitHub Actions 执行。

## B0 — 基线及接口增量

- 开始时工作区干净，`dev` 与 `origin/dev` 均为 `d9e99b15819fcb78b414c025f470046624ac84e6`，fetch 后未发现更晚提交；没有覆盖用户未知工作。
- A 基线：13 个 Vitest 文件、117 项通过。原 CI 成功：[37953700597](https://github.com/librecosta/tool4furry/actions/runs/37953700597)。当时 Registry 为空，已具备分类、全目录、静态唯一 H1、双地区与五 Lab 隔离。
- 未升级依赖、修改 Astro/StyleX 集成、Provider、Canvas 浮层或状态所有权。
- 最小扩展：`setRecommendedPreset()` 只更换当前格式的推荐基线；`WorkbenchShell.formWidth='wide'` 仅扩大 opt-in Form 内容宽度；FileDropzone 可选 compact 外观及完整选择结果回调；ToolRuntime 增加受 DEV 条件限制的 preview 入口。详情见源码与文件交互文档。

## B1 — 图片核心

`src/tools/image/` 独立承担真实图片结构与原生编解码，不处理 UI 状态。

- `inspectImage(blob)`：单次读取不超过 64 KiB，检查 PNG CRC/块次序与结束、JPEG 段/扫描/EOI、WebP RIFF 长度及图片块。PNG/WebP 的动画结构必须拒绝，文本中的相似字符串不误判。MIME 和后缀不作真实性依据；不支持的格式拒绝。
- EXIF 只读有界 IFD0；`createImageBitmap(..., {imageOrientation:'from-image'})` 是唯一方向变换负责人。按方向交换预期尺寸，避免又手工旋转一遍。
- `acceptImage()` 完成结构和真实解码后才交付 source，立即关闭检查位图。工具持有 File/Blob，无上传/持久存储。
- `detectCapabilities()` 分别实际编码 PNG/JPEG/WebP，再检查非空、MIME、结构、尺寸和回解码；输入解码能力与输出编码能力不混同。不支持 WebP 时保守选可用 PNG；失败格式禁用并可重试。
- `encodeImage()` 保持原尺寸，JPEG 默认白底并支持合法 #RRGGBB。每次真实导出重新验证 MIME、实际结构、回解码和尺寸。PNG fallback 不作为 WebP 成功，不能改后缀伪装。
- `ImageResources` 仅是实例内所有权计数与释放入口；没有全局 Store。位图 close，Canvas 归零；Converter 持有原图缩略图 URL 并供预览复用，关闭 Dialog 不撤销它；替换/移除/卸载时释放原图 URL，结果变更时释放输出 URL，同 Blob 的直通输出共用原图 URL。计数平衡不是操作系统堆内存回落的证明。

原生 API 不能硬取消正在进行的 `toBlob()`。实例内 `SerialJobs` 至多一个重型操作，新的同类等待任务替换旧等待任务。45 秒 watchdog 报错但不提前释放运行槽；原生调用真正结束前不并发重试，必要时提示重载。未采用 Worker/WASM 或通用任务池。

### 大图实测发现并修复的问题

16MP 复杂 JPEG 初次转 PNG 被过小的固定 4096 块预算误拒绝；JPEG 扫描还重复读取了大量缓冲。改为随文件字节有界增长的块预算、复用未扫描缓冲后，同样本三格式均通过。新增回归测试保护大量合法 IDAT、极端空块拒绝与 JPEG 总读取量。初次失败记录保存在本地 artifacts，最终成功数据已入库。输出字节可以大于输入 20 MiB，不能用输入上限误判合法输出。

规范依据：[PNG 规范](https://www.w3.org/TR/png-3/)、[WebP RIFF](https://developers.google.com/speed/webp/docs/riff_container)、[createImageBitmap](https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap)。规范描述不代表所有目标浏览器都实测通过。

## B2 — 一份参数与两阶段换源

`src/tools/image-converter/session.ts` 复用既有 `processing-state.ts` 的 sourceRevision/settingsRevision/requestId。不是第二套全站状态框架。

| 行为 | 实现合同 |
| --- | --- |
| 格式推荐 | WebP 85；JPEG 88 + #FFFFFF；PNG 无质量设置 |
| Quick 导入 | 最新候选验证通过后自动生成；能力稍后到达时补一次 |
| Quick 格式操作 | 有图时主动选新推荐自动生成；相同 pending/ready 不重复；同格式原字节 passthrough 并明确说明未重新编码 |
| Advanced | 按格式记忆最后编辑参数，改参数变 stale，主动生成；同格式仍真实重编码 |
| 模式/宽度 | 只改变显示，不重置参数、不产生编码 |
| 恢复推荐 | 恢复当前格式，不强制回 WebP |
| 文件名 | 独立状态；不使 Blob 过期、不触发编码；实际扩展名由输出 MIME 决定，编码默认 `-converted` |
| 换源 | 独立 candidate token；检查时暂停旧下载，失败保留旧源/结果并恢复下载，最新成功才 replaceSource |
| 旧异步结果 | 不得覆盖新版本；移除/卸载使候选与请求失效；原生任务结束后释放临时资源 |

V0.5-B3-A：`ImageConverter.tsx` 的 DOM 顺序为 file → settings → tasks；<=900px 自然单列，桌面 Grid 将紧凑文件列表置左、唯一设置实例置右。仍只接收单个文件；下载和重试在文件行内，原图/当前有效输出仅按需在 Dialog 展示。公共 `FileTaskList` 接收展示数据与操作回调，不持有媒体资源或调度任务。质量、背景色、命名和 Session 规则不变；无虚构百分比、无自动下载。

B3-A.1：列表采用真实原图缩略图；`FilePreviewDialog` 提供可复用外壳，`ImagePreviewViewport` 只显示单画面，原图/有效输出切换时重置视图。适应窗口、100% CSS 像素、锚点缩放、受限平移及双指手势均只改变预览；关闭时卸载查看器并清理 Pointer/Wheel/ResizeObserver，Fullscreen 由外壳清理，不影响列表或编码资源。

## B3 — Registry、SSG、SEO 与隔离

- metadata：`images → image-processing → image-converter`，form，CN/Global，status draft。
- `loaders.ts` 中动态 import 直接放在 `import.meta.env.DEV` 条件下。最初跨模块 publication 布尔值仍产生草稿 chunk，被静态守卫发现；改为直接条件后隔离通过。未来经授权发布时须同时变更 status 和 loader 条件。
- `/preview/[slug].astro` 的 getStaticPaths 在 build 返回空；复用固定 ToolRuntime + Provider + lazy + Error Boundary。noindex，不创建第六个 Lab。
- Astro-only `image-converter-content.ts` 提供双语 title/description、唯一静态 H1、简介、步骤、限制、FAQ。React 不导入长文；正式路由仍按本地区 published 过滤。
- `verify-build.mjs` 保留全部 A 守卫并新增 preview 路由、预览标记、DEV diagnostics 和未发布 Converter JS 排除。
- `node scripts/verify-converter-fixture.mjs cn/global` 在内存里装配真实工具的 production-shaped 静态页，复用正式守卫；输出仓库外 `../.validation/converter-v04b/ssg/`。它不更改磁盘 Registry/status/loader，**仅测试、绝不部署，不算公开发布门禁通过**。
- 原 A 的 `verify-tool-fixture.mjs` 继续验证 20+ 工具、地区与首页最多 9 项；仅调整测试模块替换接缝以容纳真实 draft 元数据，没有删断言。

## B4 — 真实证据与限制

环境：Windows 桌面、内置 Chromium 155，AMD Ryzen 7 5800H、16 logical processors、约 32 GiB RAM；Node 24.15.0 / pnpm 12.8.1。下面的浏览器均为同一桌面 Chromium，窄视口不是真机。

入库原始记录：[小样本核心](evidence/converter-v04b/core-chromium.json)、[大样本](evidence/converter-v04b/large-chromium.json)、[中文尺寸](evidence/converter-v04b/cn-layout.json)、[英文尺寸](evidence/converter-v04b/global-layout.json)、[清理计数](evidence/converter-v04b/cn-cleanup.json)、[连续换源](evidence/converter-v04b/cn-race.json)。

| 项目 | 本次实测 |
| --- | --- |
| PNG/JPEG/progressive JPEG/WebP/错后缀 PNG | 5 种输入各转 3 格式，共 15 次 MIME、结构、尺寸、像素与回解码检查通过 |
| EXIF 1–8 | 含镜像 2/4/5/7；像素象限与方向正确，5–8 从 80×48 到 48×80 |
| 透明度 | PNG/WebP 保留 alpha 128 与 0；JPEG 白底正确；自定义 #204060 背景下载 JPEG 的透明区约为 [31,64,95]（有损差异） |
| 拒绝 | 真实 APNG/动画 WebP、损坏、空文件、不支持格式、超边长/像素；旧有效下载能保留 |
| 浏览器下载 | 660B WebP 80×48；PNG passthrough 210B 与原文件 SHA256 相同；自定义 JPEG 与英文 1024×772 JPEG 均落盘并由 Pillow 独立识别 |
| Quick/Advanced/命名 | 改名和模式切换不增加编码或换 Blob URL；滑块方向键令旧结果失效，恢复/手动生成正常；格式方向键可操作 |
| 生命周期 | 12 次三格式切换后移除：24/24 位图、13/13 Canvas、15/15 URL，DOM 无 Blob 引用；重型操作 maxActive=1 |
| 连续换源 | 复杂大图 → WebP → PNG，最终为最新 PNG 的 WebP 输出，无旧结果覆盖，maxActive=1 |
| 文件交互 | 真实系统选择（含 Enter）、替换、移除与同文件；拖放事件覆盖于组件测试，未冒充 OS 实际拖拽 |

候选开发保护：输入 20 MiB、16,000,000 像素、单边 8192px。以下是该桌面的单次样本，并非最大能力或内存峰值测量：

| 输入 | WebP 输出/耗时 | JPEG 输出/耗时 | PNG 输出/耗时 |
| --- | --- | --- | --- |
| 1024×772 照片，257,056B | 261,150B / 113ms | 289,585B / 24ms | 1,948,726B / 261ms |
| 4000² 纯色 PNG，56,255B | 29,010B / 732ms | 94,511B / 202ms | 316,991B / 227ms |
| 8192×64 PNG，1,779B | 1,496B / 26ms | 3,833B / 9ms | 10,172B / 10ms |
| 4000² 复杂 JPEG，10,679,706B | 11,285,262B / 3265ms | 11,030,543B / 611ms | 54,523,000B / 7058ms |

时间包含编码及输出验证；噪声图输入检查约 200ms。大样本运行创建/关闭 28 个位图、创建/释放 12 个 Canvas。**没有成功导入恰好 20 MiB 的代表性照片、没有真实手机内存或热状态数据，因此这些阈值不能冻结为发布承诺。**

照片为 Google WebP Gallery 样本 4：Benjamin Gimmel 的 “A Wild Cherry (Prunus avium) in flower”，CC BY-SA 3.0，来源 [官方 Gallery](https://developers.google.com/speed/webp/gallery1)，文件只在仓库外用于本地验证，不纳入生产或 git。其他二十一项小图片为本仓库生成的合成数据，见 fixtures README；大噪声图固定 random seed 44。

### 布局与原有 Lab

CN 和 Global 均检查：1440×900、1024×768、901×600、900×600、768×1024、390×844、375×812、320×568、812×375。全部 scrollWidth <= clientWidth；设置实例数 1，阅读顺序正确，九次宽度切换 requestId 和下载 URL 保持一致。检查手机/桌面截图，英文 320px 高级输入、横屏结果与长中英文文件名可用。截图在工作区外 `../artifacts/converter-v04b/`（不将图片证据作为网站资源）。内置浏览器桌面截图受宿主面板可见宽度裁切，DOM 几何记录仍为指定完整视口。

浏览器回归：Form 空值错误及大写输出；Batch 添加/推进两次/移除/清空；UI Toast/确认框；Files 元信息选择及 ScrollDock 100%→75%；Canvas 在 390×844 和 1440×900 开关 Inspector 几何不变，参数只有一份，窄屏嵌套 Select、Escape、焦点返回与跨宽度值保持，未覆盖区可增加标记。

开发时格式化文件后曾遇 StyleX `data-style-src` 行号的 dev Hydration 警告；未通过更改配置掩盖。最终停止并冷启动 dev 后无新增 Hydration 错误；普通 HTTP Server 提供的 CN 隔离静态装配也实际完成 PNG→WebP（660B），唯一 H1/Island、无 DEV diagnostics、无该页控制台错误。这不代表未测浏览器已通过。

### 复现与待验

1. `pnpm dev` → `/preview/image-converter/`：导入透明 PNG，等 WebP ready，下载并独立确认格式；点 PNG 检查“未重新编码”。
2. Advanced 调质量、JPEG 背景和文件名，检查无效参数不能生成；改名不重新编码。切模式、901/900px 宽度不丢值。
3. 替换损坏/动画/超限输入，检查期间暂停下载、失败后旧图旧结果恢复；快速连续选择两个有效源，最后一次选择获胜。
4. 连续处理并移除，展开 DEV diagnostics 检查位图/Canvas/URL 释放；离开页面不能留下工具-owned URL。
5. 停止 Astro dev 后，`node scripts/serve-converter-probe.mjs` → `http://127.0.0.1:4388/scripts/spikes/converter-core.html`，点击真实 codec 检查。可用 Pillow 再生成 `--large` 样本，外部照片须按上方来源自行准备，运行可选大样本。probe 无生产路由。

Firefox、Safari/WebKit、iOS Safari、Android Chrome、真实触摸/软键盘/安全区/下载体验、屏幕阅读器、reduced-motion 系统设置、设备峰值内存/持续温升、ICC/广色域照片主观质量仍待人工验证，按 L3 根据反馈和需求推进，不再要求全部先于 Beta 或 C/D 复用完成。没有引入新的运动效果；继续复用既有 reduced-motion 样式。各环境兼容性声明必须有对应实测依据，不自动引入 WASM；已知数据损坏、严重崩溃或其他阻断问题仍须在 L2 前解决。

## B5 — 最终验证

停止 dev 后按顺序执行，最终结果：

| 命令 | 真实结果 |
| --- | --- |
| `pnpm install --frozen-lockfile` | 通过，锁文件未改，pnpm 12.8.1 |
| `pnpm check` | 103 个文件，0 errors / 0 warnings / 0 hints |
| `pnpm test` | 17 个文件、167 项全部通过 |
| `pnpm build:cn` | 通过，3 静态页，0 已发布工具 |
| `pnpm build:global` | 通过，3 静态页，0 已发布工具，未覆盖 CN |

两套正式产物的零首页脚本/Island/JS preload、canonical/OG/唯一 H1、真实目录/路由、StyleX 提取、100 本地 WOFF2 + 3 内嵌子集及许可证、Lab/fixtures/spikes/preview/草稿实现隔离守卫均通过。原 A fixture 双地区各 24 页，以及真实 Converter 隔离装配双地区各 4 页，额外验证通过。生产仍只有首页、目录和 404。

全量检查最初发现测试调用误用了浏览器 API 的 `exact` 选项，以及旧测试把真实 Registry 断言为完全空数组。已按 Testing Library 类型和真实 draft 状态修复，保留并增加了无 fixture 污染、两个地区 published 列表为空的断言；未删除旧过滤测试。随后完整门禁通过。

CI 配置未改：dev/main push 与 PR 使用 Node 22 顺序运行 frozen install、check、test、build:cn、build:global，仅 CI 无 CD。本次提交的远端结果以 GitHub Actions 与最终交接链接为准；本地通过不冒充远端通过。LICENSE 哈希与基线一致，未修改 main、未部署、未引入任何生产服务或密钥。
