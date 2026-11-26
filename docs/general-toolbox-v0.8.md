# V0.8 通用工具初版

两批共 22 款工具（15 + 7）；PDF Merge / PDF Split / Images to PDF / ZIP Manager / Batch File Renamer / File Hash / Text Cleaner / Text Diff / Subtitle Tools / JSON Formatter / URL & Base64 / Timestamp Converter / Color & Contrast / Audio Trimmer / Markdown Editor / Video Frame Extractor / CSV / JSON Converter 已获得 CN/Global Published 源码资格，其余 5 款保持 Draft。加上七款既有 Published 图片工具，共 29 款（24 Published / 5 Draft）。第二批基于第一批本地提交 `e7cd6bf` 继续，未覆盖未推送成果。DEV 入口：CN `http://127.0.0.1:4321/tools/`、Global `http://127.0.0.1:4322/tools/`；非默认语言分别使用 `/en/tools/`、`/zh/tools/`。生产不包含这些 Draft 路由或专用实现。

## Video Frame Extractor — V0.8-B17-D1

- B17-D2 完成双语静态 SEO 与正式产物验收，取得 CN/Global Published 源码资格。两地区各生成 46 个双语工具详情页。视频工作区、Worker、样式及 NOTICE 按需交付。[B17-D2 正式产物验收](evidence/b17-video/README.md#b17-d2-正式产物验收)

- 工作区包括文件信息条、可播放及逐帧定位的播放器、提取设置和可追加的帧画廊。窄屏按此顺序纵向排列。
- 工具私有 Worker 使用 Mediabunny 1.66.3 BlobSource 按需读取最多 2 GiB 的本地视频，无固定时长上限。时间轴使用相对显示时间，逐帧操作使用真实呈现时间戳，暂停预览与单帧提取共用该时间戳。原生播放不可用时仍可浏览和提取受支持的帧。
- 间隔可按秒或采样 FPS。数量模式使用 `start + i × (end − start) / N`，每次在半开区间内定位当前显示帧，并合并同帧采样。逐帧模式顺序处理半开区间内的实际帧，并丢弃起点之前由解码预卷返回的帧。任务取消会终止 Worker，已生成画廊不受后续定位或输出设置影响。
- PNG、JPEG、WebP 默认使用显示分辨率，尺寸预设保持宽高比且不放大。单图与联系表各受 40 MP 画布预算约束。画廊最多 300 帧及 256 MiB，缩略图单独限尺寸。联系表按时间排列，列数、尺寸、时间戳和格式可配置。
- ZIP Only 逐帧编码并通过 fflate Store 写入，支持直接文件写入及 256 MiB 的 Blob 回退。当前 fflate 不写 ZIP64，归档最多 65,534 项且小于 4 GiB。Mediabunny 的完整 MPL-2.0 NOTICE 和现有 fflate MIT NOTICE 随工具交付。[浏览器与独立文件复检](evidence/b17-video/README.md)

## Markdown Editor — V0.8-B16 一体式编辑与 Beta 资格

- 同一外壳提供格式工具栏、CodeMirror 6 源码区、连续预览区和状态栏。桌面默认分栏，窄屏默认编辑。视图切换保留文档、选区和撤销状态，分隔线可拖动、键盘调整及恢复等宽。同步滚动由 Marked 块的源码行和两侧实际布局位置插值，预览过期或单栏时暂停。
- Marked 和 DOMPurify 提供 GitHub 风格的 Markdown 与安全预览。代码语言按需高亮，GitHub Alerts 保留独立标题及图标。预览中的 KaTeX 按需加载并关闭信任模式。预览默认加载合规的 HTTP/HTTPS Markdown 图片，关闭开关后显示 Alt 占位。开关在当前工作区会话内有效。
- 本地导入支持 UTF-8 的 `.md`、`.markdown` 和 `.txt`。覆盖未保存修改前需确认。标题栏文件名可直接编辑，下载按所选格式使用相应扩展名。Markdown 直接取自编辑器源码，按 LF 作为换行符。HTML 复制和下载在交付时重新生成安全内容，下载含内联排版和原生 MathML，可离线打开。HTML 保留图片占位。
- 自动预览在 160,000 UTF-16 单元以上暂停。手动预览和 HTML 导出各以 1,200,000 源码单元、8,000 个解析 Token 和 2,000,000 HTML 单元为预算。超预算明确反馈，源码仍可编辑和导出。状态栏按 UTF-16 单元统计，UTF-8 表示文件编码。
- B16-D2 增加双语静态指南，Markdown Editor 获得 CN/Global Published 源码资格。两个地区各生成 44 个工具详情页。工作区、渲染器、Markdown 语言与查找扩展仅随编辑器加载。KaTeX 预览样式与字体按需加载。
- Markdown 语言 6.5.2、查找 6.7.2、Lezer Markdown 1.8.1 和 KaTeX 0.19.1 维持锁定。工具使用 `rel="license"` 引用构建中交付的 [Markdown NOTICE](../src/tools/markdown-editor/dependencies.NOTICE.txt) 和 [CodeMirror NOTICE](../src/ui/text-editor/codemirror.NOTICE.txt)。正式产物浏览器验证见 [B16-D2 验收记录](evidence/b16-markdown/design-qa.md#b16-d2-正式产物验收)。

## Audio Trimmer — V0.8-B15 波形与 Beta 资格

- 全宽时间轴包含文件信息、双声道波形包络、缩放和局部细化、可移动选区及试听。保留/删除、样本索引、最终输出淡化和时长共用裁切计划。删除保留前后两段的原始顺序，试听音量仅作用于播放器。
- 工具私有 Worker 用 BlobSource 和 AudioSampleSink 按需读取与解码 512 MiB 以内的单声道和立体声音频。波形全览保留 8,192 组双声道合并最小/最大值，放大后解码可见时间段。WaveSurfer 只接收预计算峰值与时长，试听通过有界 Web Audio 调度。
- AudioSampleSource 与 StreamTarget 仅处理裁切范围并等待背压。默认 MP3 192 kbps，另支持 WAV PCM16、24-bit FLAC，以及原生编码能力支持时的 AAC/M4A 与 Opus/OGG。发生兼容转换时显示目标采样率。超过 256 MiB 内存预算的估算输出使用浏览器直接写入能力。
- B15-D2 进入 CN/Global Published，新增双语静态指南。Mediabunny 与编码扩展仍为 1.66.3，WaveSurfer 仍为 8.1.0。音频实现、样式、同源 Worker、WASM、NOTICE 及 MP3 重建材料由 Audio Trimmer 按需交付。已核对锁定 WASM 与 LAME 源码，通过独立 Worker 的本地替换验证实际 MP3 下载。[验收与许可记录](evidence/b15-audio/README.md#b15-d2-production-builds)

## Color & Contrast — B14-D2 SEO 与 Beta 资格

- 前景和背景可用 HEX、RGB 或 HSL 输入。点击色块打开颜色浮层，在支持 EyeDropper 的浏览器中也可从屏幕取色。每侧独立显示并复制三种格式，交换配色保持对比度，重置恢复默认配色。页面支持双语，预览使用固定英文示例。
- 工具处理不透明 8-bit sRGB。检测表按未舍入比值评估普通文字、大号文字和 UI 组件及必要图形。比值从下方舍入到阈值时以 `<` 标明，例如 `< 4.50:1`。任一侧输入无效时清除对比度和修正建议，有效侧仍可独立使用。阈值见 [WCAG 2.2 SC 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)、[SC 1.4.6](https://www.w3.org/WAI/WCAG22/Understanding/contrast-enhanced.html) 和 [SC 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)。
- 选定 3:1、4.5:1 或 7:1 后，可沿固定 HSL 色相和饱和度的明度方向查找单侧调整建议。候选量化为 sRGB 后复核实际对比度，只有主动点击应用才替换颜色。全部颜色计算在本地完成。
- Color & Contrast 取得 CN/Global Published 源码资格。双语静态页面含专属像素图标、四项步骤、六项限制和四组 FAQ，由目录、Sitemap 和 llms.txt 收录。两地区正式产物各有 40 个工具详情页，另外九款 Draft 和 DEV 实验资源保持隔离。
- 工作区 JS/CSS 按需交付，共享选色样式仅由 Color & Contrast、Palette Extractor 和 Image Watermark 的详情页预载，沿用 react-colorful MIT 通知。Chromium 两地区正式产物验证实际 HEX、RGB 和 HSL 剪贴板值，以及独立计算的修正比值。[验收记录与范围](evidence/b14-color-contrast/README.md#b14-d2-正式产物)

## QR Image Fusion Lab — B13-2D-R0

- 通过 DEV 的 Lab 菜单进入 `/lab/image-fusion`。同一图像、二维码内容及实验参数下对照 Blend、Colored Halftone、Hybrid，查看原图、结果及中央 7 × 7 模块。可导出每种 PNG、参数 JSON 和解码结果 JSON。
- 独立 Worker 使用 Canvas 2D 处理内置或本地图像，复用 QR Matrix 及编码器功能掩码，静区保持四个实色浅色模块。三维状态与镜头交互继续由 QR 工具本身负责。
- [实验方法、截图和解码证据](evidence/b13-image-fusion/README.md) 记录实际参数扫描、跨解码器分歧及下一轮研究方向。

## QR Code Generator — V0.8-B13-B0 地貌沙盘与双状态工作区

- 工作区以实时地貌为主，默认显示 Dunes。左上切换 2D／3D，三维模式在右上切换世界和二维码。上方中央的单行输入停顿后自动编码，也可点击生成立即提交。各模式的下载图标都在左下，三维复位和全屏在同一区，右下是缩放，地貌选择在底部中央。二维在同一预览区显示风格、尺寸和纠错设置，标准样式用于自动扫码降级。英文示例和 M 级纠错沿用 A1。宽屏与窄屏复用同一 Canvas 和控制项。
- Dunes 由有方向性的弯曲沙脊和偏斜迎风坡构成，Highlands 使用不对称的丘体、山脊与鞍部，Valley 由连续曲流、陡崖与可见沉积带构成。三者均按地貌 ID、修订号及种子生成带边缘、截面与底部的封闭模型。
- 二维和三维共用原文及纠错等级产生的 QR Matrix；3D 二维码由完整方形暗模块实例与有实体厚度的浅色基板构成，使用同一矩阵的保留位及四模块静区。切换地貌不会改变二维风格，切换二维风格也不改变三维地貌。Recipe 仍为 V1。
- 世界视角可拖动、触控、缩放和复位。二维码默认停在适合识读的正视角，也可倾斜以观察模块厚度；返回世界会恢复先前视角。切换可中途反转，并遵循减少动态效果设置。场景在可见且确有更新时绘制。
- 3D PNG 来自当前 WebGL 帧，不含编辑控件。正视帧经 jsQR 对比原文及 UTF-8 字节；无法识读时可使用独立验证的 A1 2D SVG/PNG。WebGL2 启动失败或运行时丢失时，二维输入、预览及下载仍可用。
- Three.js 和 React Three Fiber 版本及许可证沿用 A0。图形入口仅在 Draft 工具进入可视范围后加载。正式构建从客户端模块图与实际产物核查 QR、独立解码器和三维库的 Draft 隔离。二维码工具仍为 Draft。
- 定向测试覆盖闭合边界、网格法线、扫码模块与静区、配方共享、缩放和视角切换。Chromium 使用 WebGL2 软件渲染，覆盖 CN 中文深色桌面、Global 英文浅色桌面及 390px 触控模拟。三种地貌均截图。三个视口中的二维码正视截图均能读回英文示例，以及包含中文、Emoji、查询参数、Fragment 和前后空格的 Q 级样本。实际下载的 A1 PNG 和浏览器栅格化的 SVG 像素一致。关闭 WebGL2 或模拟上下文丢失后仍可使用二维成品。
- 当前沙盘使用顶点色和简化接触阴影。丘陵表面过渡较平滑，沙脊和谷壁的细节、截面材质和光照仍需打磨。世界下沉与二维码升起是基础过渡。维护者视觉验收、实体相机、印刷尺寸与材料、极端照明、非 Chromium 浏览器和真实移动 GPU 尚待验证。

## QR Code Generator — V0.8-B13-A1 艺术二维码

- A1 工作区默认加载英文示例与 M 级纠错。Recipe V1 保存原始输入和艺术风格，修改内容和纠错等级时更新矩阵。仅切换艺术风格、标准模式或输出尺寸时复用编码，地貌配置不参与二维渲染。保留标准样式的前景色和背景色配置、文本复制、PNG 与 SVG 下载。
- Aeolian 使用方向性风纹、连续沙丘色带与种子微粒，Contour 从连续高度场求交生成地形等高线和高程色带，Strata 通过倾斜沉积岩层与错位断层形成峡谷剖面。三个风格用各自场函数给完整的深色数据模块分配低亮度色带，艺术相位只依赖原文、艺术 ID 和修订号。
- `createQrMatrix()` 只在矩阵层读取同次 `qrcode@1.5.4` 编码的 `reservedBit`。保留位保护定位、分隔、时序、校正、格式、版本及固定深色模块。专属测试检查多版本的完整掩码。升级编码器须复核适配层，未知保留位结构会停止生成。四模块实色静区外多留一个模块的实色缓冲，外框不影响模块覆盖。[编码器保留位实现](https://github.com/soldair/node-qrcode/blob/v1.5.4/lib/core/bit-matrix.js) · [GS1 静区指南，第 4.6.4 节](https://ref.gs1.org/guidelines/2d-in-retail/)
- `renderQrSvg()` 提供自包含 SVG，规范输出尺寸内按整数像素布置模块。`generateVerifiedQr()` 以同一 SVG 本地光栅化，按需调用 `jsqr@1.4.0` 比较文本和原始 UTF-8 字节。验证后才生成可下载 PNG。如艺术模块低于 4 px 或无法扫码，则用相同矩阵生成黑白标准样式并再验证。标准样式用 2 px 下限，仍无法精确读回时禁用下载。原有 2,000 个 UTF-16 代码单元的输入保护、128–2048 px 及独立的分享片段预算继续保留。[jsQR Apache-2.0 通知](../src/tools/qr-code-generator/art/jsqr.NOTICE.txt) · [SVG 图像约束](https://developer.mozilla.org/en-US/docs/Web/SVG/Guides/SVG_as_an_image)
- B0 可直接复用 `QrRecipeV1`、`createQrMatrix()`、`functionalMask` 与 `renderQrSvg()`。`graphics/` 继续拥有独立的 A0 高度场和 DEV WebGL2 探针，二维工作区无需开启图形上下文。两地区正式构建继续检查实际客户端模块和静态产物，排除 Draft 工作区、艺术模块、解码器与 3D 图形。
- Windows Chromium 157 在 CN 中文深色 1440px 桌面与 Global 英文浅色 390px 手机模拟视口各验证 8 组实际下载。读回 PNG、在目标尺寸加载下载的 SVG 并再次扫码，比较原文和 UTF-8 字节，确认预览与 PNG 下载字节相同。覆盖 L/M/Q/H、QR v2–v40、129–2048 px、中文和 Emoji、URL 查询与片段、前后空格、CR/LF/CRLF。H 级 1,273 字节样本通过，增加 1 字节时明确容量错误。另在真实页面强制一次或两次扫码失败及验证器异常，确认只提供重新验证成功的标准输出。
- `pnpm check`、113 项定向测试和 CN/Global 正式构建守卫通过。远程 CI 按 A1 提交在 [develop 工作流](https://github.com/librecosta/tool4furry/actions/workflows/ci.yml?query=branch%3Adevelop) 核对。
- 维护者视觉确认、实体手机摄像头、印刷材料与尺寸、光照变化和 Firefox/Safari 兼容性尚待验证。

## QR Code Generator — V0.8-B13-A0 图形基础与作品配方

- 产品方向包括可扫码的 2D 创意二维码、3D 地貌沙盘和静态作品分享。当前能力规划均免费，3D 地貌长期免费。未来可以单独立项评估部分 2D 精品风格的 Pro 资格。扫码直接读取原始内容，A0 配方只保存创作和编码数据。
- `QrRecipeV1` 保存 `version: 1`、原始 `content`、`terrain: { id, revision: 1, seed }`、`artwork: { id, revision: 1 }` 与 `qr: { errorCorrectionLevel }`。地貌 ID 为 `dunes`、`highlands`、`valley`，2D 风格 ID 为 `aeolian`、`contour`、`strata`。两组选项可独立组合。默认 `https://example.com`、`dunes`、`aeolian`、`M`，种子为 `1428536480`。算法出现不兼容变更时提升对应渲染版本并保留旧版重建或明确迁移。
- `deriveSeed` 对含有作品版本、地貌 ID 和修订号的 UTF-8 输入使用 32 位 FNV-1a。它用于确定性布局，分享载荷存储派生后的无符号种子。网格使用坐标整数混合与平滑双线性值噪声，在 CPU 上生成 33 × 33 个顶点。参考了 Website 的高度场组织与按需绘制，数学实现独立编写。[Website Expanse 源码](https://github.com/librecosta/website/tree/5005f84ce655ef3854e59c5bde1e4f01a329f074/src/components/expanse) · [Website BSD-3-Clause 许可](https://github.com/librecosta/website/blob/5005f84ce655ef3854e59c5bde1e4f01a329f074/LICENSE)
- `createQrMatrix` 使用 `qrcode@1.5.4`，返回 `size`、按行排列的 0/1 `Uint8Array cells`、`quietZoneModules: 4` 和纠错等级。容量依赖实际编码，原有 UI 的输入限制沿用。A1 可使用该矩阵构建纯 2D 渲染，需要保护定位、时序、校正、格式和版本模块及静区。功能模块分类和艺术绘制由 A1 实现。
- `validateRecipe` 严格验证 V1 的自有字段、版本、ID、有效 Unicode、种子和纠错等级。`encodeRecipe` / `decodeRecipe` 使用紧凑 JSON、UTF-8 与规范无补齐 Base64URL。载荷上限为 8,192 个 ASCII 字符，独立于 QR 矩阵容量。C0 可将载荷放在 `#r=` 片段。浏览器发送 HTTP 请求时省略片段，收件人仍可解码收到的完整链接。
- Three.js `0.187.0`、R3F `9.8.2` 和开发类型 `@types/three@0.187.0` 已锁定。DEV 主动打开探针时才请求图形代码。场景采用 WebGL2 按需绘制，离开视口暂停，关闭时释放几何、控件、渲染器和上下文。图形失败时仍可生成与下载基础 QR。[图形依赖许可](../src/tools/qr-code-generator/graphics/graphics.NOTICE.txt) · [qrcode 许可](../src/tools/qr-code-generator/qrcode.NOTICE.txt)
- QR Code Generator 保持 Draft。CN/Global 正式构建从 client chunk 模块来源和静态产物两处验证 QR 与图形资源隔离。A0 阶段 Registry 共 29 款（19 Published / 10 Draft）。
- Windows Chromium 157 使用软件 WebGL2 验证了 CN 中文深色 1280px 桌面与 Global 英文浅色 390px 手机模拟视口。下载的 512px PNG 由 `jsqr` 独立解码并逐字节核对原文。首次打开时实际绘制网格，鼠标及模拟触摸可旋转，静止及移出视口不继续绘制，缩放视口会更新绘图缓冲。关闭时观测到缓冲释放及上下文销毁。强制丢失上下文和禁用 WebGL2 时，基础 QR 仍可生成、下载与解码。
- 两地区首次开启探针均新增 8 个脚本响应，DEV 未压缩内容约 7.73 MiB，含 Vite 的开发转换和内联源码映射。开启前没有图形请求。Firefox、Safari、真实手机、硬件 GPU 及完整设备资源矩阵留待后续阶段验证。
- `pnpm check`、90 项定向测试、CN/Global 正式构建及产物守卫均通过。远程 CI 按 A0 的提交在 [develop 工作流](https://github.com/librecosta/tool4furry/actions/workflows/ci.yml?query=branch%3Adevelop) 核对。

## Timestamp Converter — V0.8-B12-D2 SEO 与 Beta 资格

- Timestamp Converter 取得 CN/Global Published 源码资格。既有 Astro 模板静态输出双语 Title、Description、H1、四项步骤、六项限制及四组 FAQ。保留像素图标、开发者与运营关联及目录卡片。每地区有 38 个工具详情页，由 Sitemap 与 llms.txt 收录。
- 快速模式以固定英文示例 `1704067200`（`2024-01-01T00:00:00.000Z`）起步，支持双向转换、Unix 秒/毫秒及 UTC/浏览器本地输入。高级模式接受带 `Z` 或明确偏移的 ISO 8601，附加 IANA 时区只用于结果展示。整数毫秒保留精度，闰秒、非法日期、越界时间及不存在或重复的本地时刻会拒绝转换。
- DatePickerField 与 TimePickerField 首次随正式工具交付。选择器使用既有 Base UI Popover，其 JS/CSS 由工具入口按需交付。Base UI 与 Phosphor 的完整 MIT 许可随两地区产物分发，其余 10 款 Draft 的页面及专用资源继续由产物守卫排除。
- Windows Chromium 157 在正式产物上验证 CN 中文深色 1280px 与 Global 英文浅色 390px 模拟视口。两地区各读回 Unix 秒、Unix 毫秒、ISO、UTC、浏览器本地时间及附加 IANA 时间的完整剪贴板值。带 `+08:00` 的输入保留 `.123` 毫秒，纽约重复时间的两种显式偏移产生相差一小时的结果。自定义 Picker 的键盘操作、窄屏和低高度定位、主题切换及刷新均通过。
- `pnpm check`、215 项定向测试与 CN/Global 正式构建和产物守卫通过。定向测试包含纽约的夏令时跳时与重复、半小时换时、跳过一整天以及 UTC 和上海时区用例。
- [D1-P1 基线 CI](https://github.com/librecosta/tool4furry/actions/runs/45030204174) 已通过。D2 远程 CI 按本阶段提交在 [develop 工作流](https://github.com/librecosta/tool4furry/actions/workflows/ci.yml?query=branch%3Adevelop) 的实际结果单独核对。
- L3 尚未验证 Firefox、Safari/WebKit、真实 iOS/Android、系统输入法候选窗、屏幕阅读器及完整历史和未来时区数据矩阵。

## Timestamp Converter — V0.8-B12-D1 双向时间转换工作区

- 快速模式默认以 Unix 秒载入英文固定示例 `1704067200`（`2024-01-01T00:00:00.000Z`）。时间戳和日期双向实时转换，秒/毫秒切换保持时刻，日期和毫秒级时间可直接输入，也可使用共享选择器。输入时区可选 UTC 或浏览器本地。当前时间由点击时的 `Date.now()` 提供。有效输入切换时转换表示，未完成的草稿保留。[共享选择器约定](workbench-appearance.md#日期与时间输入)
- 高级模式额外接受带 `Z` 或明确偏移的 ISO 8601 输入，并在结果中展示指定 IANA 时区。Unix 秒、Unix 毫秒、ISO、UTC、本地时间和可选时区各自复制完整值。编辑为非法值后即时清除结果，附加时区错误只影响该展示。
- 十进制秒以最多三位小数无损转换为整数毫秒，毫秒输入仅接受整数，支持负值及 Date 的 ±8,640,000,000,000,000 ms 边界。结构化日期允许 0001–9999 年，ISO 输入接受四位年份与最多三位小数秒。扩展年份仍可作为时间戳的 ISO 输出；闰秒、无效日期和超限值会报错。[ECMAScript Date](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-date-objects)
- 本地日期输入以浏览器的时区数据为准。时钟跳过的时间拒绝转换，重复时间需在高级模式用带偏移的 ISO 输入。已知时刻落在重复区间时，填入 UTC 并提示，以保留准确时刻。历史与未来的本地时区规则取决于浏览器自带数据。[IANA 时区数据边界](https://data.iana.org/time-zones/tzdb/theory.html)
- 所有转换在浏览器本地完成。D1 阶段保持 CN/Global Draft，当时 Registry 为 29 款（18 Published / 11 Draft），日常验证使用定向测试、开发路由和现有 CI 产物守卫。
- `pnpm check` 和 93 项定向测试通过。Chromium 157 验证 CN 中文深色 1280px 和 Global 英文浅色 390px 模拟视口的双向转换、时区切换、刷新及键盘焦点，两地区各读回六种剪贴板结果。纽约的夏令时缺失和重复时间也在固定浏览器时区下验证。尚未测试 Firefox、Safari/WebKit、真实 iOS/Android 和系统级日期控件差异。
- B12-D1-P1 在 Chromium 的同两种布局复测了共享日历、年月跳转、毫秒分段编辑、键盘操作和外部关闭。两种视口均在 470px 高度复核浮层翻转，保留既有时区、DST 与剪贴板行为。尚未验证真实移动设备、屏幕阅读器及系统输入法候选窗。

## URL & Base64 — V0.8-B11-D2 SEO 与 Beta 资格

- URL & Base64 依据维护者授权取得 CN/Global Published 源码资格。既有 Astro 模板静态输出双语 Title、Description、H1、四项步骤、六项限制及四组 FAQ。开发者分类、像素图标与目录卡片继续由既有投影生成。每地区 36 个工具详情页，由 Sitemap 和 llms.txt 自动收录。
- 保留快速/高级双 CodeMirror 工作区、URL 组件/完整 URI/表单值、标准 Base64/Base64URL 和可选编码补齐。严格校验转义、字母表、补齐、尾部比特与 UTF-8，反向查看使用完整有效结果。128,000 个 UTF-16 代码单元起由本地专属 Worker 处理，保留取消、12 秒截止和旧结果失效策略。
- 统一 URL & Base64 和 Subtitle Tools 两处内置默认演示为英文。解码示例由当前编码规则生成，跟随高级补齐偏好。字幕保留原先三条时间码、顺序及已存在的英文正文。审查确认 JSON Formatter、Markdown Editor、Regex Tester 等已使用英文示例。中文界面文案及 Unicode 用例保留。
- 编解码 Worker、工具 JS/CSS 及首屏样式归本工具。CodeMirror 及完整 MIT NOTICE 由五款正式工具共享，其他 11 款 Draft 路由与私有资源继续隔离。
- Chromium 157 在 CN 中文深色 1280px 桌面及 Global 英文浅色 390px 手机模拟视口操作正式产物，并在两个备用语言路由核对了相同英文示例。四种操作的剪贴板结果、12 份实际 UTF-8 TXT 的内容、MIME 和去重文件名均复核。下载覆盖了 BOM、CR、LF 和 NUL。两地区各复读一份 SRT 和 WebVTT，核对了英文正文、顺序、时间码及 MIME。
- 正式资源上的 Worker 转换、取消与初始化失败后恢复均已验证，也用 Chromium 模拟缺少字节数组 Base64 API 并验证兼容实现。每地区实际转换 130,500 个代码单元，完整复制与下载 652,500 字节并核对哈希。复用 D1 超过旧上限的测试证据。
- `pnpm check`、318 项定向测试及两地区正式构建和产物守卫通过。[D1 基线 CI](https://github.com/librecosta/tool4furry/actions/runs/45021475125) 已通过。D2 的远程结果按提交对应的工作流单独核对。[develop CI](https://github.com/librecosta/tool4furry/actions/workflows/ci.yml?query=branch%3Adevelop)
- L3 尚未验证 Firefox、Safari/WebKit、真实 iOS/Android、系统输入法候选窗和极限资源压力。

## URL & Base64 — V0.8-B11-D1 文本编解码工作区

- 默认快速模式使用 URL 组件编码，真实示例由同一套编解码函数处理。URL/Base64 与编码/解码独立切换，主动载入示例才替换输入。双 CodeMirror 复用工作区、外壳和 MIT 通知。反向查看将完整有效结果移入输入并反转方向，继续使用当前规则。
- 高级 URL 提供组件、完整 URL 和单个表单参数值。完整 URL 沿用原生 URI 规则，保留结构分隔符和已有的保留字符转义；表单值以 `+` 表示空格，字面 `+` 编码为 `%2B`，严格拒绝损坏转义。Base64 使用 UTF-8，支持标准及 URL 安全字母表，两套编码补齐偏好独立保存。解码接受规范补齐或合法省略，仅忽略 ASCII 空格、Tab、CR/LF，并检查尾部比特和 UTF-8。[ECMAScript URI 函数](https://tc39.es/ecma262/#sec-uri-handling-functions) · [WHATWG 表单编码](https://url.spec.whatwg.org/#application/x-www-form-urlencoded)
- 编码拒绝未配对的代理项，解码保留 BOM、CRLF、CR、NUL 等有效文本内容。优先使用浏览器字节数组 Base64 API，不支持时按小块兼容。复制与本地时间戳 TXT 下载共用当前完整结果，导出 MIME 为 `text/plain;charset=utf-8`。重复点击以毫秒递增保证同一工作区内的文件名唯一。[ECMAScript 字节数组 Base64](https://tc39.es/ecma262/#sec-uint8array.frombase64)
- 移除旧 50 万代码单元硬限制。小文本在渲染之外即时处理，达到 128,000 代码单元时防抖后交给同源专属 Worker。新请求终止旧任务，后台任务有 12 秒截止；失效、失败或空结果禁用交付。设备内存和浏览器字符串上限仍会影响可处理规模。
- D1 时工具保持 CN/Global Draft，全站为 29 款（17 Published / 12 Draft）。工作区 JS、CSS 和 Worker 从工具懒加载入口到达，当时的正式产物守卫排除其专用资源。所有处理在浏览器本地完成。
- Chromium 157 在 CN 中文深色 1280px 桌面和 Global 英文浅色 390px 触控模拟视口复验了两种模式、错误恢复、反向查看、撤销重做、焦点、滚动、主题切换和刷新。逐字节复读 12 份实际 TXT，核对四类文件名、去重、MIME、Unicode、BOM 和换行。两地区各验证 540,009 个输入代码单元生成完整的 2,700,045 字节 URL 编码结果，剪贴板与下载均匹配预期，也验证了处理中编辑可立即取消旧任务。Windows Chromium 的系统剪贴板会把单独的 LF 和 CR 转成 CRLF，直接生成的 TXT 保留实际结果字节。
- `pnpm check`、编解码核心/UI/Worker 与共享编辑器等 137 项定向测试、CN/Global 正式构建及产物守卫通过。
- Chromium 组合输入事件复验了中文提交和自动编码。同页切换到 390px 时原有输入、结果和两个编辑器实例均保留。
- Firefox、Safari/WebKit、真实 iOS/Android、系统输入法候选窗及极限资源压力尚未验证。

## JSON Formatter — V0.8-B10-D2 SEO 与 Beta 资格

- JSON Formatter 依据维护者授权取得 CN/Global Published 源码资格。通过既有 Astro 内容表静态输出双语 Title、Description、H1、四项步骤、六项限制与四组 FAQ。Registry 保留开发工具分类和开发者角色。工具目录、Sitemap 与 llms.txt 自动收录，每地区 34 个工具详情页。
- 冻结快速与高级工作区。双 CodeMirror 支持语法高亮、行列诊断和定位，默认 2 空格，高级可选四空格及只读分页树。严格格式化和压缩保留数字、字符串转义、字段顺序及重复键。原处理边界为 32 MiB 文件、16,777,216 个输入与 33,554,432 个输出 UTF-16 代码单元、500,000 个索引值、每页 40 个直属子节点与 12 秒 Worker 截止。
- JSON Formatter、Text Cleaner、Text Diff 与 Subtitle Tools 按需共享 CodeMirror 和完整 MIT 通知。JSON 的语法扩展、树形视图样式、Worker 与完整独立 MIT 通知仅由本工具交付。首屏样式链接仅出现在实际使用页面，Markdown Editor 等 12 款 Draft 的路由与私有资源继续排除。
- Chromium 157 使用两地区正式产物，复验 CN 中文深色 1280px 和 Global 英文浅色 390px 模拟视口。通过文件选择、拖放、错误定位与恢复、树形键盘操作、剪贴板、主题与刷新复检。重新读取 10 份真实 JSON 下载，对照预期原文字面量、重复字段、顺序、MIME 和安全去重文件名。`pnpm check`、271 项定向测试与两地区正式构建和产物守卫通过。
- D1 已验证 28,000 项大型数组的完整输出，核心与资源边界未改动。D1 基线 CI 已通过，D2 以对应提交的既有工作流为准。Firefox、Safari/WebKit、真实 iOS/Android、系统输入法与极端压力尚未复测。[D1 基线 CI](https://github.com/librecosta/tool4furry/actions/runs/45013751888) · [develop CI](https://github.com/librecosta/tool4furry/actions/workflows/ci.yml?query=branch%3Adevelop)
- 首轮 D2 CI 的两项失败来自旧的精选导航数量预期。JSON Formatter 原已列入精选，提升资格后两地区正式导航会按既定顺序显示它。测试同步明确第七项，沿用现有导航配置。[首轮 D2 CI](https://github.com/librecosta/tool4furry/actions/runs/45015568473)

## JSON Formatter — V0.8-B10-D1 JSON 工作区与结构浏览

- JSON Workspace 默认载入合法示例。快速模式支持 UTF-8 `.json` 文件选择、拖放和编辑器粘贴，自动校验并以 2 空格格式化或压缩。高级模式保留独立的 2/4 空格选项及代码/树形视图。复制和下载始终交付当前完整结果，文件名使用安全来源名称和毫秒时间戳。
- 严格解析器以原文范围记录 JSON 值和字段，用迭代方式重放 Token，保留数字字面量、字符串转义、字段顺序及重复字段。支持顶层标量和空集合。诊断显示真实 UTF-16 行列并可跳到标记，输入变更后旧结果立即失效。文件支持 UTF-8 BOM，读入失败保留当前输入。
- 工具专属同源 Worker 保存解析索引并重用同一文档的格式化与树形查询。较大输入防抖，旧请求可以终止，后台处理有 12 秒截止。每个展开分支每页挂载最多 40 个直属子节点，完整值可在详情中分页查看。文件读取上限 32 MiB，输入与输出上限分别为 16,777,216 和 33,554,432 个 UTF-16 代码单元，索引上限 500,000 个 JSON 值。没有固定嵌套深度，缩进扩张达到输出预算时可以尝试压缩。实际容量取决于浏览器和设备。
- 共享 CodeMirror 负责编辑生命周期，工具入口按需加载 `@codemirror/lang-json@6.0.2` 高亮扩展和 `@lezer/json@1.0.3` 语法包，完整 MIT 通知随 JSON 工具交付。D1 结束时，JSON Formatter 仍为 CN/Global Draft，全站 29 款（16 Published / 13 Draft）。该阶段两地区守卫验证了其路由、私有 JS/CSS、Worker、语法包及通知均排除于正式产物。
- Chromium 157 在 CN 中文深色 1280px 和 Global 英文浅色 390px 模拟视口核对截图，实测语法高亮、错误定位、分页树、文件导入、剪贴板、主题及刷新。共复读 10 份实际下载的 UTF-8 JSON，并核对完整内容、MIME 与安全去重文件名。每个视口均导出 28,000 项数组的格式化与压缩结果，输入约 157 万 UTF-16 代码单元，本机样本最长主线程任务约 205ms。Firefox、Safari/WebKit、真实移动设备、系统 IME 和极限资源压力尚未复测。
- `pnpm check`、142 项定向及共享编辑器、布局回归测试与 CN/Global 正式构建通过。另用 20,000 次固定种子语法扰动比对原生严格校验，并复核可接受结果的格式化稳定性。DEV 指南同步移除旧配额，SEO 元数据和发布资格保持原样。

## Subtitle Tools — V0.8-B9-D2 SEO 与 Beta 资格（2026-11-22）

- 维护者验收 Subtitle Studio Lite 后授权提升 CN/Global Published 源码资格。双语 Title、Meta Description、H1、四项步骤、六项限制与四组 FAQ 随 Astro 静态输出。地区语言、Canonical、hreflang、OG/Twitter、普通工具卡片、Sitemap 与 llms.txt 继续沿用现有投影。每地区 32 个工具详情页，现有动画师与运营的 Registry 角色保持原样。
- 快速模式保留三条有效示例、可视化 Cue 列表和 SRT/WebVTT 双向转换。高级模式保留毫秒精度整体偏移、单条时间及正文编辑，以及校验后应用的 CodeMirror 源码草稿。文件、文本、Cue 上限分别为 32 MiB、16,000,000 UTF-16 代码单元和 100,000 条，最大偏移 86,400 秒，最大时间码 `999:59:59.999`。带内嵌 WebVTT 时间戳的字幕无法整体偏移。NOTE、STYLE、REGION 明确报错，转 SRT 提示实际存在的定位、标识、文件头与内嵌时间戳语义损失。
- Subtitle Tools 私有 JS/CSS 跟随自己的动态入口。三个正式工具共用一个 TextEditor JS/CSS 和完整 MIT NOTICE，Text Cleaner / Text Diff 的双栏 TextWorkbench 单独共享。Astro 构建时仅在使用对应样式的详情页保留首屏链接。公共入口与其余 13 款 Draft 的私有资源继续受源代码与产物测试约束。[Astro 构建钩子](https://docs.astro.build/en/reference/integrations-reference/#astrobuilddone)
- Chromium 157 使用正式静态产物复验 CN 中文深色 1280px 和 Global 英文浅色 390px 模拟视口。完成双向转换、同格式导出、整体偏移、单条修改、源码草稿恢复、剪贴板、主题切换及刷新。真实下载的 18 份 SRT/VTT 均由 `parseSubtitles()` 读回并与独立预期对照起止时间、文字和数量。BOM/CRLF、多行 Unicode、MIME、安全时间戳文件名、重复下载与原文件字节也通过检查。`pnpm check`、257 项定向测试、CN/Global 正式构建及产物守卫通过。
- 两地区隔离夹具通过。夹具保留未选用的真实工具为 Draft，以配合实际 Loader 契约。缺 Loader、缺内容、提前加载、共享入口泄漏和 Loader 互换均在预期环节被拒绝。D1 基线 `522611e` 的 CI 已通过，其 5,100 条完整导出证据继续有效。D2 的远程 CI 以对应提交的既有工作流为准。[D1 CI](https://github.com/librecosta/tool4furry/actions/runs/45005753947) · [develop CI](https://github.com/librecosta/tool4furry/actions/workflows/ci.yml?query=branch%3Adevelop)
- Firefox、Safari/WebKit、真实 iOS/Android、真实手机输入法及极限资源压力留作 L3，390px 是桌面 Chromium 的模拟视口。两个地区均未部署。

## Subtitle Tools — V0.8-B9-D1 可视化字幕工作区（2026-11-22）

- 快速模式默认载入三条本地示例。支持拖放、文件选择和粘贴，按实际文本识别 SRT/WebVTT。预览保留多行正文，滚动区每页最多呈现 40 条，复制和 UTF-8 下载包含全部字幕。文件名使用安全的来源主体或 `subtitles`，追加本地毫秒时间戳。
- 高级模式共享同一份 Cue 集合，支持按秒数整体提前或延后，以及单条开始、结束时间和正文编辑。偏移按整数毫秒应用于预览和导出，保留持续时间、重叠和条目顺序。负时间、无效时长和 WebVTT 开始时间逆序会提示具体条目。共享 CodeMirror 中的源码草稿经验证后一次性应用，可继续编辑或明确舍弃。
- 读取 UTF-8（含 BOM）及 CRLF/LF，输出规范时间码。WebVTT 同格式保留支持的 Cue ID、定位设置和文件头说明，转 SRT 时列明影响。NOTE/STYLE/REGION 块报出实际行号，含内嵌 WebVTT 时间戳时禁止整体偏移。[WebVTT 规范](https://www.w3.org/TR/webvtt1/)
- 本地处理边界为单次读取 32 MiB、16M UTF-16 代码单元和 100,000 条。超过旧配额只显示较大输入提示。文件读取失败、无效草稿或不合法的当前输出配置会禁用复制和下载。D1 阶段为 CN/Global Draft，当时全站 29 款（15 Published / 14 Draft）。
- Chromium 157 在 CN 中文 Dark 1280px、Global 英文 Light 390px 模拟视口完成文件选择、拖放、真实剪贴板、双向转换、高级编辑、草稿恢复、主题切换和刷新。共读回 18 份实际下载的 UTF-8 SRT/VTT，核对条目数、起止时间、正文、MIME 与不重复的文件名。两个视口各通过 5,100 条完整导出。通过 `pnpm check`、88 项定向与编辑器回归测试，以及 CN/Global 正式构建和 Draft 路由、专用 JS/CSS 隔离守卫。

## Text Diff — V0.8-B8-D2 SEO 与 Beta 资格（2026-11-22）

- 依据维护者对 D1 的验收和本轮授权，Text Diff 取得 CN/Global Published 源码资格。两地区各有中英文静态 Title、Meta Description、唯一 H1、专属像素图标、四项步骤、六项限制和四组 FAQ。Registry 的双语短文案用于目录，Canonical、hreflang、OG/Twitter、Sitemap、llms.txt 和同组推荐沿用既有机制。全站 29 款（15 Published / 14 Draft），每地区 30 个工具详情页、40 条公开发现 URL。
- D1 的插入回归保持正确。原文 `123\n134` 与新文 `123\n2\n134` 比较只新增第 2 行，`134` 对应原文第 2 行、新文第 3 行。双 CodeMirror、Diff Viewer、双行号、仅变化视图的两行上下文、忽略行尾空白与独立 EOF 提示沿用 D1。行尾空白只参与匹配判定，编辑器内规范化换行。TXT 报告为 UTF-8 可读文本，标准 Git 补丁应用超出本工具范围。
- `diff@9.0.0` 的逐行比较仍在工具专属同源 Worker 执行，保留 750ms 搜索预算、5 秒整体截止、任务取消和过期结果隔离。完整 diff BSD-3-Clause NOTICE 随 Text Diff 入口交付。Text Cleaner 与 Text Diff 共用一份 CodeMirror JS、SCSS 和完整 MIT NOTICE，编辑器 JS 由两个工具的懒加载入口引用。Astro 现有 ToolRuntime 会在工具详情页的 head 统一链接工具样式。其余 Draft、Lab 和 Fixture 的私有资源继续隔离。
- 使用 Chrome 157 对正式静态产物进行操作验收，覆盖 CN 中文 Dark 桌面 1280px 和 Global 英文 Light 390px 视口。复核首次挂载、增删替换与连续空行、双侧行号、三个行类型颜色、EOF、空白忽略、上下文筛选、撤销重做、主题切换、清空单侧及长行滚动。临时拦截 Worker 请求，确认旧结果立即失效，失败期间复制/下载不可用，下一次编辑可恢复。用 1,200 行实测独立滚动、虚拟渲染和完整交付，另复用 D1 的 12,000 行局部变更和超时证据。
- 两个视口共实际下载 10 份 TXT 并重新读取字节，与独立预期逐字节匹配。核对 MIME、中文、Tab、原文/新文行号、EOF/换行信息、当前模式、连续下载时间戳和完整的虚拟列表外数据。真实剪贴板内容与报告一致，复制/下载没有启动新比较。
- `pnpm check`、相关定向测试、CN/Global 正式构建及产物守卫通过。D1 基线 `a14429a` 与本轮开发基线 `a5c6d5e` 的既有 CI 均通过。D2 以其提交对应的工作流结果为准。[D1 CI](https://github.com/librecosta/tool4furry/actions/runs/42052448668) · [开发基线 CI](https://github.com/librecosta/tool4furry/actions/runs/45001542571) · [develop CI](https://github.com/librecosta/tool4furry/actions/workflows/ci.yml?query=branch%3Adevelop)
- L3 尚未复测 Firefox、Safari/WebKit、真实 iOS/Android、系统 IME 候选窗及极端资源压力。390px 是 Chromium 模拟视口。两地区均未部署。

## Text Diff — V0.8-B8-D1 正确性与工作区（2026-11-05）

- D1 结束时 Text Diff 为 CN/Global Draft。其后的双语 SEO 与源码资格见上方 D2 记录。D1 未改 Text Cleaner 和共享编辑器实现。
- 两个可编辑 CodeMirror 直接复用 TextEditor / TextEditorPane / TextWorkbench，桌面等宽，≤900px 同 DOM 纵向排列，各自清空。输入自动比较；结果区统一双行号、增删标识、全部/仅变化（两行上下文）、忽略行尾空白及复制/下载图标，不再使用 textarea 或手动比较按钮。
- 保留 `diff@9.0.0`，以 `diffArrays()` 对齐逻辑行内容。结构化 DiffLine 同时保存真实原文/新文内容、各自行号与原始分隔符；统计、可视行和 TXT 报告均派生于这一结果。空文件为零行；`"\n"` 为一条空内容行；终止分隔符不会凭空生成下一条内容行。LF/CRLF/CR 作为行边界匹配，末尾换行差异独立记录，不把最后一行误判为替换。
- `123\n134` → `123\n2\n134` 严格为 +1 / −0，`134` 为 equal 且对应原文第 2 / 新文第 3 行；新文额外带末尾换行也不会改变行匹配。忽略行尾空白只改变匹配键，输入不变；匹配后仍有尾空白差异的两份实际文本分别显示为中性行，不计入增删。
- 无旧的每侧 10 万字符 / 4000 行 / 4000 编辑量配额。比较在工具专属 Worker 中运行，较大输入防抖 120ms；Myers 搜索保留 750ms 计算预算，另有包含初始化、分行与消息交付的 5 秒截止。新输入立即禁用旧结果并终止旧 Worker；超时、无法启动、消息错误和资源不足明确失败，不交付半截结果。500 行以上使用 28px 固定行高、可见范围加缓冲的轻量虚拟列表，长行在结果内部水平滚动，行号固定；不截断文本或生成两套有状态编辑器。
- Chrome 156 在 CN 中文 Dark / 1280px 与 Global 英文 Light / 390px 完成真实粘贴、插入/删除/替换/空行/EOF、视图切换、空白选项、Undo/Redo、主题与选区保持、单侧清空及长行滚动。12,000 行 / 两侧约 31 万字符的局部插入实际完成，Worker 含启动与消息约 31ms，整个粘贴/显示流程约 0.4s；15,000 行大规模不同文本实际触发超时且可继续编辑恢复。该结果仅代表本机 Chromium，不保证任意输入规模或设备性能。
- 复制和 UTF-8 `text/plain;charset=utf-8` TXT 输出为人类可读报告，含双行号、真实行内容、统计、所选视图、忽略空白和 EOF/换行元数据；不再冒充 `.diff` Patch。八份真实 TXT 落盘复读，中文/Tab/内容与已知预期一致；完整报告不受虚拟渲染范围限制，每次点击下载生成 `text-diff-YYYYMMDD-HHmmss-SSS.txt`，同毫秒用短序号去重，复制/下载不重算。
- 依赖和完整 BSD NOTICE 沿用现有版本，CodeMirror 许可继续随共享编辑器入口提供。仅从 Text Diff 懒加载链引入专属 Worker；`pnpm check`（468 文件、零错误/警告）、9 文件 67 项相关定向测试、CN/Global 正式构建和完整守卫通过。额外核对两地区产物不包含本工具路由、Worker、Viewer、报告实现或专属 BSD NOTICE，已发布 CodeMirror 许可全文不变。测试覆盖原文/新文逐字节重建、独立 LCS 最小编辑数、超时/取消/迟到结果、真实编辑状态与完整导出；远程 CI 与推送结果单独核对。
- 首轮远程 CI 的 1338/1339 通过，唯一失败是局部行背景错误使用保留的 `--t4f-*` 主题前缀，已改为工具私有 `--diff-row-surface`，原样保留全站样式/Token 守卫并定向通过。首次 DEV Worker 依赖发现会触发 Vite 重载，因此沿用现有 `optimizeDeps.include` 加入 `diff`，在用户输入前预打包；这不向浏览器预加载依赖，也不改变正式资格或产物图。配置失效后的首次启动复验未丢输入，手机长行滚动后的行号/标识固定位置亦通过真实 Chromium 检查。
- 未测 Firefox、Safari/WebKit、真实 iOS/Android、系统 IME 候选窗、真实屏幕阅读器与极限资源；390px 为 Chromium 手机视口。未部署或改变发布分支。

## Text Cleaner — V0.8-B7-D2 SEO 与 Beta 资格（2026-11-05）

- 依据维护者对 D1 的手动验收及本轮授权，Text Cleaner 取得 CN/Global Published 源码资格；全站仍为 29 款，现为 14 Published / 15 Draft。只更新本工具静态 SEO、Registry 短文案及发布投影；D1 编辑器、工作区、纯清理函数、资源策略和依赖版本均未改动，其他工具资格不变。
- [D1 CI 42034819926](https://github.com/librecosta/tool4furry/actions/runs/42034819926) 实际为 1295/1296 通过，唯一失败在 PDF 预览测试点击 Actual size 后立即读取旧的 Fit transform。本地原提交两次定向重跑均 4/4，通过代码核对和真实浏览器未发现缩放功能缺陷；问题按测试同步时序处理：等待异步页面图片加载后的控件可用，使用 awaited userEvent，并以 waitFor 等待 React 提交的 transform。未增加固定 Sleep、删除断言或修改 PDF Split / 图片预览生产代码；Actual Size、Fit、滚轮、键盘平移、取消、迟到图像和 Canvas/URL 释放检查全部保留。PDF 与共享预览 11 项复验通过；Chromium 实际 Actual Size 为 scale(1)，滚轮后约 1.2214，键盘右移 40px，Fit 恢复适应比例，Escape 正常关闭。
- 双语 Astro SEO 各含 4 项步骤、6 项支持范围与限制、4 组 FAQ。准确描述快速保留缩进/清行尾/合并空行/LF、高级独立规则与 LF/CRLF、自动结果、已移除旧 50 万代码单元配额及真实设备边界，不宣传 JSON/YAML 校验、富文本或 AI。Registry 双语短文案同步，未静态引入业务或编辑器。
- 四个正式页面（CN 中文 `/tools/text-cleaner/`、CN 英文 `/en/tools/text-cleaner/`、Global 英文 `/tools/text-cleaner/`、Global 中文 `/zh/tools/text-cleaner/`）通过 Title/Description、唯一 H1/专属像素图标、4/6/4 静态正文、同地区 Canonical/hreflang、可索引状态、目录与 Sitemap/llms 收录守卫。正式同组暂无其他 Published 工具，因此 Text Cleaner 不渲染空的相关工具区域；DEV 和其他页面仍复用原 ToolCards 与资格过滤。运营身份按原有人工配置自然发现 Text Cleaner，不修改推荐算法或首页配置。
- Chrome 156 在实际 CN 中文 Dark / 1280px、Global 英文 Light / 390px 正式产物完成输入、多行中英文/Tab/混合换行粘贴、Undo/Redo、三种空行规则、行首/行尾独立开关、Quick/Advanced 状态保持、主题切换、只读选择复制及清空。六份实际 TXT 重新读取，UTF-8 中文/Unicode、保留缩进、LF/CRLF 字节均与独立预期字符串一致；MIME 为 `text/plain;charset=utf-8`，重复下载名称不同。实际 clipboard.writeText 参数与当前结果完全一致；Windows 系统剪贴板读回可能规范化行尾，另以下载字节验证格式，不混淆编辑器内部 LF 与最终 CRLF。
- 查看正式桌面/手机截图：双面板宽高在首次挂载/F5 中稳定、无横向溢出、无明显 FOUC 或 Hydration/运行错误；主题切换保持 DOM、文本与选区。D1 的 660,000 字符 / 60,000 行、120ms 大文本防抖与虚拟化证据在未修改业务代码的情况下继续有效，不机械重跑压力样本；核心/UI 测试仍覆盖超旧配额、过期导出禁用和复制失败后可手动选择。
- CodeMirror 的 state/view/commands 与必要传递依赖沿用已锁定版本，完整 12 包 MIT NOTICE 逐项核对。每地区正式产物各有一个 Text Cleaner 动态 JS 入口、一个按需 CSS 和一个完整 NOTICE（约 15.3 kB），守卫从实际输出 AST 核对其唯一动态入口由 ToolRuntime 持有，CM 实现未进入其他 eager/shared JS。浏览器首页不请求编辑器，工具页正常按需加载 JS/CSS，读取的许可与源码全文相同。无外部编辑器/CDN、上传或文本持久存储；JSON Formatter、Subtitle Tools、Markdown Editor 等其余 15 款 Draft 的路由、私有实现和资源继续排除。
- `pnpm check`（460 文件、零错误/警告）、186 项相关定向测试通过；CN/Global 各一次正式编译及完整产物守卫通过，每地区 28 个工具详情页、38 条公开发现 URL。CN 首轮新增动态入口审计仅识别引号而遗漏 Vite 输出的无插值模板字面量，已改为 TypeScript AST 检查并对同一产物完整复验通过，不放宽动态归属或 Draft 断言。新提交的远程 CI 另行核对，不将本地结果等同于 CI 通过。
- 未测 Firefox、Safari/WebKit、真实 iOS/Android、系统输入法候选窗、真实屏幕阅读器及极限内存；390px 为桌面 Chromium 移动视口。未部署、创建 Tag/Release 或合并发布分支。

## Text Cleaner — V0.8-B7-D1 共享编辑器与实时清理（2026-11-05）

- 仅迁移 Text Cleaner，继续 CN/Global Draft；全站仍为 29 款 / 13 Published / 16 Draft。JSON Formatter、Subtitle Tools、Markdown Editor 及旧 TextWorkspace 未迁移，不修改 SEO 或资格。
- 新增 `src/ui/text-editor/`：TextEditor 封装 CodeMirror 6；TextEditorPane 拥有中性灰外表面、标题/操作插槽和轻量状态栏；TextWorkbench 只负责顶部规则与等宽双编辑器，≤900px 同 DOM 堆叠。工具继续拥有文本、清理规则、结果有效性及复制/下载，没有全局 Provider、Store 或编辑器框架。
- 锁定最小直接依赖 `@codemirror/state@6.7.6`、`view@6.43.15`、`commands@6.11.1`，未安装 React 包装器或语言专用解析器。必需传递依赖随实际引用进入工具图；完整 12 包 MIT 许可集中在 `codemirror.NOTICE.txt` 并通过工具 URL 交付。未来语言扩展由调用方按需传入 Extension，不静态引入 JSON/YAML/Markdown 全套功能。
- EditorView 每次挂载只创建一次，卸载 destroy；Strict Mode、受控回流、最小外部变更映射选区、Undo/Redo、动态 Compartment、行号/换行和只读模式有定向测试。只读同时配置 readOnly/editable、保留可聚焦选择复制，并阻止直接命令修改文档。Plain Text 使用现有 sans 字体；主题跟随变量，切换不重建 View。CodeMirror 内部无 Layer 规则的覆盖使用 scoped EditorView.theme，外部 SCSS 仍拥有几何/表面/焦点；实测 Purple Focus 和亮暗颜色正确。
- 快速模式固定清理行尾、合并连续空行、输出 LF，并保留行首缩进。高级保存独立自定义规则：行首/行尾分别开关，空行 keep/collapse/remove 互斥，明确 LF/CRLF 输出。模式切换保留同一输入及高级规则，输入/规则自动更新结果。编辑文档采用 LF 语义；导出由唯一纯函数生成实际换行字节，不声称保留混合原始行尾。清空仅清输入，不重置高级选项。
- 不再调用本工具旧 `boundedText()` 50 万 UTF-16 配额，也不修改全局函数。清理按行单次处理，统计仅字符/行数，不执行每键 Intl.Segmenter；超过 10 万字符时用工具局部 120ms 防抖，过期结果的复制/下载立即禁用。没有引入 Worker；设备能力仍决定实际规模，资源失败报告错误，不承诺无限输入或进程级 OOM 可恢复。
- Chromium 156 的 CN 中文 Dark / 1280px、Global 英文 Light / 390px 完成真实组合输入事件、中文/英文多行剪贴板粘贴、选区保持、Undo/Redo、规则往返、只读 Ctrl+A/C、禁止编辑、复制及实际 TXT 下载；四份 DEV 下载逐字节核对 CRLF 和 Unicode，重复下载名称不同。复制失败的手动选择反馈由 UI 测试覆盖。中文组合验证使用 Chromium CDP composition/commit，未验证操作系统候选窗或真实手机输入法。
- 真实 660,000 字符 / 60,000 行粘贴、尾部编辑和内部滚动通过，无旧配额拒绝，DOM 只绘制约 36–40 行。DEV 粘贴至结果稳定实测约 0.17–1.94 秒（含 120ms 防抖及浏览器绘制，存在冷/热和负载波动）；清理本身约 10–28ms，基本统计约 3–8ms。另以 330 万字符测量纯函数，清理约 54–97ms、统计约 13–27ms；这不等于极限输入性能保证。
- DEV 禁用缓存 F5 及仓库外的隔离生产构建均验证首次挂载：可见面板逐帧宽高不变，桌面编辑主体约 422px、手机 320px；主题切换不丢内容/选区，无横向溢出或运行错误。隔离生产样本直接构建实际组件、SiteLayout 主题样式和字体，实际 TXT 的 LF/CRLF 字节及完整许可资源核对通过；它不伪造 Draft 正式路由。首次 DEV 跨地区依赖发现曾导致 504，三个模块加入 DEV 预构建并冷启动复测后消除，不增加浏览器或生产预加载。
- `pnpm check`（460 文件，零错误/警告）、10 文件 / 60 项相关测试及 Frozen Lockfile 安装核对通过。CN/Global 各一次正式构建和完整守卫通过，每地区 26 个工具详情页、36 条发现 URL，Text Cleaner / CodeMirror 的 JS、CSS 和 NOTICE 均未进入正式资源图，其余 Draft / Lab / Fixture 隔离保持。锁文件仅增加所需依赖，既有包解析未变。[基线 CI 已通过](https://github.com/librecosta/tool4furry/actions/runs/42028041735)，本轮提交的远程状态另行核对，不把本地通过当作远程 CI 通过。
- Firefox、Safari/WebKit、真实移动设备/系统输入法、真实屏幕阅读器和进程级内存极限未测。390px 为桌面 Chromium 视口；没有进行 SEO、Beta 资格提升或部署。

## File Hash — V0.8-B6-D3 SEO 与 Beta 资格（2026-11-05）

- 依据维护者对 D1/D2 的验收与本轮发布授权，提升 File Hash 的 CN/Global Published 源码资格；当前 29 款（13 Published / 16 Draft），历史 15 + 7 集合不变。仅更新本工具静态长文、短元数据及发布投影，UI、计算内核、队列、Worker、依赖与资源策略未改动。
- 双语 Astro 内容各含 4 项步骤、6 项限制与 4 组 FAQ，准确说明默认 MD5、SHA-1/SHA-256/SHA-512/CRC32、多文件自动队列、比对及复制/TXT。CN 中文 `/tools/file-hash/`、CN 英文 `/en/tools/file-hash/`、Global 英文 `/tools/file-hash/`、Global 中文 `/zh/tools/file-hash/` 的静态 Title/Description、唯一 H1、专属像素图标、同地区 Canonical/hreflang、可索引性、目录、相关推荐卡片、Sitemap 与 llms.txt 均通过正式产物守卫；不增加客户端 SEO 脚本或修改人工推荐配置。
- Chrome 156 在实际 CN/Global 正式静态产物上完成中文 Dark / 1280px 与英文 Light / 390px：六份真实文件（空、`abc`、UTF-8 中文/Unicode、二进制、`123456789`、含制表符/换行的文件名）逐项计算五种算法，与独立 Node crypto / zlib CRC32 一致。`abc` MD5 为 `900150983cd24fb0d6963f7d28e17f72`，`123456789` CRC32 为 `cbf43926`。默认 MD5、算法自动重算、选择保持、追加只处理新项、单项移除、清空恢复默认及取消/重试正确。取消场景仅延迟真实本地 Worker 的 HTTP 交付 700ms，未伪造摘要或进度，取消后未交付旧结果。
- 实际复制完整 MD5/SHA-256 和批量 SHA-256；四份下载的 TXT 重新读取后摘要、名称、顺序、Unicode 及特殊名称转义均正确，重复下载名称不同且未触发重新计算。MIME `text/plain;charset=utf-8` 由现有 UI 测试验证。比对大小写/空白、空值、不完整、非法、匹配/不匹配、文件与算法切换均正确；尾部图标与隐藏无障碍状态同步。查看桌面/手机截图，行内原生 Radio、38px 复制图标、128 位 SHA-512 换行、三个等宽 44px 操作均保留，无横向溢出、阻断交互、明显样式闪现或 Hydration 报错。
- D1 的 37 MiB + 8 字节真实文件证据继续有效：20 次读取，最大 2 MiB、主线程整文件读取为零，MD5/SHA-256 与独立实现一致；本轮未机械重复该压力样本。现有核心测试再次覆盖五算法的空/ASCII/UTF-8/二进制、跨 2 MiB 边界及 33 MiB 输入、安全失败、任务隔离和已完成项导出。
- `hash-wasm@4.12.0` 的完整 MIT 及所用 MD5/SHA/CRC32 上游声明保持原样。每地区产物仅有一个约 52.5 kB 本地哈希 Worker，五个 WASM 二进制完整内嵌且不进入主线程 Chunk；唯一 Worker URL 引用归属 File Hash 懒加载入口。浏览器首页不请求 File Hash，实现加载后无文件时不启动 Worker；实际计算只请求同源 Worker，没有外部 WASM/CDN、哈希 API、上传请求或持久存储。浏览器读取实际许可资源并与源码全文比较一致。
- `pnpm check`（452 文件，零错误/警告）、18 个相关文件 / 262 项定向测试、CN/Global 各一次正式构建及完整产物守卫通过；每地区 26 个工具详情页、36 条公开发现 URL，其余 16 款 Draft / Lab / Fixture 私有资源继续排除。新增正式 Worker/WASM/许可证正向交付检查，保留 Draft 反向隔离断言。基线 [`a83ac46823c3` CI 已通过](https://github.com/librecosta/tool4furry/actions/runs/42020304169)；[首轮发布 CI](https://github.com/librecosta/tool4furry/actions/runs/42027449705) 的 1280 项通过，2 项因导航测试遗漏 File Hash Published 预期而失败。已补齐两地区预期，导航文件 19 项定向复验通过；未改生产代码或放宽断言。修正提交继续由既有工作流复检，最终远程状态单独核对，不以本地通过替代。
- 未测 Firefox、Safari/WebKit、真实 iOS/Android、真实屏幕阅读器、极端大文件与浏览器进程级内存耗尽，仍属 L3；390px 为桌面 Chromium 移动视口。匹配摘要不认证来源，MD5/SHA-1 不适合抗恶意碰撞、CRC32 非密码学；TXT 为本站可读清单，不宣称普遍兼容第三方 checksum 格式。Published 不代表部署，两个地区均未部署。

## File Hash — V0.8-B6-D2 UI 精修（2026-11-05）

- 算法最终按维护者截图采用紧凑的行内原生 Radio：圆点和文字横排，窄栏自然换行，无卡片背景、逐项边框或等宽拉伸，不使用 Select。右侧移除安全提示、重复算法/完成行与常驻完成统计，复制/TXT 操作后才反馈实际完成项数量。
- 当前文件名独立一行，完整摘要与 38px 复制图标同排；SHA-512 自然换行。工具内复用 FieldFrame/useField/controls.input 组合「哈希比对（可选）」：仅有效完整摘要显示尾部 CheckCircle/XCircle；未完成、空值或不完整输入不显示结果图标，非法值保留 aria-invalid。仅屏幕阅读器可见的状态通过 polite live region 和 aria-describedby 提供语义，无可见的结果/长度说明段落。
- `pnpm check`（452 文件、零错误/警告）及 4 文件 / 41 项 UI、Converter、共享样式与布局测试通过。真实 Chromium 156 在 CN 中文 Dark / 1280px、Global 英文 Light / 390px 验证默认 MD5、键盘 Radio、自动 SHA-256/SHA-512 重算、完整剪贴板、比对各状态、切换隔离和四份实际 TXT 下载，均与独立 Node crypto 摘要一致；38px 复制按钮未被长摘要挤出，输入尾部图标垂直居中，无横向溢出或冷启动 Hydration 报错。查看桌面/手机及 Converter 亮暗对照截图，原卡片几何和视觉语言保留。开发态跨模块移动 CSS 后重启服务以清除旧 SSR 类名缓存；稳定冷启动验收通过。
- 未改 core、queue、engine、Worker、协议、依赖、SEO 或资格，仍为 Draft / 12 Published / 17 Draft。本轮不重复正式构建和大型文件压力；D1 的内核与资源证据仍适用。Firefox/Safari、真实移动设备和真实屏幕阅读器未实测；无障碍属性、隐藏状态文本及真实浏览器键盘操作已验证。
- 截图纠偏后，File Hash 使用自身的行内样式；撤回上一轮不必要的 RadioChoices 抽取，恢复 Converter 原样式及裁剪/压缩/漫画控件仍使用的 CSS 导出，增加旧消费者导出回归检查。`pnpm check` 与 File Hash UI、Resize UI、布局共 34 项定向测试通过；Chromium 再次完成 CN Dark / 1280px 与 Global Light / 390px，实际摘要、复制及四份 TXT 下载正确。已查看两视口截图：选项按内容宽度排列、无卡片背景/边框，窄栏换行、无溢出。

## File Hash — V0.8-B6-D1 多文件自动校验（2026-11-05）

- 保持 CN/Global Draft，全站仍为 29 款（12 Published / 17 Draft），未改静态 SEO 长文和其他工具。默认 MD5，可选 SHA-1、SHA-256、SHA-512、CRC32；一次添加多文件并可追加，自动串行计算。左文件列表、右设置使用既有 Form 配方、FileTaskList 视觉资产和完整灰色设置面板；空态 960px，有文件 Wide Form，1050px 以下单列。
- `hash-wasm@4.12.0` 固定版本，增量计算仅由 File Hash 的本地 Vite Worker 引入，WASM 嵌入 Worker，不请求远程 API/CDN。每次只读取 `File.slice()` 的 2 MiB 数据，复用并重置当前算法实例，不整体读取文件、不再执行旧 32 MiB 配额。单 Worker 有界并发不代表任意设备可处理无限输入；读取、模块初始化和资源失败逐项报告并继续队列。
- 工具局部队列持有稳定 ID 与原始 File；切换算法、删除正在处理的文件、取消、清空和卸载均终止旧 Worker，消息按 Worker、任务 ID 和算法校验。取消保留文件与已完成结果，可重试未完成项；算法切换自动重算并清除旧摘要和预期值，避免跨算法混用。
- 单项复制完整摘要；可选预期值按准确十六进制长度、大小写不敏感自动比对，空值/未完整输入不误报不一致。批量复制/TXT 仅含当前算法已完成项并显示数量，特殊文件名转义为单行，保留 Unicode；点击下载时生成 `checksums-md5-YYYYMMDD-HHmmss-SSS.txt` 等名称，同毫秒以短计数消重，复制/下载不重算。MD5、SHA-1 不宣称现代抗碰撞能力，CRC32 为校验和；安全性要求较高时建议 SHA-256。
- Chromium 156 在 CN 中文 Dark / 1280px 与 Global 英文 Light / 390px 完成拖入多文件、五种算法、追加/同名文件、预期值、单项/批量复制、下载、算法重算、计算中删除/取消/重试和清空。37 MiB + 8 字节真实文件的 MD5 为 `8f10daa14f51dab410329a8e2dedba5e`，SHA-256 为 `59c4b752e5c9f626eca9119bda8e2ce5af00221d9268064d5c86c90bddb2ccb1`；Worker 实测 20 次读取，最大块 2 MiB，主线程整文件读取为零。Node crypto 和 Python hashlib/zlib 独立复核五种算法、空/中文/二进制样本、大文件摘要及四份实际 TXT 下载，顺序和内容正确。删除/取消场景仅为真实块读取添加 200ms 测试延时，未伪造摘要或进度。
- 7 个相关测试文件 / 70 项通过（增加五种算法跨块用例后定向复验），覆盖标准向量、块边界、超过 32 MiB、初始化/读取失败、取消与迟到消息、UI 与导出；`pnpm check`（452 文件）零错误/警告。另在仓库外隔离编译生产 Worker（约 52.5 kB），真实 Chromium 校验五种算法及 37 MiB SHA-256，未为 Draft 伪造正式路由。DEV 首次导入曾触发 Vite 依赖发现重载，已将 hash-wasm 加入 DEV 预构建，重启后首次上传不再重载；这不会在浏览器预加载或进入正式公共资源图。
- `hash-wasm.NOTICE.txt` 随私有入口包含完整 MIT 及 MD5/SHA/CRC32 上游所需声明。CN/Global 各一次正式构建与产物守卫通过，每地区仍为 24 个 Published 工具详情页；File Hash 专属 Worker、运行时代码、CSS 和通知均未泄漏，17 款 Draft 隔离不变。Frozen Lockfile 安装核对通过，远程 CI 结论另查本轮提交。Firefox/Safari、真实移动设备、超大文件/极限内存及浏览器进程级资源耗尽未测；390px 为桌面 Chromium 视口。复制仍需浏览器剪贴板权限，失败时显示手动复制反馈；无上传、持久保存或结果遥测。

## Batch File Renamer — V0.8-B5-D1 Beta 资格与详情页展示（2026-11-05）

- 依据维护者验收和本轮授权，提升 Batch File Renamer 的 CN/Global Published 源码资格，当前 29 款（12 Published / 17 Draft）；历史 15 + 7 工具名单不变。冻结文件名组合器和工作区，未改 `renamePlan()`、文件预算或其他工具业务。Quick/Advanced 共用可选名称、序号、高级起始值/位数/连接符，自动保留扩展名；名称为空仅编号，两者都关闭则保留原名。旧前后缀、查找替换交互已删除，不直接重命名磁盘文件。
- 双语 Astro 静态 SEO 各包含 4 项步骤、6 项限制、4 组 FAQ，明确 100 文件、单项 32 MiB、累计 96 MiB、ZIP 输出 128 MiB 及非法/重复名拒绝。下载点击时使用 `renamed-files-YYYYMMDD-HHmmss-SSS.zip`，同毫秒碰撞短计数；重复下载复用 Blob，不重打包。完整 fflate MIT 继续随按需入口交付。
- 全部详情页的 `ToolIntro.astro` 由路由传入工具 ID，直接复用现有 `FeaturedToolIcon`；标题组合居中，图标固定桌面 40px / 手机 32px、装饰性且 pixelated。`ToolGuide.astro` 复用实际目录 `ToolCards.astro`，仅增加 related 布局参数（最多三列、手机单列）；推荐仍使用同组/排除自身/最多三项的原算法与 Catalog 双语文案，正式构建只含 Published，不引入目录 Fixture 或客户端业务实现。`/tools/` 的 DOM 契约不变。
- Chromium 156 在 DEV 的 CN 中文 Dark / 1280px 与 Global 英文 Light / 390px 完成四种基本命名组合、高级参数往返、逐行冲突、增删、取消、清空和结果失效。实际下载 12 个 ZIP，Python zipfile 独立核对条目名称、CRC 和原始 PNG/JPEG/中文 UTF-8 字节；中文文件名、多点英文名、扩展名均正确。重复下载名称不同、结果 Blob 相同。复用未改业务在 `ec6893b` 的安全/资源/中文输入组合事件证据。
- DEV 两地区各 29 个真实静态页面通过唯一 H1、图标 ID、同组推荐顺序与空推荐检查；7 类页面实际检查桌面/手机尺寸与布局。标题 PNG 延迟 800ms 时，标题组合宽高和位置变化均为 0px；查看两主题标题与相关卡片截图，无横向溢出或页面运行错误。目录搜索、分类、身份筛选及分页实测通过，Fixture 隔离保留定向测试。
- `pnpm check`（444 文件，零错误/警告）和 17 个相关测试文件 / 248 项断言通过；CN/Global 各一次正式构建与产物守卫通过。四个 Renamer 页面静态 Title/Description、唯一 H1 图标、4/6/4 正文、同地区 Canonical/hreflang、可索引状态及 Sitemap/llms/目录均正确，每地区 24 个工具详情页 / 34 条公开发现 URL；17 款 Draft、Lab、Fixture 和专属资源仍隔离。新工具 JS/CSS 及完整 fflate MIT 正常按需交付。
- 正式静态预览再次通过 CN 中文 Dark / 1280px 与 Global 英文 Light / 390px 的 Published 标题、相关卡片、合法跳转、目录搜索/筛选；没有页面运行错误、横向溢出或明显样式闪现。独立复检正式预览另外 12 个真实 ZIP，路径、CRC、原始字节和重复下载均通过（本轮 DEV + 正式共 24 个 ZIP）；与 DEV 的区别仅是推荐过滤隐藏 Draft。
- [基线 `ec6893bdc6e4` 的既有 CI 已通过](https://github.com/librecosta/tool4furry/actions/runs/42001314739)；首轮新 CI 暴露导航/提色测试两处旧 Published 名单，已同步为 12 项且 2 文件 / 32 项定向复验通过；修正提交的 CI 需单独核对，不将本地成功代替远程结果。Firefox/Safari、真实 iOS/Android、极限内存和系统输入法未重测，390px 是桌面 Chromium 视口/触控模拟。源码 Published 不代表部署，未部署。

## Batch File Renamer — V0.8-B5-C 文件名组合器（2026-11-05）

- 快速/高级共用一份规则与 `renamePlan()`：可选名称 + 条件连接符 + 可关闭序号 + 原扩展名。默认直接输出 `001.ext`；名称和序号均留空/关闭时保留完整原名。高级仅展开起始值、位数和四种连接符；切换显示模式保留规则及有效输出。旧前后缀、查找替换及扩展名开关已删除，没有规则兼容层。
- 41 项定向测试、`pnpm check`（443 文件，零错误/警告）通过。Chromium 156 在 CN 中文 Dark / 1280px 与 Global 英文 Light / 390px 完成四种基本组合、高级参数往返、逐行冲突、增删/重新编号、重复下载与清空取消；Python zipfile 独立验证 12 个真实下载的路径、CRC 和原始字节。查看两主题空态/快速/高级/冲突截图，无横向溢出；DEV 重启冷载无 Hydration 报错。保持 Draft 与 11 Published / 18 Draft，未改 SEO、其他工具或文件资源预算，未重复正式构建。Firefox/Safari、真实移动设备及系统输入法未实测；中文组合输入事件已做定向验证。

## ZIP Manager — V0.8-B4-D3 Beta 资格（2026-11-05）

- 依据维护者本轮授权，只提升 ZIP Manager 的 CN/Global Published 源码资格；当前 11 Published / 18 Draft，历史 15 + 7 工具集合不变。D1/D2 双模式、紧凑布局、目录树、图标操作、自动命名和任务隔离全部冻结；未修改工作区组件、样式或 ZIP 核心。
- 中英文 Astro 静态 SEO 各包含 4 项步骤、6 项限制、4 组 FAQ。四个正式页面唯一 H1、Title/Description、同地区 Canonical/hreflang、Sitemap、llms.txt 和目录检查通过；原有首页四槽与身份人工映射不变，工作室可发现 ZIP，开发者不因 Definition roles 自动补入。
- 创建使用 ZipPassThrough / Store 原始字节打包，不保证压缩率；读取支持 Store/Deflate。保留创建 500 文件 / 单项 32 MiB / 累计 96 MiB / 输出 128 MiB、读取 64 MiB / 500 条目、展开单项 32 MiB / 累计 128 MiB。所选重打包仍受创建预算约束，不向本地目录直接写入；完整 fflate MIT 通知从工具懒加载入口交付。
- 14 个相关文件共 191 项定向测试通过（修正一处旧数量断言后单文件复验）；新增 Store/Deflate、同名不同目录、Unicode/二进制、绝对/穿越/重复路径、ZIP64、方法/编码拒绝、声明/实际解压大小和预算验证，保留 CRC、加密、异常压缩比、取消和迟到结果测试。`pnpm check`（440 文件）与 CN/Global 各一次正式构建及守卫通过；每地区 22 个工具详情页、32 条公开发现 URL，其余 Draft / Lab / Fixture 私有资源仍隔离。
- Chrome 156 正式预览复核 CN 中文 Dark / 1280px、Global 英文 Light / 390px（另查 320px）：文件与文件夹添加、移除、树折叠/选择/部分选中、单文件下载、所选重打包、模式恢复、取消和失效均通过；按钮等宽 44px / 无边框 / Purple，无横向溢出或 Hydration 报错。fflate 与 Python 标准库独立核对 10 个实际下载 ZIP 的路径、CRC 和逐项原始字节，重复下载名称不同、SHA-256 相同；清空后活动 Object URL 为零。未变功能同时复用下方 D1/D2 证据。
- 提交前核对：[D1 CI 已通过](https://github.com/librecosta/tool4furry/actions/runs/41856773953)，[最新 D2 `82a34d8` CI 已通过](https://github.com/librecosta/tool4furry/actions/runs/41864131756)；较早 `aba7238` CI 失败于未改动的 PDF 预览 Actual size/scale 断言，后续基线在相同 PDF 代码上通过，本轮未改动 PDF 工具。本轮提交后的既有工作流结果需单独核对，不以本地通过声称 L2 七项全通过。Firefox/Safari、真实 iOS/Android 和极限内存/大规模压力为 L3 未测；390px 为桌面 Chromium 视口与触控模拟。未部署。

## ZIP Manager — V0.8-B4-D1 交互打磨（2026-11-04）

- 创建/打开为独立模式，桌面左右布局、900px 以下上下布局；文件、目录展开、选中项和有效输出分别保留。创建、检查、批量导出及单项下载独立使用局部任务状态，共用执行锁；取消后等待原操作结束才释放执行槽，清空只影响当前模式。
- 使用安全相对路径投影目录树，默认展开前两级；折叠子树不挂载，列表独立滚动。Base UI Checkbox 从同一份文件路径集合计算文件夹全选/部分选中。Trash / Download 图标操作具有 Tooltip 和可访问名称；单项下载仍经过 `extractZip()` 的实际字节/CRC 检查，批量导出保留所选文件路径并生成新的 ZIP。
- 创建名称默认取单一根文件夹或 `archive`；打开模式取来源 ZIP 主体并加 `-selected`。下载当次添加本地 `YYYYMMDD-HHmmss-SSS`，同毫秒用短计数消重；安全处理 Windows 保留名称、非法字符及 Unicode 字节长度，不修改归档内部文件名。重复下载使用同一 Blob。
- D2 工作区减法：移除两模式的名称输入与同步状态，直接按上述规则自动命名；移除操作区重复的限制说明，静态指南和实际错误反馈继续保留。空输入不显示零统计；有文件时只显示一行摘要，打开模式的已选数量放在目录树标题旁。目录操作、任务隔离及安全预算不变。
- D2 定向复验：29 项相关测试、`pnpm check` 通过；冷启动 Chromium 在 CN 中文 Dark / 1280px、Global 英文 Light / 390px（另查 320px）完成自动命名、重复下载、目录选择、单项/批量下载和逐字节解压比较，模式保留、取消及危险路径拒绝通过。冷启动无 Hydration 报错，清空后活动 Object URL 为零；本轮未重复地区构建。
- 保留创建 500 项 / 单项 32 MiB / 累计 96 MiB、读取 64 MiB、展开单项 32 MiB / 累计 128 MiB 等边界：当前检查会读取完整归档，提取/重新打包仍累计内存，并非磁盘流式或 ZIP64 实现。继续使用 fflate / 原有 NOTICE 和 ZipPassThrough，不承诺 DEFLATE 压缩率；路径、重复项、加密、异常压缩比和 CRC 拒绝规则不变，仅补充检查阶段的 AbortSignal。
- `pnpm check`（440 文件）、30 项相关定向测试及 CN/Global 各一次构建/隔离守卫通过。Chrome 156 在 CN 中文 Dark / 1280px、Global 英文 Light / 390px 实际导入嵌套文件夹、创建并下载、打开/折叠/勾选、单文件下载、所选重打包；解压逐项比较路径和原始字节，验证重复下载、模式恢复、取消及危险路径拒绝。清理后活动 Object URL 为零。仍为 Draft，10 Published / 19 Draft 不变；未测 Firefox/Safari、真实移动设备及极限内存。

## Images to PDF — V0.8-B3-D2 Beta 资格（2026-11-04）

- 依据维护者验收和本轮授权，仅将 Images to PDF 提升为 CN/Global Published；冻结 PNG/JPEG 画廊、鼠标/长按/键盘排序、缩放平移预览、追加/移除、逐页生成、取消和失效管理。资源策略仍为宽松非阻断提醒，未重新加入数量/累计体积配额；不承诺无限处理或清除源图片隐私信息。
- 中英文静态 SEO 各含 4 项步骤、6 项限制、4 组 FAQ。四个正式页面均可索引，唯一 H1、Title/Description、Canonical/同地区 hreflang、目录、Sitemap 和 llms.txt 通过产物守卫。保留人工角色关联：工作室现显示三款 PDF 工具，画师不因 Definition 的 roles 自动新增首页精选；首页四槽不变。
- Chrome 156 在 DEV 和正式静态预览中复核 CN 中文 Dark / 1280px 与 Global 英文 Light / 390px：真实上传、鼠标/触控长按及键盘排序、缩放/平移/关闭及焦点恢复、删除/追加、取消/清空和下载失效均通过。三按钮等宽、44px、无边框且紫色主操作，未见横向溢出、阻断交互或明显样式闪现。
- 实际下载并以 pdf-lib 重读：输出顺序与当时画廊一致（含 `C → B → A`、`B → A → D`），逐页核对尺寸、JPEG 原始字节哈希、PNG 解码 RGB / alpha 哈希及 EXIF 6 方向矩阵。20,000×20 PNG 的 PDF 页面坐标按比例缩放为 14,400×14.4，嵌入像素仍为原始尺寸；重复下载名称不同、PDF 字节相同。清理后活动 Bitmap / URL 均为零，原生解码最大并发为 1。
- 复用未变业务代码在 `a594e20` 的 45 图 / 75,758,780 字节 / 29,603,200 像素与 45 页有效 PDF、失败恢复证据，不机械重跑压力样本。`pnpm check`（435 文件）及 18 个相关文件共 218 项定向测试通过；CN/Global 各一次正式构建与守卫通过，每地区 20 个工具页面、30 条公开发现 URL。合法共享 Comic PDF 模块及完整 pdf-lib MIT 通知随按需图交付，其余 19 款 Draft / Lab 的私有实现和资源仍被排除。
- [基线 `a594e20` 的既有 CI 已通过](https://github.com/librecosta/tool4furry/actions/runs/41843836846)；本轮提交继续由同一工作流复检，远程 CI 结论单独核对，不以本地成功代替。Firefox、Safari、真实 iOS/Android、浏览器进程级内存耗尽和极端规模仍属 L3 未测；390px 是桌面 Chromium 视口/触控模拟。源码 Published 不代表部署，未部署。

| ID | 实际能力 | 主要边界 |
| --- | --- | --- |
| `pdf-merge` | 文件排序、页数检查、顺序合并与 PDF 下载 | 100 文件、累计 96 MiB、1000 页；拒绝损坏/加密文件 |
| `pdf-split` | 真实页面缩略图、可缩放/拖拽的放大预览、点击或有序范围选页、单个 PDF / 所选逐页 ZIP | 单文件 32 MiB / 1000 页；PDF 输出 128 MiB；ZIP 所选最多 200 页 / 96 MiB；预览每批 24 页，放大栅格最多 200 万像素 |
| `images-to-pdf` | PNG/JPEG 画廊、拖拽/键盘排序、缩放平移预览、原比例 PDF、方向与透明度 | 独立宽松策略，原 40 页 / 32 MiB / 2400 万总像素仅用于提醒；实际解码、分配及 PDF 生成/验证失败时安全停止，不缩小原图 |
| `zip-manager` | 独立创建/打开模式、文件夹目录树、单文件下载、所选重打包、自动时间戳命名 | 创建 500 项/96 MiB；读取 64 MiB；展开单项 32 MiB、累计 128 MiB；拒绝 ZIP64/加密/不安全路径/异常压缩率，验证 CRC |
| `batch-file-renamer` | 快速/高级共用内嵌文件名组合器：可选名称、序号开关及高级起始值/位数/连接符；保留原扩展名、实时逐行预览与冲突提示、ZIP 下载 | 100 文件、单个 32 MiB、累计 96 MiB；非法/重复名称拒绝，原字节不变；默认仅序号，留空且关闭序号时保留完整原名 |
| `file-hash` | 默认 MD5；MD5/SHA-1/SHA-256/SHA-512/CRC32 多文件自动队列、逐项进度与预期值、复制及 TXT 清单 | 单 Worker、2 MiB 分块，无旧 32 MiB 配额；依赖 Worker/WebAssembly 与真实设备资源；不是加密或来源认证 |
| `text-cleaner` | CodeMirror 双编辑器、快速/高级实时清理、保留缩进、互斥空行规则、LF/CRLF、字符/行统计及复制/TXT | 无旧 50 万字符配额；大文本延迟处理与失效交付保护，实际规模依赖设备；编辑层 LF，导出明确选择换行格式 |
| `text-diff` | CodeMirror 双编辑器、结构化双行号差异、空行/EOF 标记、全部/仅变化、忽略行尾空白、实时比较与 TXT 报告 | 无固定字符/行数配额；独立 Worker 搜索 750ms / 总任务 5 秒截止，超时明确失败；长结果按需渲染 |
| `subtitle-tools` | SRT/WebVTT 导入、逐条预览、整体偏移、单条和源码编辑、复制及下载 | 单文件 32 MiB、字幕文本 16M UTF-16 代码单元、10 万条；不支持 NOTE/STYLE/REGION；转 SRT 提示元数据损失 |
| `json-formatter` | CodeMirror 双区、严格校验和定位、格式化与压缩、只读结构树、复制和 JSON 下载 | 保留原字面量、字段与重复项的顺序；解析、输出和树索引在专属 Worker，资源边界见 B10-D1 |
| `url-base64` | URL 组件与 UTF-8 Base64 编解码、复制/下载 | 50 万字符；严格检查 Base64/UTF-8；不是加密 |
| `timestamp-converter` | 时间戳/日期双向转换、精确秒/毫秒、UTC/本地输入、ISO 和 IANA 时区、单项复制 | 浏览器 Date 范围；拒绝缺少时区的 ISO、非法日期、闰秒及缺失或重复的本地时刻 |
| `qr-code-generator` | 三种艺术风格、标准样式自动降级、纠错等级、同源 PNG/SVG 下载、3D 沙盘截图 | 2,000 个 UTF-16 代码单元、128–2048 px；检查真实编码容量、模块密度和逐字节扫码结果 |
| `color-contrast` | HEX/RGB/HSL、可视化选色、WCAG 比值、AA/AAA、复制 | 不透明 sRGB；大文字阈值不替代实际字号检查 |
| `audio-trimmer` | 交互波形、保留/删除选区、循环试听、淡化与多格式导出 | 512 MiB 单声道/立体声输入，编解码按环境探测，内存导出预算 256 MiB，更大输出需浏览器直接写入 |
| `markdown-editor` | CodeMirror 格式化与查找、分栏同步、GFM、Alerts、数学公式、本地导入与 Markdown / HTML 交付 | 超过 160,000 个 UTF-16 单元暂停自动预览，HTML 渲染有独立预算。预览可关闭远程 Markdown 图片 |
| `video-frame-extractor` | 真实帧定位、四种提取模式、PNG/JPEG/WebP 帧画廊、联系表、流式 ZIP | 输入 2 GiB；单帧 40 MP；画廊 300 帧和 256 MiB；内存 ZIP 256 MiB；依赖浏览器解码 |
| `csv-json-converter` | 双栏 CodeMirror、双向转换、表格分页、UTF-8 CSV/TSV/JSON、完整下载 | CSV 输入 64 MiB，JSON 输入 16 Mi UTF-16 单元及 500,000 个节点，输出 64 MiB。[B18-D1](#csv--json-converter--v08-b18-d1) |
| `code-image-generator` | 9 种语言高亮、明暗图片主题、标题/行号/内边距、实时 Canvas 与 PNG | highlight.js 只注册所需语言；20000 字符/160 行；2× 输出最多 8192px、800 万像素，过长明确拒绝 |
| `svg-to-png` | 文件/源码、安全图片预览、比例联动尺寸/倍率、透明/纯色 PNG | 复用 Watermark 的 SVG 白名单和独立图像解码；256 KiB/512 节点/16 层，形状/路径/渐变/裁切；不支持文本、CSS、滤镜或外部资源；PNG 最多 800 万像素 |
| `regex-tester` | JavaScript flags、实时高亮/数量/捕获组、替换/复制 | 局部 Worker，1500ms 超时真实 terminate；表达式 500 字符、文本 20 万字符、1000 处匹配；与其他引擎可能不同 |
| `uuid-generator` | 安全 UUIDv4 单个/批量、大小写、逐项/全部复制、TXT | 每批 1–1000；仅使用 Crypto.getRandomValues，不提供其他 UUID 版本 |

文件和文本均不上传、不持久保存。PDF/原文件归档不承诺清理来源元数据。删除、清空或改变参数会作废结果；有界异步操作取消后仍等实际结束才释放当前执行槽。下载 URL 延时撤销，预览 URL 在失效/卸载时释放。

工具使用既有 Form Wide、受控 UI、Registry/显式 Loader 和默认图标回退。通用目录只抽取被多款工具实际使用的布局、文件行、交付、有界输入、单次任务及 PDF 操作；没有全局 Store 或新工作区引擎。新增运行依赖为 `qrcode`（MIT）与 `diff`（BSD-3-Clause），独立 QR 解码测试使用开发依赖 `jsqr`；第三方条款随对应懒加载工具分发。

## 第一批验证与待打磨

- `pnpm check`：0 错误、0 警告；121 项集中定向测试覆盖核心逻辑、实际 PDF/ZIP/WAV 内容、QR 独立解码、晚到结果/执行槽、分类、双语内容和发布隔离。
- CN 正式构建及原有产物守卫通过：仍为七款 Published、14 个双语工具页面；未执行此次无关的全量测试和双地区发布矩阵。
- 真实 Chromium：完成 CN 中文和 Global 英文核心操作；PDF 合并/拆分/逐页 ZIP、图片 PDF、目录 ZIP 提取、批量命名 ZIP、文件哈希、文本/字幕/时间戳、二维码和 WAV 导出；实际复制和文件下载正常。下载 PDF 重新解析确认页数/顺序，ZIP 解压核对路径及原字节；512px PNG 用 jsQR 独立读回 Unicode；WAV 为 44.1kHz 单声道 PCM16、选区 1 秒，采样与原文件对应，误差不超过 1 LSB。
- 390px 手机视口逐一打开 15 款工具，无横向溢出；另检查已加载文件与结果的移动布局、亮暗主题。手机视口不代表真实手机触控验证。
- 仍待后续打磨：专属图标、正式 SEO、操作密度和批量文件行体验；Firefox/Safari、真实 iOS/Android、低端设备与资源压力未测。没有取得 Beta/Published 资格，也未部署或触发远程 CI。

定向入口：`tests/general-toolbox-core.test.ts`、`tests/general-toolbox-jobs.test.tsx`、`tests/general-toolbox-publication.test.ts`；图片 PDF 的既有方向/预算测试见 `tests/comic-pdf.test.ts`。

## 第二批验收（V0.8-A2）

- 使用现有分类、默认图标回退、显式 Loader 和 Registry 资格；增加 Marked（MIT）、DOMPurify（Apache-2.0 选项）、Papa Parse（MIT）、highlight.js（BSD-3-Clause），许可随工具懒加载分发。未修改原有七款图片工具或第一批处理逻辑，未增加运行服务和生成素材。
- `pnpm check` 通过；98 项本轮核心/Worker/内容/发现定向测试通过，另复测第一批核心与任务失效回归。28 个新增地区/语言 DEV 页面均为 HTTP 200、静态 H1 和 Draft noindex。未重复全量测试或双地区正式构建。
- 真实 Chromium：Markdown 表格/任务/代码及不安全 HTML 清理、视图切换、复制/.md 下载；CSV 文件导入、多行引号、Unicode 与大整数字符串、反向 CSV 下载；Regex 捕获/替换及灾难性表达式真实超时后恢复；10 个大写 UUIDv4 的实际复制/TXT 下载。
- SVG 真实 PNG 下载为 160×80，复解码核对红色形状、透明 alpha 和指定绿色背景；代码分享图 PNG 为 832×424，高亮、标题、Unicode 与行号可读；三秒 VP8 视频分别提取 0/1/2 秒红绿蓝画面，ZIP 三张 160×90 PNG 解压后逐一核对像素，JPEG 也完整解码。参数变更使旧下载入口失效。
- 七款工具逐一检查 390px 视口，无横向溢出；覆盖 CN 中文与 Global 英文主要路径。手机视口不是触控真机证据。Firefox/Safari、真实移动设备、其他视频编解码及大型媒体压力仍未测，不宣称 Beta 或 Published。

定向入口：`tests/general-toolbox-a2.test.ts`、`tests/regex-worker.test.ts`，继续使用第一批发布与目录契约测试。后续仅按反馈集中打磨操作密度、正式 SEO、专属图标和兼容性。

## Images to PDF — 画廊与资源策略（2026-11-04）

- 直接复用 Comic 的 `galleryLayout` / `useGalleryDrag`，保留行优先页序、鼠标拖动、触控长按、自动滚动、Escape 与键盘排序；不实例化 ComicSession，不改变漫画的 UI/预算。放大查看复用 FilePreviewDialog / ImagePreviewViewport，关闭恢复焦点并撤销原图 URL。
- 本工具独立策略不再调用 `boundedFiles(40, 32 MiB, 20 MiB)` 或移动设备图片/PDF预算。旧数量、累计字节与总像素阈值只提醒，不阻断生成；保留真实格式/结构/方向检查、安全整数算术、浏览器解码/分配及 PDF 完整性边界。纯本地工具优先采用用户可控的宽松策略，但不批量改动其他工具。
- 仅做容器检查的导入不会解码全部原图。可见图片才请求最长边 480px 的缩略 Bitmap，缓存最多 48 张 / 8 MiB；与原图预览、逐页 PDF 导出共用 SerialJobs 单通道，输入变化/关闭/清空/卸载使旧任务不能交付。用户可取消长任务，原生操作真正结束后才释放执行槽；失败保留文件与顺序。
- PNG/JPEG 直接嵌入，保留方向与适用透明度，不改变原始像素；大图仅按比例调整 PDF 页面坐标以遵守 [PDF 默认用户空间尺寸](https://developer.adobe.com/acrobat-pdfl-sdk/guides/jsapiref/doc)。保存后核对页数、尺寸及每页的嵌入图像引用顺序。PDF 仍在内存中组装、保存与复检，并非流式 PDF，不能保证任意设备或规模成功。
- 三个 44px 等宽操作始终显示：生成 / 下载 / 清空；生成中另有取消入口。下载点击时使用 `images-YYYYMMDD-HHmmss-SSS.pdf`，同毫秒追加短序号，重复下载复用同一 Blob。
- 70 项相关定向测试和 `pnpm check`（435 文件，0 错误/警告）通过；真实 Chromium 156 在 CN 中文 Dark / 1280px 与 Global 英文 Light / 390px 完成鼠标、触控长按和键盘排序、预览缩放/平移、增删、取消、清空及真实下载。逐页核对 JPEG 嵌入字节、PNG RGB/Alpha 哈希、EXIF 方向和当前顺序；超宽 20000px 图片的原始嵌入宽度保留。
- 实际 45 张输入共 75,758,780 字节、29,603,200 像素（其中两张各约 36.1 MiB），生成并重读 45 页 / 75,746,503 字节有效 PDF；单通道最大并发 1，清理后活动 Bitmap / URL 为零。CN/Global 正式构建及画廊私有 JS/CSS 隔离守卫通过，当时仍为 Draft，资格为 9 Published / 20 Draft（当前提升见 Beta 资格小节）。Firefox/Safari、真实 iOS/Android、浏览器进程级内存耗尽及极端规模未测；390px 是桌面 Chromium 触控模拟。

## PDF Split — D1 可视选页（2026-11-04）

- 上传后默认全选；真实缩略图、范围输入和全部/已选视图共用选页状态。手动范围保留指定顺序，点击页卡按原页码升序整理。无效/空范围、文件更换、模式变化和清空立即使旧结果失效；提取、下载、清空三个按钮始终等宽显示。
- PDF.js 固定为 `6.5.438`，只在有效文件导入后动态加载。Worker 及所需 CMap、标准字体、编解码资源使用 Vite 本地哈希 URL；完整 Apache-2.0 和附带字体/编解码许可随私有模块分发。另读一份 File 数据供 Worker 转移，pdf-lib 仍独立负责输出和验证，不将 Canvas 用于导出。
- 预览每批 24 页、进入视口后排队串行绘制；缩略图最多 10 万像素，放大页最多 200 万像素，PDF.js 嵌入图像栅格化预算为 16 MiB。文档加载 20 秒、单页 15 秒超时回收；切批/关闭/更换/清空会取消任务并释放 Canvas，文档卸载释放 Worker。PDF.js 内部解析/原始解码可能有额外瞬时内存，不承诺所有复杂 PDF 的固定峰值。
- 单个 PDF 使用当前选页顺序，仍受 128 MiB 输出限制；逐页 ZIP 只导出已选页面，最多 200 页/96 MiB，文件名保留原页码，例如 `page-008.pdf`。从 500 页来源选择 10 页可以导出，不按来源总页数错误拒绝。
- 定向测试覆盖实际 PDF 内容流/方向/顺序、ZIP 解压、范围双向同步、旧任务隔离、取消/超时和许可完整性。真实 Chromium 156 完成 10 页缩略图、键盘选择、放大/Escape/焦点恢复、PDF 和 ZIP 下载复检，以及 500 页来源选择 491–500 页的 ZIP；逐页解析的内容流、尺寸和旋转与来源一致。
- CN/Global 中英文、Dark/Light、1280px/390px 视口未见横向溢出；三按钮为 44px 等宽无边框。抽样已选 10 页共约 80 万 Canvas 像素、一个 Worker；清空后为零 Canvas/Worker。损坏/超大输入安全拒绝，预览加载失败会明确提示且仍可提取原 PDF。
- `pnpm check` 通过（424 文件、0 错误/警告）；17 项 PDF Split/发布定向测试通过，CN/Global 各一次正式构建及隔离守卫通过。仍为 CN/Global Draft，正式产物不包含 PDF.js、Worker、私有资源或专属 CSS；未运行无关全量矩阵。Firefox/Safari、真实移动设备、复杂 PDF 字体/表单全矩阵及临界规模压力未测。

定向入口：`tests/pdf-split-core.test.ts`、`tests/pdf-split-preview.test.ts`、`tests/pdf-split-ui.test.tsx`、`tests/pdf-split-loader.test.ts`。

## PDF Split — V0.8-B2-D1 Beta 资格（2026-11-04）

- 按维护者授权完成双语静态 SEO：4 项步骤、6 项限制、4 组 FAQ；唯一 H1、Title/Description、Canonical/hreflang、OG、Sitemap 和 llms 沿用现有静态系统。该次只提升 PDF Split 为 CN/Global Published，发布时为 9 Published / 20 Draft，历史两批 ID 不变；工作室关联继续使用原人工配置。
- 两款 PDF 在每次 Download 点击时命名：`merged-YYYYMMDD-HHmmss-SSS.pdf`、`源文件名-extracted-YYYYMMDD-HHmmss-SSS.pdf`、`源文件名-pages-YYYYMMDD-HHmmss-SSS.zip`。使用本地时间，同毫秒碰撞追加 `-2`、`-3`；源名去掉末尾 PDF 扩展名、过滤路径/控制字符和 Windows 非法字符，按 UTF-8 字节有界截断，空名用 `document`。重复下载复用同一 Blob，不重新处理，也不改变 ZIP 内的页名。
- 真实 Chromium 156 完成默认全选、点击/有序输入、已选视图、旋转页放大/Escape/焦点恢复、替换和错误范围拒绝。下载的选页为 8→1→2→3→5，重新解析确认 5 页内容流、尺寸和旋转与来源一致；ZIP 解压为 `page-008/001/002/003/005.pdf`，各自内容与来源对应。PDF/ZIP 连续下载名称不同且字节完全相同；另复检 PDF Merge 真实三页合并和重复下载。500 页中选择 10 页的证据复用上轮 D1，不重复压力验证。
- CN 中文 Dark 桌面、Global 英文 Light 390px 的缩略图、Dialog、紫色主操作和禁用态可用，无横向溢出；卸载/更换/清空沿用取消与版本隔离，清空后无残留 Canvas/Worker。PDF.js 的惰性导入、独立读取字节、24 页批次、串行与像素/超时预算不变；未引入 Viewer UI 或远程 Worker。
- 158 项命名/PDF UI/输出/预览/发布/发现定向测试和 `pnpm check` 通过（426 文件，0 错误/警告）。CN/Global 正式构建各生成 18 个双语工具页面；产物守卫核对四个 PDF Split 页面、28 条公开发现 URL、Worker/CMap/字体/编解码资源原始字节与完整 PDF.js/pdf-lib/fflate 许可，其他 20 款 Draft 仍隔离。真实静态预览中再次下载 PDF/ZIP、核对连续下载字节与本地 Worker，未见资源错误或运行异常。
- 基线 `c1e0123` 的[既有 CI 全部通过](https://github.com/librecosta/tool4furry/actions/runs/41830254636)；本轮首次集成 CI 暴露目录/Converter/工具外壳中四组旧八工具名单，已同步为九款并保留资格过滤断言，另定向复验 59 项。修正仍由相同 GitHub Actions 复检，不将本地构建当作远程 CI 结果。Firefox/Safari、真实 iOS/Android、复杂 PDF 全矩阵和临界内存压力属于未测 L3；桌面手机视口不是真机证据。源码资格不代表部署，未部署。

新增命名定向入口：`tests/pdf-download-name.test.ts`；既有 PDF 输出内容、任务失效和资源检查均保留。

## PDF Merge — V0.8-B1-D1 Beta资格（2026-11-04）

- 双语静态 SEO 完成：每种语言 4 项步骤、6 项限制、3 组原生 FAQ；Title、Description、H1、Intro 使用维护者定稿。保留紫色主操作、三等宽按钮及既有鼠标/触屏长按/键盘排序，不修改 PDF 算法或其他工具资格。
- 真实 Chromium 在 DEV 和 Published 静态预览中完成导入、双向鼠标排序、键盘排序、合并与实际下载。样本 A 为两页、B 为一页；B→A 输出完整解析为 3 页，尺寸依次为 400×400、300×400、310×400，方向与逐页解压内容流均与来源一致。CN 中文与 Global 英文下载均复检通过；重排、移除、清空使旧下载失效，损坏 PDF 明确报错。
- 定向测试验证实际页内容/顺序、加密/损坏拒绝、100 文件/32 MiB 单项/96 MiB 累计/1000 页/128 MiB 输出边界、取消/晚到结果、重复提交、排序及下载资格。139 项核心/UI/发现/发布定向测试通过，另通过受影响导航断言；`pnpm check` 为 0 错误、0 警告。
- CN/Global 各一次正式构建及产物守卫通过：各 16 个双语工具页面、26 条公开发现 URL；PDF Merge 的四个地区/语言页面可索引，Canonical/hreflang、目录、导航总精选与工作室关联正确。pdf-lib / dnd-kit MIT 许可完整交付，21 款 Draft 的路由、实现入口、私有 Worker/NOTICE 保持排除，静态长文不进入客户端实现。未运行无关多工具夹具。
- 基线 `32e474e` 的 CI 在首页图片归属断言失败；本次补齐既有导航图标的精确 Registry/URL 归属，同时保留原始图片字节与资格校验。首次集成 CI 另发现一处旧七工具名单断言，已同步且保留原有检查；修正提交 `b39e8ca` 的[既有 CI 全部通过](https://github.com/librecosta/tool4furry/actions/runs/41676614664)（check、1138 项测试、CN/Global 构建）。L2 七项满足，依据维护者授权确认 Published；不新增工作流。
- 桌面及 390px 手机视口的中英文核心路径、亮暗主题与等宽按钮可用，无横向溢出。视口模拟不是触控真机证据；Firefox、Safari、真实 iOS/Android、低端设备、临界规模压力和原生操作瞬时内存仍属 L3 未测。源码 Published 不代表部署，未部署。

## CSV / JSON Converter — V0.8-B18-D1

B18-D2 完成双语静态 SEO，工具已取得 CN/Global Published 源码资格。桌面使用上方转换工具栏与等宽输入/结果栏，窄屏上下排列。通过顶部工具栏切换方向，两个方向各自保留输入草稿。可复制有效结果并粘贴到另一方向的输入栏。中英文工作区使用同一份英文示例。

默认 CSV → JSON 保留字符串、以首行为表头并自动检测分隔符。支持四种分隔符、表头开关、对象或数组输出、空值选项及缩进。智能推断只接受小写布尔值和可安全保留有效数字的普通十进制数字。前导零、超长数字、科学计数形式和风险小数保留为原始字符串。结构性换行与带引号字段内部的换行单独处理。对象表头必须非空且唯一，所有记录需要相同字段数。

JSON → CSV 复用 JSON Formatter 的严格源码范围解析，按源码字段首次出现顺序生成列。数字与嵌套 JSON 保留原始数字字面量。嵌套对象可按点路径展开，冲突明确报错；数组保留在原单元格，缺失与 null 均输出为空字段。公式防护默认关闭，开启后会同时改写可疑表头与数据。CSV/TSV 输出共用既定分隔符、换行与 BOM 设置。

专属 Worker 对 CSV 文件分块解码，以完整逻辑记录交由 Papa Parse 解析。JSON 输入采用有界 AST。输出分段编码为 Blob，表格按字节索引复用实际输出，支持每页 50、100、200 行以及按列分组浏览。源码预览预算为 256 Ki UTF-16 单元，超出时保留完整下载。第三方通知复用 Papa Parse、CodeMirror 和 JSON 语言扩展的完整 MIT 文本。双地区生产产物守卫检查专属入口、Worker、局部 CSS 和 Papa Parse 许可随工具按需交付。JSON 语法由本工具与 JSON Formatter 共用。

下载在点击时生成 `{basename}-{yyyyMMdd-HHmmss-SSS}.{extension}`，使用浏览器本地时间。同一毫秒内后续下载依次追加 `-2`、`-3`。导入文件保留清理后的基本名称，手动输入和示例使用 `converted`。扩展名及 MIME 随实际 JSON、CSV 或 TSV 输出确定。[B18 浏览器与下载复检](evidence/b18-csv-json/README.md)
