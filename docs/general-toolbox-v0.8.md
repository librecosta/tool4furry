# V0.8 通用工具初版

15 款工具均为 CN/Global Draft，既有七款图片工具保持 Published。DEV 入口：CN `http://127.0.0.1:4321/tools/`、Global `http://127.0.0.1:4322/tools/`；非默认语言分别使用 `/en/tools/`、`/zh/tools/`。生产不包含这些 Draft 路由或专用实现。

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

文件和文本均不上传、不持久保存。PDF/原文件归档不承诺清理来源元数据。删除、清空或改变参数会作废结果；有界异步操作取消后仍等实际结束才释放当前执行槽。下载 URL 延时撤销，预览 URL 在失效/卸载时释放。

工具使用既有 Form Wide、受控 UI、Registry/显式 Loader 和默认图标回退。通用目录只抽取被多款工具实际使用的布局、文件行、交付、有界输入、单次任务及 PDF 操作；没有全局 Store 或新工作区引擎。新增运行依赖为 `qrcode`（MIT）与 `diff`（BSD-3-Clause），独立 QR 解码测试使用开发依赖 `jsqr`；第三方条款随对应懒加载工具分发。

## 验证与待打磨

- `pnpm check`：0 错误、0 警告；121 项集中定向测试覆盖核心逻辑、实际 PDF/ZIP/WAV 内容、QR 独立解码、晚到结果/执行槽、分类、双语内容和发布隔离。
- CN 正式构建及原有产物守卫通过：仍为七款 Published、14 个双语工具页面；未执行此次无关的全量测试和双地区发布矩阵。
- 真实 Chromium：完成 CN 中文和 Global 英文核心操作；PDF 合并/拆分/逐页 ZIP、图片 PDF、目录 ZIP 提取、批量命名 ZIP、文件哈希、文本/字幕/时间戳、二维码和 WAV 导出；实际复制和文件下载正常。下载 PDF 重新解析确认页数/顺序，ZIP 解压核对路径及原字节；512px PNG 用 jsQR 独立读回 Unicode；WAV 为 44.1kHz 单声道 PCM16、选区 1 秒，采样与原文件对应，误差不超过 1 LSB。
- 390px 手机视口逐一打开 15 款工具，无横向溢出；另检查已加载文件与结果的移动布局、亮暗主题。手机视口不代表真实手机触控验证。
- 仍待后续打磨：专属图标、正式 SEO、操作密度和批量文件行体验；Firefox/Safari、真实 iOS/Android、低端设备与资源压力未测。没有取得 Beta/Published 资格，也未部署或触发远程 CI。

定向入口：`tests/general-toolbox-core.test.ts`、`tests/general-toolbox-jobs.test.tsx`、`tests/general-toolbox-publication.test.ts`；图片 PDF 的既有方向/预算测试见 `tests/comic-pdf.test.ts`。
