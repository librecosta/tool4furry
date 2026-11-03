# V0.8 通用工具初版

两批共 22 款工具（15 + 7）；PDF Merge 已获得 CN/Global Published 源码资格，其余 21 款保持 Draft。加上七款既有 Published 图片工具，共 29 款（8 Published / 21 Draft）。第二批基于第一批本地提交 `e7cd6bf` 继续，未覆盖未推送成果。DEV 入口：CN `http://127.0.0.1:4321/tools/`、Global `http://127.0.0.1:4322/tools/`；非默认语言分别使用 `/en/tools/`、`/zh/tools/`。生产不包含这些 Draft 路由或专用实现。

| ID | 实际能力 | 主要边界 |
| --- | --- | --- |
| `pdf-merge` | 文件排序、页数检查、顺序合并与 PDF 下载 | 100 文件、累计 96 MiB、1000 页；拒绝损坏/加密文件 |
| `pdf-split` | 有序页码范围提取、全部逐页 PDF ZIP | 单文件 32 MiB；重复/倒序/越界拒绝；逐页最多 200 页、96 MiB |
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

## PDF Merge — V0.8-B1-D1 Beta资格（2026-11-04）

- 双语静态 SEO 完成：每种语言 4 项步骤、6 项限制、3 组原生 FAQ；Title、Description、H1、Intro 使用维护者定稿。保留紫色主操作、三等宽按钮及既有鼠标/触屏长按/键盘排序，不修改 PDF 算法或其他工具资格。
- 真实 Chromium 在 DEV 和 Published 静态预览中完成导入、双向鼠标排序、键盘排序、合并与实际下载。样本 A 为两页、B 为一页；B→A 输出完整解析为 3 页，尺寸依次为 400×400、300×400、310×400，方向与逐页解压内容流均与来源一致。CN 中文与 Global 英文下载均复检通过；重排、移除、清空使旧下载失效，损坏 PDF 明确报错。
- 定向测试验证实际页内容/顺序、加密/损坏拒绝、100 文件/32 MiB 单项/96 MiB 累计/1000 页/128 MiB 输出边界、取消/晚到结果、重复提交、排序及下载资格。139 项核心/UI/发现/发布定向测试通过，另通过受影响导航断言；`pnpm check` 为 0 错误、0 警告。
- CN/Global 各一次正式构建及产物守卫通过：各 16 个双语工具页面、26 条公开发现 URL；PDF Merge 的四个地区/语言页面可索引，Canonical/hreflang、目录、导航总精选与工作室关联正确。pdf-lib / dnd-kit MIT 许可完整交付，21 款 Draft 的路由、实现入口、私有 Worker/NOTICE 保持排除，静态长文不进入客户端实现。未运行无关多工具夹具。
- 基线 `32e474e` 的 CI 在首页图片归属断言失败；本次补齐既有导航图标的精确 Registry/URL 归属，同时保留原始图片字节与资格校验。提交后的结果由[既有 CI](https://github.com/librecosta/tool4furry/actions/workflows/ci.yml?query=branch%3Adevelop)验证；不新增工作流。
- 桌面及 390px 手机视口的中英文核心路径、亮暗主题与等宽按钮可用，无横向溢出。视口模拟不是触控真机证据；Firefox、Safari、真实 iOS/Android、低端设备、临界规模压力和原生操作瞬时内存仍属 L3 未测。源码 Published 不代表部署，未部署。
