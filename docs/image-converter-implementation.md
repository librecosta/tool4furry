# V0.4-B — Image Converter 实施与验收记录

本页是代码交接记录，不是用户提供的完整实施合同副本。合同从附件 `image-converter.md` 全文读取；用户明确不要求导入仓库。验收日期：2026-10-10（Asia/Shanghai，JSON 时间为 UTC）。

## 当前状态与入口

**draft，未公开发布。** 开发运行 `pnpm install && pnpm dev` 后访问 CN `http://127.0.0.1:54321/tools/image-converter/` 或 EN `http://127.0.0.1:54322/tools/image-converter/`，可直接通过中/EN 往返。开发与生产仅有这一工具路径；目前两地区正式构建不生成 draft 路由、专用实现或目录入口。Ctrl+C 或 `pnpm dev stop` 同时停止两端。

这是可真实处理图片的工具预览，不是 Lab 的模拟算法。按 2026-10-10 的 [L1/L2/L3 发布政策](../AGENTS.md#mvp-beta-release-policy-2026-10-10)，Firefox、Safari/WebKit、iOS/Android 真机及全设备资源上限的验证缺口不再自动阻断 Beta，转为后续兼容性待办，仍须如实披露。当前保持 draft，等待视觉打磨及维护者按 L2 最终确认，再单独决定是否提升 published。五个既有 `/lab/*` 保留原职责。

新政策取代旧合同中冲突的强制跨浏览器发布要求；以下 B0–B5 历史实测记录不变，不因政策调整补记任何测试通过。日常修改按 L1 定向验证，完整 CI 优先由 GitHub Actions 执行。

## C5-A — 资源限制与大图定向证据（2026-10-26）

- `src/tools/image/limits.ts` 是当前额度来源。桌面：100 张、单张 50 MiB / 40MP / 单边 10000px、总输入 100 MiB；移动与信号不确定时：50 张、20 MiB / 16MP / 8192px、总输入 60 MiB。ZIP 仍为 128 MiB。100/50 数量采用维护者本轮指示，取代 Issue #9 原候选数量。
- 每个 Session 固定并冻结一份额度；浏览器 mobile/coarse pointer 等提示只用于保守选择，不代表性能评估，不跟随视口变化。文件选择与文件夹共用 Session intake，结构解析、解码、Canvas、输出复检及中英文提示继续传递同一额度。64 KiB 读取、结构/动画/方向检查、单通道与 45 秒 watchdog 保留；输出字节上限独立于输入上限。
- 先在仓库外隔离副本探测，再接通产品额度。Windows Chromium 156，Pillow 自有高纹理 RGB、透明 PNG、噪声 JPEG，逐张执行；每个输出均检查实际格式、MIME、尺寸、回解码并加载预览：

| 输入 | 尺寸 | 三格式编码与复检耗时 | 结果 |
| --- | --- | --- | --- |
| 24MP 噪声 JPEG / 48.9 MiB | 6000×4000 | 3.3–23.0s | WebP/JPEG/PNG；PNG 78.7 MiB，大于输入限额仍有效 |
| 36MP 纹理 PNG / 31.7 MiB | 7200×5000 | 3.7–19.8s | 两轮三格式通过 |
| 40MP 透明 PNG / 43.7 MiB | 10000×4000 | 4.0–28.9s | 两轮三格式通过，PNG 64.7 MiB |
| 48MP 纹理 PNG / 42.3 MiB | 8000×6000 | 5.4–30.9s | 仅隔离探测通过，产品仍拒绝超过 40MP |

- 隔离探针共 18 个真实输出，42/42 位图关闭、18/18 Canvas 归零、18/18 URL 撤销。计数仅证明代码所有权配对，未测浏览器进程内存峰值、GC 回收时点或 GPU 峰值。
- 实际工作台另测精确 50 MiB JPEG 接收与转换、+1 字节拒绝、重复追加达到 100 MiB 后的部分接收；48MP 与损坏输入失败不影响有效项下载。40MP 下载的 WebP 已用 Pillow 独立完整解码为 10000×4000 RGBA。两次大图导入/清空后计数配对，`maxActive=1`。
- 两个 40MP PNG 输出各 67,830,461 字节，ZIP 合计超 128 MiB 时正确拒绝并允许重试/逐项下载；下载 PNG 独立解码为 10000×4000 RGBA，Alpha 范围 0–255。101 张小 PNG 部分接收 100 张并真实 Quick 编码完成，100 个有效下载，桌面行高 64px；390px 无横向溢出，预览关闭焦点返回对应行。
- 清空最终工作区后：309/309 位图、105/105 Canvas、204/204 URL，原生通道峰值 1。相关 9 个 Vitest 文件共 121 项通过，`pnpm check` 无诊断；CN/Global 生产静态守卫与隔离 CN Converter SSG 通过，正式产物仍排除 draft。
- 可重复生成单张样本：`python scripts/generate-image-fixtures.py --megapixels 40 --variant alpha --wide --output ../.validation/converter-c5a/samples/alpha-40.png`；可选 24/36/40/48 与 texture/alpha/noise。需要 Pillow，生成器拒绝向仓库内写入大样本；不参与构建/CI。
- 移动端真实 iOS/Android 未测试，390px 仅验证布局。此次证据来自一台桌面 Chromium，不能承诺所有桌面设备均能完成上限任务；能力探测、失败反馈与较小图片/单项下载回退仍保留。Converter 保持 draft。

## B0 — 基线及接口增量

- 开始时工作区干净，`dev` 与 `origin/dev` 均为 `d9e99b15819fcb78b414c025f470046624ac84e6`，fetch 后未发现更晚提交；没有覆盖用户未知工作。
- A 基线：13 个 Vitest 文件、117 项通过。原 CI 成功：[37953700597](https://github.com/librecosta/tool4furry/actions/runs/37953700597)。当时 Registry 为空，已具备分类、全目录、静态唯一 H1、双地区与五 Lab 隔离。
- 未升级依赖、修改 Astro/StyleX 集成、Provider、Canvas 浮层或状态所有权。
- 最小扩展：`setRecommendedPreset()` 只更换当前格式的推荐基线；`WorkbenchShell.formWidth='wide'` 仅扩大 opt-in Form 内容宽度；FileDropzone 可选 compact 外观及完整选择结果回调。ToolRuntime 统一按环境与 Registry 状态选择工具，不另设预览入口。详情见源码与文件交互文档。

## B1 — 图片核心

`src/tools/image/` 独立承担真实图片结构与原生编解码，不处理 UI 状态。

- `inspectImage(blob)`：单次读取不超过 64 KiB，检查 PNG CRC/块次序与结束、JPEG 段/扫描/EOI、WebP RIFF 长度及图片块。PNG/WebP 的动画结构必须拒绝，文本中的相似字符串不误判。MIME 和后缀不作真实性依据；不支持的格式拒绝。
- EXIF 只读有界 IFD0；`createImageBitmap(..., {imageOrientation:'from-image'})` 是唯一方向变换负责人。按方向交换预期尺寸，避免又手工旋转一遍。
- `acceptImage()` 完成结构和真实解码后才交付 source，立即关闭检查位图。工具持有 File/Blob，无上传/持久存储。
- `detectCapabilities()` 分别实际编码 PNG/JPEG/WebP，再检查非空、MIME、结构、尺寸和回解码；输入解码能力与输出编码能力不混同。不支持 WebP 时保守选可用 PNG；失败格式禁用并可重试。
- `encodeImage()` 保持原尺寸，JPEG 默认白底并支持合法 #RRGGBB。每次真实导出重新验证 MIME、实际结构、回解码和尺寸。PNG fallback 不作为 WebP 成功，不能改后缀伪装。
- `ImageResources` 仅是实例内所有权计数与释放入口；没有全局 Store。位图 close，Canvas 归零；Converter 持有原图缩略图 URL 并供预览复用，关闭 Dialog 不撤销它；替换/移除/卸载时释放原图 URL，结果变更时释放输出 URL，同 Blob 的直通输出共用原图 URL。计数平衡不是操作系统堆内存回落的证明。

原生 API 不能硬取消正在进行的 `toBlob()`。实例内 `SerialJobs` 至多一个重型操作，同 key 仅替换等待任务；B3-B1 为每个文件使用独立 accept/encode key，避免不同文件相互覆盖。45 秒 watchdog 只让当前任务失败，保留后续 FIFO；原生调用真正结束前不释放运行槽、不并发重试。未采用 Worker/WASM 或通用任务池。

## V0.5-B3-B1 — 批次核心与命名

`ConverterSession.add(files)` 创建独立任务；批次持有共享参数，任务持有稳定 ID/加入时序号、File、校验源、请求版本、结果及错误。`generate(id?)`、`retry(id)`、`cancel(id)`、`remove(id?)` 按任务工作。`snapshot.processing/source` 仅为现有单文件 UI 的首个有效任务投影；正式 Dropzone 仍只接 `select(file)` 的两阶段替换，不开放多文件导入。Quick 自动排队，Advanced 主动处理；模式切换不编码。参数变化立即撤下过期 Blob，任务版本及存在性共同隔离晚到结果。解码/Canvas 的 finally 释放继续属于 Image Core，URL 仍由挂载的工具视图通过 useOwnedUrl 管理。

`src/tools/file-naming.ts` 是无副作用的共享命名函数：本地毫秒时间、批内单调序号、清理后的原名称与实际输出扩展名，最终最多 180 UTF-8 字节。Session 创建时固定批次时间并生成独立 UUID；删除、失败、重试和替换不复用序号。Advanced 标签最多 40 UTF-8 字节，Quick 忽略标签，切回 Advanced 恢复最近合法偏好。`session.filename(id)` 是当前下载名入口；ImageResult.suggestedFilename 只保留不带标签的标准建议，不用于替代实时命名。没有 ZIP、批量 UI 或新的资源缓存。

## V0.5-B3-B2 — 多文件与文件夹导入

V0.5-B3-B2 当前入口已改为多文件追加及原生文件夹选择（不支持时回退普通选图），取代上文 B3-B1 的单文件 UI。`session.add()` 统一用 metadata 检查 20 文件、100 MiB 总量、20 MiB 单项预算；已有 validating/error 任务同样占额度，部分接收并按原因汇总。文件夹按完整相对路径稳定排序，真实格式、尺寸和解码仍由串行 Image Core 验证。`controls` 是统一参数快照；`processing/source/select` 仅保留旧核心契约兼容，正式 UI 不再依赖首项投影或替换路径。

每个 `ConverterTaskRow` 用 useOwnedUrl 独立持有原图/有效输出 URL，关闭预览复用、结果过期及移除/清空/卸载释放；直通输出仍共用该行原图 URL。预览按任务 ID 装配并恢复焦点，任务删除后回到添加入口。Advanced“转换全部”只启动当前待处理任务（包含点击时正在验证的文件），已有 ready 结果不重复编码。清空或移除最后一项后，下次合法导入创建新的 UUID/本地毫秒时间/序号，旧批次原生操作仍须真正结束才释放串行通道。未实现 ZIP 或目录写入。

## V0.5-B3-B3 — ZIP 交付与初始化

多任务结束后，设置区提供当前成功结果的 ZIP（单项失败不阻断，未完成/过期/零有效结果禁止）。点击才动态加载 `zip.ts` / fflate 0.8.3 的 Zip + ZipPassThrough；按稳定序号、实时安全名称放在根目录，逐 1 MiB 读取 Blob，无重复压缩。预检包含 UTF-8 文件名、头、数据描述符和目录，输出时再次限制实际 ZIP 字节为 128 MiB。输入分块不代表零内存：输出块和最终 Blob 仍需浏览器内存，失败保留单项下载。临时 URL 在交付后撤销，卸载清理计时器、URL 和打包取消状态。

不可变 Session view 本身作为一致性标识，包含批次、任务/结果请求版本、Blob、统一参数和标签；任何发布的新快照（包括改动后改回）都会取消旧打包，并在真正触发下载前再次核对。无需改动串行转换调度。正常能力检测不再插入提示段落，格式选项禁用后以 150ms 颜色/透明度过渡恢复；不支持原因放在 title/ARIA，失败或无可用格式才显示错误及重试。减少动态效果时关闭过渡。

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
- Issue #3：Vite 在跨模块 status 检查折叠前发现动态 import，会留下草稿 chunk；配置将 Registry 的 status/regions 投影为编译期常量，让加载器在依赖发现前排除不可用实现。唯一人工发布标记仍是 Registry status，不另改 loader 开关。
- `/tools/[slug].astro` 在 DEV 包含地区可用草稿、生产只包含 published；统一 ToolIntro、ToolGuide、ToolRuntime + Provider + lazy + Error Boundary，draft 页面 noindex。
- Astro-only `image-converter-content.ts` 提供双语 title/description、唯一静态 H1、简介、步骤、限制、FAQ。React 不导入长文；正式路由仍按本地区 published 过滤。
- `verify-build.mjs` 保留全部 A 守卫，并排除旧工具路径、DEV diagnostics 与未发布 Converter JS。
- `node scripts/verify-converter-fixture.mjs cn/global` 在仓库外隔离源码副本中只将 status 改为 published，保留真实配置与 loader，验证发布单一开关及正式静态页；输出 `../.validation/converter-v04b/ssg/`。工作区 Registry/status/loader 不变，**仅测试、绝不部署，不算公开发布门禁通过**。
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

1. `pnpm dev` → `/tools/image-converter/`：导入透明 PNG，等 WebP ready，下载并独立确认格式；点 PNG 检查“未重新编码”。
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
