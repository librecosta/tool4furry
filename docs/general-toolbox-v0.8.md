# V0.8 通用工具初版

两批共 22 款工具（15 + 7）；PDF Merge / PDF Split 已获得 CN/Global Published 源码资格，其余 20 款保持 Draft。加上七款既有 Published 图片工具，共 29 款（9 Published / 20 Draft）。第二批基于第一批本地提交 `e7cd6bf` 继续，未覆盖未推送成果。DEV 入口：CN `http://127.0.0.1:4321/tools/`、Global `http://127.0.0.1:4322/tools/`；非默认语言分别使用 `/en/tools/`、`/zh/tools/`。生产不包含这些 Draft 路由或专用实现。

| ID | 实际能力 | 主要边界 |
| --- | --- | --- |
| `pdf-merge` | 文件排序、页数检查、顺序合并与 PDF 下载 | 100 文件、累计 96 MiB、1000 页；拒绝损坏/加密文件 |
| `pdf-split` | 真实页面缩略图/放大、点击或有序范围选页、单个 PDF / 所选逐页 ZIP | 单文件 32 MiB / 1000 页；PDF 输出 128 MiB；ZIP 所选最多 200 页 / 96 MiB；预览每批 24 页 |
| `images-to-pdf` | PNG/JPEG 排序、原比例多页 PDF、方向与透明度 | 复用 Comic PDF；40 页、32 MiB、2400 万总像素及既有图片预算 |
| `zip-manager` | 文件/文件夹 ZIP、目录浏览、选择提取、选中项 ZIP | 创建 500 项/96 MiB；读取 64 MiB；展开单项 32 MiB、累计 128 MiB；拒绝 ZIP64/加密/不安全路径/异常压缩率，验证 CRC |
| `batch-file-renamer` | 前后缀、查找替换、序号、保留扩展名、名称预览及 ZIP | 100 文件、单个 32 MiB、累计 96 MiB；非法/重复名称拒绝，原字节不变 |
| `file-hash` | SHA-256、复制、预期哈希比较 | 单文件 32 MiB；需安全上下文 Web Crypto；不是加密 |
| `text-cleaner` | 独立空白/空行/换行选项、Unicode/词段/汉字统计、前后对照、复制/下载 | 50 万 UTF-16 代码单元；词段依赖浏览器分词 |
| `text-diff` | 行级增删对照、忽略行末空白、数量、文本导出 | 每侧 10 万字符/4000 行；差异计算有时间和编辑量上限 |
| `subtitle-tools` | SRT/WebVTT 互转、毫秒偏移、多行字幕、条目检查、下载 | 5000 条；不支持 NOTE/STYLE/REGION；转 SRT 提示定位设置丢失 |
| `json-formatter` | 校验、2/4 空格、单行压缩、复制/下载 | 50 万字符、128 层、格式化结果 400 万字符；保留原数字字面量，避免大整数舍入 |
| `url-base64` | URL 组件与 UTF-8 Base64 编解码、复制/下载 | 50 万字符；严格检查 Base64/UTF-8；不是加密 |
| `timestamp-converter` | 明确秒/毫秒/带时区 ISO、UTC/本地展示、复制 | 不猜单位；拒绝无时区 ISO、非法日期和闰秒 |
| `qr-code-generator` | 标准二维码、尺寸/前背景色、PNG/SVG 下载、内容复制 | 2000 字符、128–2048px；深色前景、浅色背景、对比度与模块尺寸检查 |
| `color-contrast` | HEX/RGB/HSL、可视化选色、WCAG 比值、AA/AAA、复制 | 不透明 sRGB；大文字阈值不替代实际字号检查 |
| `audio-trimmer` | 波形、起止时间、选区试听、真实 PCM16 WAV 导出与复检 | 输入 20 MiB/180 秒/双声道，解码缓冲 64 MiB；原生解码可能额外瞬时占用内存，无 MP3/AAC 输出 |
| `markdown-editor` | 实时 GFM、双栏/编辑/预览、复制及 .md 下载、示例/清空 | 10 万字符；Marked + DOMPurify，移除脚本、图片及嵌入内容；不自动保存 |
| `video-frame-extractor` | 原生播放器/时间轴、PNG/JPEG 单帧与间隔批量、尺寸/质量、ZIP | 输入 100 MiB/30 分钟/1600 万像素；单帧 800 万像素，批量 40 帧/8000 万像素/96 MiB；依赖浏览器编解码，不保证逐帧精度 |
| `csv-json-converter` | UTF-8 文件/粘贴、逗号/分号/Tab、双向转换、表格/复制/下载 | 文件 2 MiB、100 万字符、10000 行/100 列/20 万单元格；CSV 为字符串，JSON 为标量对象数组，拒绝不安全整数 |
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

- 按维护者授权完成双语静态 SEO：4 项步骤、6 项限制、4 组 FAQ；唯一 H1、Title/Description、Canonical/hreflang、OG、Sitemap 和 llms 沿用现有静态系统。只提升 PDF Split 为 CN/Global Published，当前 9 Published / 20 Draft，历史两批 ID 不变；工作室关联继续使用原人工配置。
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
