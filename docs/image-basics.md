# 基础图片工具 · V0.7-B

Image Compressor 为 CN/Global、zh/en **Published**；Comic Page Organizer、Image Watermark 与 EXIF Metadata 仍为 **Draft**，只在 DEV 出现。沿用 Registry、显式字面量 Loader、Astro 静态正文与 Form Wide；没有新发布门、应用根或全局 Store。首页与创作身份使用既有人工精选和 Registry 过滤，正式站点当前为四款 Published 工具。

| 工具与路径（Draft 仅 DEV） | 当前能力 |
| --- | --- |
| [Image Compressor](../src/tools/image-compressor/ImageCompressor.tsx) · `/tools/image-compressor/` | 单张/批量与文件夹，快速强度或高级质量/目标大小/最长边，PNG/JPEG/WebP 与受支持桌面设备上的 AVIF 输出，原图/结果比较、实际大小与节省比例、独立下载和 ZIP。JPEG/WebP 目标大小只进行有界尝试，未达到或变大均如实显示。 |
| [Comic Page Organizer](../src/tools/comic-page-organizer/ComicPageOrganizer.tsx) · `/tools/comic-page-organizer/` | 多图/文件夹，自然排序、缩略图网格、拖排/移动、多选删除、追加、封面、逐页阅读，稳定零填充页名的 ZIP/CBZ。原始图片字节保持不变，来源元数据也可能保留。 |
| [Image Watermark](../src/tools/image-watermark/ImageWatermark.tsx) · `/tools/image-watermark/` | 单张/批量文字或图片水印，大小/比例、不透明度、九宫格位置、边距、文字颜色，实时有界预览，PNG/JPEG/WebP 输出、单项下载和 ZIP。使用已有本地字体，不提供图层编辑器。 |
| [EXIF Metadata](../src/tools/exif-metadata/ExifMetadata.tsx) · `/tools/exif-metadata/` | 单张 JPEG/PNG/WebP，真实存在的受支持 EXIF、设备/时间/方向/GPS 等字段与隐私标记，无损清理、基础前后对比、图片预览和下载。未读取的结构明确提示，不能无损清理则拒绝，不静默重编码。 |

四模块分别拥有 Session、稳定任务/结果版本与资源；复用 Image Core、ImageResources、设备 limits、SerialJobs 和既有 ZIP。重型原生操作即使已过期也须真实完成后释放通道；取消、删除、清空和参数改变撤销下载/ZIP 快照，结果累计有界。不同时解码全部原图。原始文件不上传、不持久保存。

压缩和水印输出遵守 `privacy-v1` 并复检实际格式/MIME、尺寸与完整可解码性。漫画归档按用户选择保留原字节，不能宣称清除了元数据；CBZ 是标准 ZIP，阅读器的 AVIF/WebP 支持仍取决于阅读器。元数据清理直接使用 `cleanImageMetadata()`，保留方向及受支持色彩信息，不保证清除全部隐藏信息、隐写或像素水印。

EXIF 读取使用固定 `exifr@7.1.3`，仅向解析器传入经现有容器检查的有界 TIFF/EXIF 块，限制读取字段、关闭缩略图与 MakerNote。JPEG/PNG/WebP 共用此路径；它不修改容器。完整 [MIT 通知](../src/tools/exif-metadata/exifr.NOTICE.txt) 仅从工具懒加载入口分发，Draft 正式构建排除。

人工入口：`pnpm dev` 后 CN `http://127.0.0.1:4321/tools/{id}/`，Global `http://127.0.0.1:4322/tools/{id}/`；同地区次语言继续使用 `/en/` 或 `/zh/`。固定端口不变。各模块只跑必要局部测试，集成后统一类型检查、跨模块测试与双地区构建；完整测试沿用现有 CI，无新增矩阵或工作流。

L3 边界：真实 iOS/Android、Firefox/Safari、低端设备及压力测试未完成；Chromium 核心 Smoke 不代表这些平台通过。其余三款 Draft 后续可独立审计，不互相阻塞资格。未部署、未创建 Tag/Release。以下 V0.7-B / B1-C1 为历史阶段记录，最终 B1 资格见文末。

2026-11-01 集成验证：`pnpm check` 零诊断，18 个相关测试文件的 212 项定向断言通过（包含资源补丁复跑）；CN/Global 构建与静态守卫通过，每区仍为 17 HTML、16 个公开 URL、三款 Published。四款新工具、专属实现及 exifr 通知均被生产发布门排除。没有运行无关专项夹具或本地全量测试，完整测试由既有 GitHub Actions 执行。

真实 Chromium 核心 Smoke 覆盖 CN 中文 / Global 英文、桌面与 390px 手机视口、亮暗主题。压缩 JPEG → WebP 512×512，下载 173,386 B，节省 42.3% 与界面一致；1 KB 不可达目标明确提示，双文件 ZIP 可完整解码。漫画实际文件夹导入、自然排序、封面置顶、移动/阅读和 ZIP/CBZ 下载通过，归档为 `page-001.png` 起始的零填充页名，顺序与每项原始字节逐一相等。文字水印 PNG 的中心文字及 60% 不透明度、图片水印左上 80×40 和来源 alpha × 50% 不透明度均经像素验证，PNG/JPEG 输出完整解码。EXIF JPEG 从 5,102 B 清理至 4,499 B，设备、GPS、作者等字段移除，方向 6 保留，清理前后解码像素完全相同；PNG/WebP 读取与清理由定向真实容器测试补足。

可复查的本地临时证据在仓库外 `../.validation/v07-b/`（下载路径清单、字节/像素复检 JSON、Chromium 截图），不进入源码或正式产物。此记录仅代表本轮核心 Smoke，不代表完整格式/设备矩阵或 Beta 资格通过。

## Image Compressor · B1-C1（2026-11-01）

空列表只显示上传和文件夹入口；导入后顶部追加/清空，桌面约 65% 图片列表与 35% 设置，手机列表在前、设置在后。快速/高级复用现有参数模式样式并保留各自草稿；只有实际编码参数变化才撤销有效结果。快速三档强度按格式映射，均衡值引用 Converter 推荐参数；高级提供质量、JPEG/WebP 单项大小目标、最长边和 JPEG 背景。PNG 不显示有损质量，AVIF 不允许目标搜索。未提交的非法输入不能进入处理状态或误下载旧结果。

继续使用唯一 `CompressorSession` / `SerialJobs`，AVIF 直接复用已有 `AvifEncoder`、ST Worker/WASM、设备/输出预算、Canvas 输出资格与完整复检。普通格式不启动 AVIF Worker；AVIF 取消、改参数、删除、卸载或超时会中止对应操作，原生步骤真实完成前不释放串行通道。超限不会静默缩小或替换格式，用户可主动设置最长边。未改公共编码器、其他工具、Registry/Loader 或固定 DEV 端口，压缩器仍为 Draft。

验证：类型检查通过；压缩计算、Session、UI 与既有 AVIF Worker 的定向测试覆盖格式预设、独立草稿、批量/重试、失效/ZIP 快照、保守设备禁用和取消/超时回收。真实 Chromium 覆盖 CN 中文 / Global 英文、桌面和 390px 手机视口、亮暗主题、文件夹双图批量及单张处理。下载的 PNG/JPEG/WebP/AVIF 均按文件内容识别并完整解码为 320×240；透明区域在 PNG/WebP/AVIF 保留，JPEG 填白。AVIF 下载 898 B，大图 3000×2000 明确拒绝后，主动限制最长边导出为 1000×667。双文件 WebP ZIP 与部分失败时的 AVIF ZIP 均可解压并逐项解码，只包含当前成功项。噪点 JPEG 转 PNG 变大、1 KB 目标实际为 42,726 B 时均如实提示。

本地证据在 `../.validation/compressor-c1/`，不进入源码。本轮未在本地重复全量测试、双地区构建或多工具专项夹具，完整验证沿用推送后的既有 CI。AVIF 取消/超时通过受控 Worker 测试验证；真实手机触控、Firefox/Safari、低端设备与压力范围仍属未测 L3，手机视口不代表真机通过。

B1-C1-R1 将高级最长边改为工具局部的尺寸档位步进器，默认不限制；按钮和方向键立即提交，边界禁用并保留键盘焦点。移除最长边与目标大小的重复提示，仍保留真实异常及未达目标/变大状态。定向测试、类型检查和一次 Chromium 交互验收覆盖档位、草稿恢复与结果失效；实测大图输出 1920×1280，小图保持 320×240。

## Image Compressor · B1-D1 Beta 资格收尾（2026-11-02）

中英文 SEO 按定稿更新，分别保留 3 项步骤、3 项限制与 4 项 FAQ；短元数据明确批量、本地处理、目标大小及 AVIF 的适用边界。C1-R1 步进器完整保留，未改压缩引擎、资源生命周期或其他工具业务。

L2 复用 B1-C1 四格式、目标未达成、输出变大、设备/尺寸拒绝及取消/超时证据，并重新完整解码其实际 PNG/JPEG/WebP/AVIF 下载。最新 Chromium Smoke 覆盖 CN 中文 390px 手机视口的文件夹双图导入、快速批量、原图/结果比较与 ZIP 下载；两项 WebP 均可解压和完整解码。高级步进器按钮及键盘操作正常，改尺寸立即撤销旧结果与 ZIP，文件集合保留，无横向溢出。Global 英文 Published 静态产物实际执行 AVIF 编码、比较与下载：898 B、320×240、透明像素保留，完整解码通过，浏览器无错误。手机视口不代表真实移动设备通过。

最终集成 `pnpm check` 零诊断，151 项相关测试通过；CN/Global 各构建一次，均为 19 HTML、18 个公开 URL、四款 Published 工具及双语页面。实际产物核对首页精选、四个关联创作身份、目录、相关推荐、Canonical/hreflang、Sitemap/llms.txt 与无 Draft noindex；其他三款 Draft 的路由和专属资源继续排除。两地区共享单份按需 AVIF ST Worker/WASM，分发通知与源码完整条款一致，静态正文未进入客户端模块。

既有 [B1-C1 CI](https://github.com/librecosta/tool4furry/actions/runs/41319862527) 已通过；完整测试由本次推送触发的既有 GitHub Actions 执行，最终结果以对应提交工作流为准。未发现发布阻断项，依据维护者本任务授权提升源码 Published，V0.7-B1 收尾；未部署、未创建 Tag/Release。真实 iOS/Android、Firefox/Safari、低端设备和压力测试仍为未测 L3。

可复查的本地下载复检、产物检查 JSON 与 Chromium 截图位于仓库外 `../.validation/compressor-d1/`，结合 C1/R1 历史证据使用，不进入源码或公开资源。
