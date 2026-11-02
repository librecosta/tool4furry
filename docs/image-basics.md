# 基础图片工具 · V0.7-B

Image Compressor、Image Watermark 与 EXIF Metadata 为 CN/Global、zh/en **Published**；Comic Page Organizer 仍为 **Draft**，只在 DEV 出现。沿用 Registry、显式字面量 Loader、Astro 静态正文与 Form Wide；没有新发布门、应用根或全局 Store。首页与创作身份使用既有人工精选和 Registry 过滤，正式站点当前为六款 Published 工具。

| 工具与路径（Draft 仅 DEV） | 当前能力 |
| --- | --- |
| [Image Compressor](../src/tools/image-compressor/ImageCompressor.tsx) · `/tools/image-compressor/` | 单张/批量与文件夹，快速强度或高级质量/目标大小/最长边，PNG/JPEG/WebP 与受支持桌面设备上的 AVIF 输出，原图/结果比较、实际大小与节省比例、独立下载和 ZIP。JPEG/WebP 目标大小只进行有界尝试，未达到或变大均如实显示。 |
| [Comic Page Organizer](../src/tools/comic-page-organizer/ComicPageOrganizer.tsx) · `/tools/comic-page-organizer/` | 多图/文件夹，行优先紧凑画廊、拖排/键盘排序、稳定自然顺序重置、多选删除与逐页阅读。漫画专用预算和有界缩略图；ZIP/CBZ 默认保留原字节，支持自定义页名前缀及可选 JPEG/PNG/WebP/受限 AVIF 逐页转换、快速/高级质量设置及流式写入；PDF 独立按原图比例导出。默认来源元数据可能保留。 |
| [Image Watermark](../src/tools/image-watermark/ImageWatermark.tsx) · `/tools/image-watermark/` | 快速/高级共用参数草稿和重置，单张/批量文字或位图/安全静态 SVG Logo，单点旋转与三档密度平铺，实时有界预览及颜色弹层，PNG/JPEG/WebP/受限 AVIF 输出、单项下载和 ZIP。使用已有本地字体，不提供图层编辑器。 |
| [EXIF Metadata](../src/tools/exif-metadata/ExifMetadata.tsx) · `/tools/exif-metadata/` | 单张/批量 JPEG/PNG/WebP 与文件夹导入，选中文件查看紧凑斑马纹元数据表及隐私标记，逐项或全部无损清理、前后字段对照、单项下载与成功结果 ZIP。未知结构明确失败并支持重试，无需清理的验证结果也可下载；列表提供缩略图与原图查看，不提供清理前后视觉对比。 |

四模块分别拥有 Session、稳定任务/结果版本与资源；复用 Image Core、ImageResources、设备 limits、SerialJobs 和既有 ZIP。重型原生操作即使已过期也须真实完成后释放通道；取消、删除、清空和参数改变撤销下载/ZIP 快照，结果累计有界。不同时解码全部原图。原始文件不上传、不持久保存。

压缩和水印输出遵守 `privacy-v1` 并复检实际格式/MIME、尺寸与完整可解码性。漫画归档按用户选择保留原字节，不能宣称清除了元数据；CBZ 是标准 ZIP，阅读器的 AVIF/WebP 支持仍取决于阅读器。元数据清理直接使用 `cleanImageMetadata()`，保留方向及受支持色彩信息，不保证清除全部隐藏信息、隐写或像素水印。

EXIF 读取使用固定 `exifr@7.1.3`，仅向解析器传入经现有容器检查的有界 TIFF/EXIF 块，限制读取字段、关闭缩略图与 MakerNote。JPEG/PNG/WebP 共用此路径；它不修改容器。完整 [MIT 通知](../src/tools/exif-metadata/exifr.NOTICE.txt) 仅从工具懒加载入口分发。

EXIF 本地手动验收示例及步骤见 [夹具说明](../tests/fixtures/images/metadata/README.md#exif-metadata-手动验收-jpeg)：JPEG 真实包含虚构设备、拍摄时间、方向及 GPS，不进入站点公开资源。

人工入口：`pnpm dev` 后 CN `http://127.0.0.1:4321/tools/{id}/`，Global `http://127.0.0.1:4322/tools/{id}/`；同地区次语言继续使用 `/en/` 或 `/zh/`。固定端口不变。各模块只跑必要局部测试，集成后统一类型检查、跨模块测试与双地区构建；完整测试沿用现有 CI，无新增矩阵或工作流。

L3 边界：真实 iOS/Android、Firefox/Safari、低端设备及压力测试未完成；Chromium 核心 Smoke 不代表这些平台通过。Comic Page Organizer 后续可独立审计。未部署、未创建 Tag/Release。以下保留历史阶段记录，各工具最终资格见对应 D1 小节。

2026-11-01 集成验证：`pnpm check` 零诊断，18 个相关测试文件的 212 项定向断言通过（包含资源补丁复跑）；CN/Global 构建与静态守卫通过，每区仍为 17 HTML、16 个公开 URL、三款 Published。四款新工具、专属实现及 exifr 通知均被生产发布门排除。没有运行无关专项夹具或本地全量测试，完整测试由既有 GitHub Actions 执行。

真实 Chromium 核心 Smoke 覆盖 CN 中文 / Global 英文、桌面与 390px 手机视口、亮暗主题。压缩 JPEG → WebP 512×512，下载 173,386 B，节省 42.3% 与界面一致；1 KB 不可达目标明确提示，双文件 ZIP 可完整解码。漫画实际文件夹导入、自然排序、封面置顶、移动/阅读和 ZIP/CBZ 下载通过，归档为 `page-001.png` 起始的零填充页名，顺序与每项原始字节逐一相等。文字水印 PNG 的中心文字及 60% 不透明度、图片水印左上 80×40 和来源 alpha × 50% 不透明度均经像素验证，PNG/JPEG 输出完整解码。EXIF JPEG 从 5,102 B 清理至 4,499 B，设备、GPS、作者等字段移除，方向 6 保留，清理前后解码像素完全相同；PNG/WebP 读取与清理由定向真实容器测试补足。

可复查的本地临时证据在仓库外 `../.validation/v07-b/`（下载路径清单、字节/像素复检 JSON、Chromium 截图），不进入源码或正式产物。此记录仅代表本轮核心 Smoke，不代表完整格式/设备矩阵或 Beta 资格通过。

## Comic Page Organizer · B2-C1（2026-11-02）

工作区改为连续行的轻量 Justified Gallery，10px 间距、约 220px 桌面目标行高和有界内部滚动。普通图片保持完整比例，仅极端长宽缩略图限幅裁切；原图阅读与归档不受影响。图片浮层只保留页码、原始信息和阅读/选择/删除三个操作。视口变化仅重算布局，不创建另一份页面顺序。

鼠标/笔直接拖动，触屏长按后拖动、未激活时保留滑动浏览；支持浮动反馈、插入位置、边缘自动滚动、Escape 取消及隐藏说明的键盘排序。最终顺序唯一来自 `ComicSession.move()`，DOM、页码、阅读器和归档一致。移除独立封面状态，第一页可以正常移动；重置按文件名/相对路径自然排序，同名使用初始导入顺序。排序、删除、追加与清空继续使旧归档快照失效，沿用原字节、串行验证和 URL 所有权。

本轮 4 个定向测试文件共 40 项通过，覆盖行几何、鼠标/长按触控/多指取消/键盘排序、同名重置、错误隔离、移除与卸载释放及归档版本；`pnpm check`（336 文件）零诊断。真实 Chromium 已检查 CN 中文与 Global 英文、桌面和 390px 手机视口、亮暗主题、文件夹导入、鼠标拖排/自动滚动、阅读缩放/焦点返回及删除/清空。实际下载的 ZIP 和 CBZ 均解出 18 张，零填充文件名、当前顺序和每项原文件字节逐一核对一致，PNG 完整解码通过；本地证据在仓库外 `../.validation/comic-c1/`。手机视口中的鼠标拖动不代表真实触屏通过；真实 iOS/Android 长按与滑动冲突、Firefox/Safari 及压力范围仍未测。保持 Draft，不重复无关全量本地测试或双地区构建；完整 CI 沿用既有工作流。

### B2-C1-R1 · 导出与大归档

画廊和拖拽系统不变，浮层顺序为选择/阅读/删除；底部 ZIP（默认）/CBZ/PDF 共用单选和主操作。漫画专用预算见 [`limits.ts`](../src/tools/comic-page-organizer/limits.ts)，不改变已发布工具的 ImageLimits。导入只执行有界容器检查；IntersectionObserver 请求附近页面的 480px 缩略图，缓存按条数和字节淘汰，原图 URL 只在阅读弹窗期间持有。缩略图、逐页完整解码与导出仍共用唯一 SerialJobs，删除/清空/卸载释放所有权，不能把容器检查当作完整解码成功。

新 [`archive/stream-zip.ts`](../src/tools/archive/stream-zip.ts) 仅提供安全的无压缩 ZIP 写入接口，保留扁平名称、同名冲突、32-bit ZIP 边界和逐块背压。已发布工具的 `packZip()` 未改动。普通 Blob 下载仍有独立上限；超过时仅在支持 File System Access 的安全上下文中，由用户点击触发保存选择器，逐块写入本地临时文件。取消、失败、超时或列表变更会 abort，不关闭提交半成品；串行通道等待实际 I/O/原生操作结束。最终原子 close 的短暂提交阶段锁定列表与取消入口，避免提交过程中改变快照；已提交的文件属于明确完成的旧导出，不可能在用户之后修改排序时追溯撤回。

PDF 仅在导出时加载固定 `pdf-lib@1.17.1`，由独立页数、来源字节、累计像素和输出预算限制。JPEG/PNG 直接嵌入，显式应用全部 EXIF 方向矩阵；WebP/受支持 AVIF 逐页完整解码为 PNG 后嵌入，不持有多张临时 Bitmap/Canvas。PDF 页面保留图像比例并覆盖整个页面，生成后重新解析页数与尺寸。第三方及传递依赖完整声明随工具的 [NOTICE](../src/tools/comic-page-organizer/pdf-lib.NOTICE.txt) 按需交付；仍为 Draft。ZIP/CBZ 不重新编码、不清理元数据，PDF 不承诺所有格式零重编码或彻底清理隐私。

最终 7 个定向测试文件共 81 项通过，`pnpm check`（343 文件）零诊断，`pnpm install --frozen-lockfile` 通过。未重复本地全量测试、双地区构建或无关专项夹具；完整 CI 沿用既有 GitHub Actions。

本轮实际 Chromium 已导入 320 页约 267MiB JPEG，普通画廊只挂载附近的 28 个缩略图。系统保存选择器写出的 279,568,554 B ZIP 可解压，320 页名称、页序、CRC 与原文件字节逐项一致。普通 Blob ZIP/CBZ 均包含五张有效原图，按调整后顺序逐项保持原字节。真实五页 PDF 覆盖 JPEG 旋转/镜像、透明 PNG、WebP 和受支持 AVIF；Poppler 完整渲染，顺序、尺寸和方向经像素对比验证。原始编码器色彩声明不符合输入子集的 AVIF 明确拒绝，不伪造预览或加入输出。390px 手机视口下格式选择和主按钮无横向溢出。最后的 160 页大 CBZ 保存流程被维护者按 Escape 停止，未继续操作浏览器；大 CBZ 实际落盘、真实系统写入失败/取消后的磁盘状态尚未实测，受控取消、写入失败、快照失效和同一 ZIP 写入路径由定向测试覆盖。证据保存在仓库外 `../.validation/comic-r1/`。真实移动设备、其他浏览器、接近最大预算和长时间压力范围未测；手机视口不代表真机触控或 File System Access 支持。

### B2-C1-R2 · 页名与可选转换

ZIP/CBZ 默认仍为 `page-001.ext` 和原始字节，Unicode 前缀经长度、路径、控制字符及 Windows 名称校验。底部快速/高级只切换参数展示，保留前缀、逐格式质量与 JPEG 背景草稿；无效输入阻止归档。推荐质量引用 Converter 参数，PNG 不显示有损质量，AVIF 按固定设备和全体页面尺寸禁用，CBZ 的 WebP/AVIF 仅作阅读器兼容提示。PDF 忽略归档前缀及统一图片设置，继续原有嵌入与预算。

`writeZip()` 在原有存储 ZIP 写入器上增加逐页 Blob 工厂，不预生成整批转换结果。生成、实际输出复检与逐块写入共用 Session 串行通道；等待当前页面写完后才生成下一页。转换调用现有 `encodeImage()`、`privacy-v1` 与 `AvifEncoder`，不缩放图片；PNG/JPEG/WebP 的 Bitmap/Canvas 及时释放，AVIF 取消/超时终止既有 Worker，卸载清理编码器。实际累计字节和 ZIP32 上限控制输出，不能以来源大小估计转换归档。支持直接保存时转换主动经保存选择器流式写入；无该能力时仅提供受限 Blob 路径，实际超限中止。参数或顺序变更撤销旧 ZIP/CBZ 快照，PDF 仅响应页面变更；原子 close 的提交边界不变。

本轮 6 个 Comic 定向测试文件共 94 项通过，`pnpm check`（346 文件）零诊断，未重复本地全量测试或两地区构建。真实 Chromium 已导入并重排 33 张含透明 PNG、方向 JPEG、EXIF JPEG 和静态 AVIF 的图片，非法前缀明确禁用，中文前缀 ZIP 实际下载后逐项检查 UTF-8 页名、顺序、CRC 和原始字节一致。快速/高级、质量与 JPEG 背景字段已在实际页面操作；统一转换的系统保存验收尚未完成时，维护者按 Escape 停止浏览器操作，之后未继续。JPEG/PNG/WebP/AVIF 转换归档的真实落盘、透明背景/方向像素结果、桌面与手机布局完整验收仍待确认，不能将复用内核的历史证据或 mock 测试视为本轮真实转换通过。定向测试覆盖 30 页转换、按页背压、实际字节预算、取消、失效、AVIF 资格、Unicode 名称及 PDF 独立性；样本及下载核对证据在仓库外 `../.validation/comic-r2/`。正式 SEO 本轮未改，Comic 继续 Draft。

## Image Compressor · B1-C1（2026-11-01）

空列表只显示上传和文件夹入口；导入后顶部追加/清空，桌面约 65% 图片列表与 35% 设置，手机列表在前、设置在后。快速/高级复用现有参数模式样式并保留各自草稿；只有实际编码参数变化才撤销有效结果。快速三档强度按格式映射，均衡值引用 Converter 推荐参数；高级提供质量、JPEG/WebP 单项大小目标、最长边和 JPEG 背景。PNG 不显示有损质量，AVIF 不允许目标搜索。未提交的非法输入不能进入处理状态或误下载旧结果。

继续使用唯一 `CompressorSession` / `SerialJobs`，AVIF 直接复用已有 `AvifEncoder`、ST Worker/WASM、设备/输出预算、Canvas 输出资格与完整复检。普通格式不启动 AVIF Worker；AVIF 取消、改参数、删除、卸载或超时会中止对应操作，原生步骤真实完成前不释放串行通道。超限不会静默缩小或替换格式，用户可主动设置最长边。未改公共编码器、其他工具、Registry/Loader 或固定 DEV 端口，压缩器仍为 Draft。

验证：类型检查通过；压缩计算、Session、UI 与既有 AVIF Worker 的定向测试覆盖格式预设、独立草稿、批量/重试、失效/ZIP 快照、保守设备禁用和取消/超时回收。真实 Chromium 覆盖 CN 中文 / Global 英文、桌面和 390px 手机视口、亮暗主题、文件夹双图批量及单张处理。下载的 PNG/JPEG/WebP/AVIF 均按文件内容识别并完整解码为 320×240；透明区域在 PNG/WebP/AVIF 保留，JPEG 填白。AVIF 下载 898 B，大图 3000×2000 明确拒绝后，主动限制最长边导出为 1000×667。双文件 WebP ZIP 与部分失败时的 AVIF ZIP 均可解压并逐项解码，只包含当前成功项。噪点 JPEG 转 PNG 变大、1 KB 目标实际为 42,726 B 时均如实提示。

本地证据在 `../.validation/compressor-c1/`，不进入源码。本轮未在本地重复全量测试、双地区构建或多工具专项夹具，完整验证沿用推送后的既有 CI。AVIF 取消/超时通过受控 Worker 测试验证；真实手机触控、Firefox/Safari、低端设备与压力范围仍属未测 L3，手机视口不代表真机通过。

B1-C1-R1 将高级最长边改为工具局部的尺寸档位步进器，默认不限制；按钮和方向键立即提交，边界禁用并保留键盘焦点。移除最长边与目标大小的重复提示，仍保留真实异常及未达目标/变大状态。定向测试、类型检查和一次 Chromium 交互验收覆盖档位、草稿恢复与结果失效；实测大图输出 1920×1280，小图保持 320×240。

## Image Compressor · B1-D1 Beta 资格收尾（2026-11-02）

中英文 SEO 按定稿更新，分别保留 3 项步骤、3 项限制与 4 项 FAQ；短元数据明确批量、本地处理、目标大小及 AVIF 的适用边界。C1-R1 步进器完整保留，未改压缩引擎、资源生命周期或其他工具业务。

L2 复用 B1-C1 四格式、目标未达成、输出变大、设备/尺寸拒绝及取消/超时证据，并重新完整解码其实际 PNG/JPEG/WebP/AVIF 下载。最新 Chromium Smoke 覆盖 CN 中文 390px 手机视口的文件夹双图导入、快速批量、原图/结果比较与 ZIP 下载；两项 WebP 均可解压和完整解码。高级步进器按钮及键盘操作正常，改尺寸立即撤销旧结果与 ZIP，文件集合保留，无横向溢出。Global 英文 Published 静态产物实际执行 AVIF 编码、比较与下载：898 B、320×240、透明像素保留，完整解码通过，浏览器无错误。手机视口不代表真实移动设备通过。

最终集成 `pnpm check` 零诊断，170 项相关测试通过（含补齐旧 Published 预期后的 19 项工具导航测试）；CN/Global 各构建一次，均为 19 HTML、18 个公开 URL、四款 Published 工具及双语页面。实际产物核对首页精选、四个关联创作身份、目录、相关推荐、Canonical/hreflang、Sitemap/llms.txt 与无 Draft noindex；其他三款 Draft 的路由和专属资源继续排除。两地区共享单份按需 AVIF ST Worker/WASM，分发通知与源码完整条款一致，静态正文未进入客户端模块。

既有 [B1-C1 CI](https://github.com/librecosta/tool4furry/actions/runs/41319862527) 已通过；完整测试由本次推送触发的既有 GitHub Actions 执行，最终结果以对应提交工作流为准。未发现发布阻断项，依据维护者本任务授权提升源码 Published，V0.7-B1 收尾；未部署、未创建 Tag/Release。真实 iOS/Android、Firefox/Safari、低端设备和压力测试仍为未测 L3。

可复查的本地下载复检、产物检查 JSON 与 Chromium 截图位于仓库外 `../.validation/compressor-d1/`，结合 C1/R1 历史证据使用，不进入源码或公开资源。

## EXIF Metadata · B4-C1（2026-11-02）

沿用 Form Wide，顶部追加图片/文件夹与清空，桌面左侧任务、右侧当前文件的元数据详情，手机自然上下排列。原生表格使用主题中性色交替行、统一内边距和列宽，保留隐私标记、长值换行及小屏横向滚动；清理前两列，成功后展示前后值。移除图片预览、比较弹窗和相关原图/结果 URL。

`MetadataSession` 扩展为稳定 ID 的文件集合，检测与清理共用唯一 `SerialJobs`。复用 `cleanImageMetadata()`、格式/方向/尺寸及完整解码复检，不重编码；失败隔离，逐项重试，未改变的验证结果保持下载资格。输入/累计结果受现有设备预算约束，删除中的原生操作仍计入准入，超时不提前释放通道。结果只保留 Blob，下载 URL 短暂持有并在删除/清空/卸载时释放。ZIP 使用既有打包预算与稳定命名，只接受已结束且当前有效的成功项；文件/结果变化中止快照，单纯选择文件不撤销归档。EXIF 局部解析器改用兼容 CommonJS 的默认导入，避免 DEV 服务端命名导入失败回退；解析规则未变。

验收：24 项 EXIF 定向测试与类型检查通过。真实 Chromium 覆盖 CN 中文桌面、Global 英文 390px 手机视口及亮暗主题，文件夹/多选导入、单项/批量清理、失败重试、相邻选择、清空、下载与 ZIP。五文件批次中两项清理、一项无需清理、损坏输入与未知 APP1 清理各失败；ZIP 只包含三项成功文件，逐项解压、真实 MIME/格式、方向和完整解码通过，清理前后像素逐字节一致。`manual-exif.jpg` 从 23,159 B 到 22,933 B，设备/时间/GPS 移除，方向 6 保留；普通 JPEG 保留原始全部字节。下载和截图证据在仓库外 `../.validation/exif-c1/`。

仍为 Draft；未改 SEO 正文、公共图片内核、其他工具或发布架构。本地未重复全量测试、双地区构建或大型矩阵，完整检查沿用既有 CI。手机视口不是实际触控设备；真实 iOS/Android、Firefox/Safari 和压力范围仍未验证。

### B4-C1-R1 文件列表精修（2026-11-02）

文件行使用完整 Lavender 浅色选中背景、48px 原图缩略图、截断文件名及状态，操作间隔 8px；大小、尺寸与清理前后字节数只保留在右侧元数据表，移除详情标题下重复文件名。Eye 入口仅在原图检查通过后可用，复用 `FilePreviewDialog` / `ImagePreviewViewport`，只查看原图，支持缩放、平移、适应画面与关闭焦点返回。缩略图和打开中的预览各自通过既有 `useOwnedUrl` / `ImageResources` 持有 URL，关闭不撤销缩略图；删除、清空与卸载释放对应资源，不生成结果预览，不改解析、清理或 ZIP。

验收：19 项 UI/Session 定向测试及类型检查通过；真实 Chromium 验证桌面与 390px 手机视口、亮暗主题、长文件名、整行无边框选中态、检测失败禁用预览、原图缩放/键盘平移/关闭焦点、多文件选择/移除/清空与单项清理下载，控制台无错误。资源测试覆盖预览关闭、打开时删除/清空及卸载后的全部 URL 释放；截图与下载记录在仓库外 `../.validation/exif-c1-r1/`。保持 Draft；未重复全量测试或正式构建，真实触控设备与其他浏览器仍未测。

## EXIF Metadata · B4-D1 Beta 资格（2026-11-02）

依据维护者本任务授权通过 L2 审计并提升 CN/Global 源码 Published，V0.7-B4 收尾；未部署。冻结双语 SEO 各为三步骤、三限制、四 FAQ，不新增功能概览；短元数据准确描述受支持字段与本地批量清理。首页维持四张精选卡及原有顺序，既有画家/运营 EXIF ID 经 Registry 自然进入公开展示，其他两款基础工具继续 Draft。

L2 复用 C1/R1 的桌面/手机视口、亮暗主题、文件切换/删除/清空、原图缩放与焦点、过期原生任务和 ZIP 快照资源测试；基线 `479e3e9` 的既有 CI 已通过。本轮 162 项 EXIF/Metadata/发布与发现定向测试、`pnpm check`、CN/Global 正式构建及产物守卫通过，完整 CI 继续由原工作流执行。每地区五款 Published、十个工具语言页面及二十个公开 HTML URL；EXIF 双语正文、H1/Title/Description、OG/Twitter、Canonical/hreflang、目录/相关工具/Sitemap/llms 与实际产物一致，无 Draft noindex，包含按需实现及完整 exifr MIT 通知。其他 Draft/Lab/Fixture 和客户端长文隔离守卫保留。

真实 Chromium 补验 CN 中文桌面文件夹批次：`manual-exif.jpg`、`private.png`、`private.webp` 成功，未知 APP1 安全失败且重试不影响已有结果。逐项下载与 ZIP 解压后复检格式/MIME、完整解码、方向及 ICC；JPEG 23,159→22,933 B、PNG 2,394→1,786 B、WebP 2,296→1,768 B，三项解码像素和压缩图像数据逐字节相同，受支持设备/时间/GPS 字段已移除，JPEG/PNG 方向 6 保留，WebP 方向仍为 1。CN 正式静态预览可加载工具；Global 英文正式预览在 390px 手机视口完成导入、原图预览/缩放、单项清理和下载，输出与已复检 DEV JPEG 字节一致，控制台无错误。未发现阻断问题，不支持/不安全结构明确失败，不回退有损编码。

下载、文件验证 JSON 和截图保存在仓库外 `../.validation/exif-d1/`。L3 未测范围仍为真实 iOS/Android 触控、Firefox/Safari、低端设备及完整性能压力；手机视口不代表真机验证。没有新增工作流、运行大型多工具夹具或改动清理内核。

## Image Watermark · B3-C1（2026-11-02）

快速/高级仅改变参数展示，共用唯一 Settings；模式切换不改参数或撤销有效结果，快速模式提示已配置的高级参数。高级「重置参数」恢复初始设置与字符串草稿，保留图片、选中项和已验证 Logo，实质变更撤销旧结果。文件主内容即选择入口，不再重复提供编辑按钮；文字颜色复用 react-colorful/Popover、局部样式和 MIT 通知，未完成 HEX 不进入有效设置，取消不改已提交颜色。

`drawComposition()` 同时服务预览和最终输出。单点围绕自身中心旋转并按旋转包围盒约束九宫格；平铺在旋转坐标内覆盖原图四角，三档间距，最多 1024 次绘制，超出时增大间距而不改变 Logo 大小。图片仍从方向校正后的原图一次绘制，不改变输出尺寸。

位图 Logo 沿用现有设备分级输入限制，取消旧的独立 4MP/4096px 上限；最终绘制还检查原图位图、输出画布和 Logo 的合计解码额度。仅保留选中原图和 Logo 的有界预览，不持有全部原图 Bitmap。SVG 仅为 Logo：工具局部 XML 白名单重建形状/路径/变换/本地渐变/裁切，限制 256 KiB、512 元素、16 层与路径/数值复杂度；不支持脚本、事件、HTML、动画、image/use、CSS、DTD/实体、外链及其他未列入子集的结构。只向脱离 DOM 的 Image 载入校验后的本地 Blob，按设备预算校验栅格尺寸，绘制后释放临时 URL；失败不使用原始 SVG。复杂 SVG 需先转为受支持位图。

AVIF 直接复用既有 AvifEncoder、ST Worker/WASM、输出资格和完整复检，不加载第二套编码器。设备/尺寸不符明确禁用或失败；参数变更、取消、删除、Logo 替换和卸载中止对应 Worker 操作，原生解码/验证真实结束前仍占用唯一 SerialJobs。普通图片操作不启动 AVIF Worker。保持 privacy-v1、累计结果上限和 ZIP 当前快照，未改 Registry/Loader、SEO 或其他工具业务，仍为 Draft。

本轮验证：`pnpm check` 332 文件零诊断；7 个水印/安全/Session/AVIF Worker/公共 UI/压缩器 UI 定向文件共 122 项通过。真实 Chromium 覆盖 CN 中文和 Global 英文，桌面与 390px 手机视口、亮暗主题、颜色确认/取消、重置与 Logo 保留、文件主内容选择，以及公共 SelectField 在压缩器的键盘关闭和选项间距。两视口无横向溢出。SVG 结构危险输入与超预算素材明确失败，旧结果下载立即撤销。

实际 PNG/JPEG/WebP/AVIF 下载均按文件头识别并完整解码；JPEG 透明角填白，其他格式保留透明度。横竖两图的旋转文字 ZIP、旋转 SVG 平铺 AVIF ZIP 均可解压且尺寸正确，6MP/5000px PNG Logo 导出通过；60% 文字、PNG 来源 alpha×60% 与 SVG 透明度均经像素复检。SVG 只使用校验后的受控 Image 载入，解决 Chromium Blob→ImageBitmap 对 SVG 的读取差异。取消/超时、晚到结果与释放由受控 Worker 和 Session 测试覆盖，不冒称真实设备压力测试。

本地证据在仓库外 `../.validation/watermark-c1/`（实际下载清单、完整解码/像素 JSON 与亮暗截图），不进入公开资源。按任务范围不在本地重复双地区正式构建或全量矩阵，完整 CI 沿用本次推送触发的既有工作流。真实 iOS/Android、Firefox/Safari、低端设备与压力范围仍为未测 L3；手机视口不代表真机触控通过。未提升 Published、未部署或创建 Tag/Release。

## Image Watermark · B3-D1 Beta 资格（2026-11-02）

冻结中英文 SEO 各含三步骤、三限制、四 FAQ；短元数据准确说明文字/Logo、旋转平铺、安全静态 SVG 和受限 AVIF，不承诺兼容全部 SVG 或防止水印移除。复用 C1 的 122 项测试、四格式实际下载、三档密度、高清 PNG Logo、安全拒绝、取消/超时、版本隔离与资源释放证据；基线 `0077fd4` 的 [完整 CI](https://github.com/librecosta/tool4furry/actions/runs/41403639697) 已通过。本轮不改绘制、安全过滤、编码或任务流程。

最新 266 项水印/AVIF/发布与发现定向测试、`pnpm check`（332 文件零诊断）、CN/Global 各一次正式构建及守卫通过。每区六款 Published、十二个工具语言页面、二十二个公开 HTML URL；水印双语静态正文、H1/Title/Description、无 Draft noindex、Canonical/hreflang、目录/相关推荐/Sitemap/llms 均与实际产物一致。首页四张精选与顺序不变，既有画家/动画师/运营水印 ID 由 Registry 自然公开。react-colorful 的共享 CSS/完整 MIT 通知与按需单份 AVIF Worker/WASM 正常分发；Comic 的 Draft 页面/专属实现、Lab/Fixture 及客户端长文继续排除。共享选色器守卫仅识别合法 Published 消费者，不放宽 Draft 私有资源边界。

真实 Chromium 补验 DEV 中文横竖双图 45° 文字平铺与 ZIP；CN Published 静态页面完成快速批量文字 PNG/ZIP、WebP Logo 透明度、原图/结果比较和焦点返回。ZIP 两项分别为 640×400、400×640，均按文件头识别并完整解码；PNG/AVIF 保留透明角，WebP 来源 alpha×60% 的 PNG 中心像素为 `[136,56,87,255]`，符合预期。Global 英文正式产物实际执行安全 SVG、45° 平铺和按需 AVIF：下载 3,213 B、640×400、完整解码通过。390px 手机视口及亮暗主题可用，无横向溢出；对比上下排列、两张实际图片完整加载，切换快速/高级保留有效结果，改透明度立即撤销旧下载/ZIP，重新处理成功。控制台未发现错误。

依据维护者本任务授权完成 L2 源码 Published，V0.7-B3 收尾；完整测试继续由本次提交的既有 GitHub Actions 执行，最终结果以对应提交工作流为准。可复查的下载复检 JSON、构建日志与截图在仓库外 `../.validation/watermark-d1/`，不进入公开资源。L3 未测仍为真实 iOS/Android、Firefox/Safari、低端设备和压力范围，手机视口不代表真机触控通过。没有部署、PR、合并、Tag 或 Release。
