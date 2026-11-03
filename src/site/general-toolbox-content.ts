import type { ToolContentMap } from './tool-content';
// Static Astro content only.
export const generalToolboxContent = {
  'pdf-merge': {
    zh: {
      title: '在线 PDF 合并工具 - 拖拽排序与本地合并 | Tool4Furry',
      description: '免费在线合并多个 PDF 文件，自由调整文件顺序，一键生成并下载合并后的 PDF。无需上传服务器，所有处理均在浏览器本地完成。',
      h1: 'PDF 合并',
      intro: '将多个 PDF 整理成一份文档。添加文件、调整顺序，然后合并下载。',
      steps: [
        '**添加 PDF：** 选择或拖入需要合并的 PDF 文件，可一次添加多个。',
        '**调整顺序：** 拖动文件行改变合并顺序，也可以移除不需要的文件。',
        '**合并文件：** 点击「合并 PDF」，等待浏览器完成处理。',
        '**下载结果：** 合并成功后点击「下载 PDF」，保存生成的文档。',
      ],
      limitations: [
        '支持浏览器本地合并常规 PDF 文件。',
        '最多 100 个文件、累计 96 MiB、单文件 32 MiB，合并后最多 1000 页。',
        '输出 PDF 最大 128 MiB。',
        '不支持加密、损坏或无法正常解析的 PDF。',
        '文件不会上传到服务器，也不会由本站持久保存。',
        '合并耗时和可处理规模受浏览器及设备资源限制。',
      ],
      faq: [
        { question: 'PDF 文件会上传到服务器吗？', answer: '不会。文件读取、排序和合并均在当前浏览器中完成，本站不会接收或持久保存这些文件。' },
        { question: '可以自己调整 PDF 合并顺序吗？', answer: '可以。拖动文件行即可改变顺序，最终 PDF 会按照列表顺序合并。重新排序后需要重新生成合并结果。' },
        { question: '为什么有些 PDF 不能合并？', answer: '损坏、加密、无法解析或超过工具资源限制的文件可能无法处理。可以检查原文件是否能正常打开，以及是否超出文件和页数限制。' },
      ],
    },
    en: {
      title: 'Merge PDF Files Online - Reorder & Download | Tool4Furry',
      description: 'Merge multiple PDF files for free, arrange them in any order, and download the result. All processing happens locally in your browser without uploading files.',
      h1: 'PDF Merge',
      intro: 'Bring multiple PDF files into one document. Add your files, arrange their order, and download the merged result.',
      steps: [
        '**Add PDFs:** Choose or drop the PDF files you want to combine.',
        '**Arrange files:** Drag files to change their order, or remove files you no longer need.',
        '**Merge:** Select Merge and let your browser process the documents.',
        '**Download:** When the merged PDF is ready, select Download to save it.',
      ],
      limitations: [
        'Combines standard PDF files locally in your browser.',
        'Up to 100 files, 96 MiB total, 32 MiB per file, and 1,000 combined pages.',
        'Maximum output size: 128 MiB.',
        'Encrypted, damaged, or unsupported PDFs cannot be processed.',
        'Files are not uploaded or persistently stored by Tool4Furry.',
        'Processing time and available capacity depend on the browser and device.',
      ],
      faq: [
        { question: 'Are my PDF files uploaded to a server?', answer: 'No. Files are read, reordered and merged in your browser. Tool4Furry does not receive or persistently store them.' },
        { question: 'Can I change the order of my PDFs?', answer: 'Yes. Drag the file rows into the order you want. The merged PDF follows that list. Reordering files invalidates the previous result, so merge again before downloading.' },
        { question: "Why can’t some PDFs be merged?", answer: 'Encrypted, damaged, unparseable or oversized files may be rejected. Check that the originals open correctly and stay within the file and page limits.' },
      ],
    },
  },
  'pdf-split': {
    zh: {
      title: 'PDF 拆分 | Tool4Furry',
      description: '提取指定页码，或将每一页保存为独立 PDF。',
      h1: 'PDF 拆分',
      intro: '提取指定页码，或将每一页保存为独立 PDF。',
      steps: [
        '添加一个 PDF',
        '输入页码范围，例如 1-3,5',
        '提取页面或下载逐页 ZIP。',
      ],
      limitations: [
        '单个 PDF 上限 32 MiB、1000 页；逐页 ZIP 最多 200 页、96 MiB 结果。重复或越界范围会被拒绝。',
        '所有文件与文本均在当前浏览器本地处理，不上传、不持久保存。',
      ],
    },
    en: {
      title: 'PDF Split | Tool4Furry',
      description:
        'Extract selected pages or save every page as a separate PDF.',
      h1: 'PDF Split',
      intro: 'Extract selected pages or save every page as a separate PDF.',
      steps: [
        'Add a PDF',
        'enter a range such as 1-3,5',
        'extract pages or export a per-page ZIP.',
      ],
      limitations: [
        'PDF input: 32 MiB and 1,000 pages. Per-page ZIP: 200 pages, 96 MiB of results. Duplicate or invalid ranges are rejected.',
        'Files and text stay in your browser, without uploads or persistent storage.',
      ],
    },
  },
  'images-to-pdf': {
    zh: {
      title: '图片转 PDF | Tool4Furry',
      description: '按原图比例生成多页 PDF。',
      h1: '图片转 PDF',
      intro: '按原图比例生成多页 PDF。',
      steps: ['添加 PNG 或 JPEG', '调整图片顺序', '生成并下载 PDF。'],
      limitations: [
        '最多 40 张、累计 32 MiB、2400 万总像素。PNG/JPEG 直接嵌入，支持已验证方向与透明度，来源元数据可能保留。',
        '所有文件与文本均在当前浏览器本地处理，不上传、不持久保存。',
      ],
    },
    en: {
      title: 'Images to PDF | Tool4Furry',
      description: 'Create a multi-page PDF with original image proportions.',
      h1: 'Images to PDF',
      intro: 'Create a multi-page PDF with original image proportions.',
      steps: [
        'Add PNG or JPEG images',
        'adjust their order',
        'create and download the PDF.',
      ],
      limitations: [
        'Up to 40 images, 32 MiB total and 24 million combined pixels. PNG/JPEG are embedded directly with supported orientation and transparency; source metadata may remain.',
        'Files and text stay in your browser, without uploads or persistent storage.',
      ],
    },
  },
  'zip-manager': {
    zh: {
      title: 'ZIP 管理 | Tool4Furry',
      description: '创建包含目录的 ZIP，浏览并提取现有归档。',
      h1: 'ZIP 管理',
      intro: '创建包含目录的 ZIP，浏览并提取现有归档。',
      steps: [
        '选择文件或文件夹创建 ZIP',
        '或打开现有 ZIP',
        '提取单个文件或选中项。',
      ],
      limitations: [
        '创建：500 项、96 MiB 输入。打开：64 MiB 归档、500 项、单项 32 MiB、展开累计 128 MiB。拒绝加密、ZIP64、不安全路径及异常压缩率，不修改磁盘原文件。',
        '所有文件与文本均在当前浏览器本地处理，不上传、不持久保存。',
      ],
    },
    en: {
      title: 'ZIP Manager | Tool4Furry',
      description:
        'Create ZIPs with folders, browse archives and extract files.',
      h1: 'ZIP Manager',
      intro: 'Create ZIPs with folders, browse archives and extract files.',
      steps: [
        'Choose files or a folder to create a ZIP',
        'or open an existing ZIP',
        'extract one file or selected entries.',
      ],
      limitations: [
        'Creation: 500 entries, 96 MiB input. Opening: 64 MiB archive, 500 entries, 32 MiB per entry, 128 MiB expanded total. Encryption, ZIP64, unsafe paths and excessive compression ratios are rejected. Disk originals are unchanged.',
        'Files and text stay in your browser, without uploads or persistent storage.',
      ],
    },
  },
  'batch-file-renamer': {
    zh: {
      title: '批量文件重命名 | Tool4Furry',
      description: '预览命名规则并下载保留原始字节的 ZIP。',
      h1: '批量文件重命名',
      intro: '预览命名规则并下载保留原始字节的 ZIP。',
      steps: ['导入文件', '设置前后缀、替换与序号', '检查名称并打包下载。'],
      limitations: [
        '最多 100 个文件、单个 32 MiB、累计 96 MiB。非法或重复名称不能导出，不直接重命名磁盘文件。',
        '所有文件与文本均在当前浏览器本地处理，不上传、不持久保存。',
      ],
    },
    en: {
      title: 'Batch File Renamer | Tool4Furry',
      description:
        'Preview naming rules and download a ZIP with unchanged file bytes.',
      h1: 'Batch File Renamer',
      intro:
        'Preview naming rules and download a ZIP with unchanged file bytes.',
      steps: [
        'Import files',
        'set prefixes, suffixes, replacements and numbers',
        'check names and download a ZIP.',
      ],
      limitations: [
        'Up to 100 files, 32 MiB each and 96 MiB total. Invalid or duplicate names prevent export. Files on disk are not renamed.',
        'Files and text stay in your browser, without uploads or persistent storage.',
      ],
    },
  },
  'file-hash': {
    zh: {
      title: '文件哈希 | Tool4Furry',
      description: '计算 SHA-256 并与预期哈希比较。',
      h1: '文件哈希',
      intro: '计算 SHA-256 并与预期哈希比较。',
      steps: ['选择文件', '计算 SHA-256', '复制哈希或输入预期值核对。'],
      limitations: [
        '单文件上限 32 MiB，需安全上下文中的 Web Crypto。哈希用于完整性核对，不是加密。',
        '所有文件与文本均在当前浏览器本地处理，不上传、不持久保存。',
      ],
    },
    en: {
      title: 'File Hash | Tool4Furry',
      description: 'Calculate SHA-256 and compare it with an expected hash.',
      h1: 'File Hash',
      intro: 'Calculate SHA-256 and compare it with an expected hash.',
      steps: [
        'Choose a file',
        'calculate SHA-256',
        'copy or compare the hash.',
      ],
      limitations: [
        'Maximum file size: 32 MiB. Requires Web Crypto in a secure context. Hashes verify integrity; they do not encrypt files.',
        'Files and text stay in your browser, without uploads or persistent storage.',
      ],
    },
  },
  'text-cleaner': {
    zh: {
      title: '文本清理 | Tool4Furry',
      description: '清理空白与换行，对比处理前后文本。',
      h1: '文本清理',
      intro: '清理空白与换行，对比处理前后文本。',
      steps: ['输入或粘贴文本', '独立选择清理选项', '比较并复制或下载。'],
      limitations: [
        '最多 50 万个 UTF-16 代码单元。字符、词段及汉字分别统计，分词遵循浏览器语言能力。',
        '所有文件与文本均在当前浏览器本地处理，不上传、不持久保存。',
      ],
    },
    en: {
      title: 'Text Cleaner | Tool4Furry',
      description:
        'Clean whitespace and line endings, with before-and-after text.',
      h1: 'Text Cleaner',
      intro: 'Clean whitespace and line endings, with before-and-after text.',
      steps: [
        'Enter text',
        'toggle individual cleanup options',
        'compare, copy or download.',
      ],
      limitations: [
        'Up to 500,000 UTF-16 code units. Counts distinguish characters, word segments and Han characters using browser language segmentation.',
        'Files and text stay in your browser, without uploads or persistent storage.',
      ],
    },
  },
  'text-diff': {
    zh: {
      title: '文本对比 | Tool4Furry',
      description: '逐行比较文本，查看新增与删除内容。',
      h1: '文本对比',
      intro: '逐行比较文本，查看新增与删除内容。',
      steps: ['输入原文与新文本', '选择是否忽略行末空白', '查看并导出差异。'],
      limitations: [
        '每侧最多 10 万字符、4000 行，差异过大时拒绝。统一换行后比较，不是完整 Git 补丁编辑器。',
        '所有文件与文本均在当前浏览器本地处理，不上传、不持久保存。',
      ],
    },
    en: {
      title: 'Text Diff | Tool4Furry',
      description: 'Compare texts line by line to see additions and removals.',
      h1: 'Text Diff',
      intro: 'Compare texts line by line to see additions and removals.',
      steps: [
        'Enter original and revised text',
        'optionally ignore trailing whitespace',
        'review and export differences.',
      ],
      limitations: [
        'Up to 100,000 characters and 4,000 lines per side. Excessive differences are rejected. Line endings are normalized; this is not a full Git patch editor.',
        'Files and text stay in your browser, without uploads or persistent storage.',
      ],
    },
  },
  'subtitle-tools': {
    zh: {
      title: '字幕工具 | Tool4Furry',
      description: '转换 SRT 与 WebVTT，整体平移字幕时间。',
      h1: '字幕工具',
      intro: '转换 SRT 与 WebVTT，整体平移字幕时间。',
      steps: ['粘贴字幕', '选择输出格式与毫秒偏移', '检查条目并复制或下载。'],
      limitations: [
        '最多 5000 条、100 万字符。不支持 VTT NOTE/STYLE/REGION；转换 SRT 会提示定位设置丢失，多行文字保留。',
        '所有文件与文本均在当前浏览器本地处理，不上传、不持久保存。',
      ],
    },
    en: {
      title: 'Subtitle Tools | Tool4Furry',
      description: 'Convert SRT and WebVTT and shift cue timing.',
      h1: 'Subtitle Tools',
      intro: 'Convert SRT and WebVTT and shift cue timing.',
      steps: [
        'Paste subtitles',
        'select format and millisecond offset',
        'review cues and copy or download.',
      ],
      limitations: [
        'Up to 5,000 cues and one million characters. VTT NOTE/STYLE/REGION blocks are unsupported. SRT conversion warns about positioning loss; multiline text is preserved.',
        'Files and text stay in your browser, without uploads or persistent storage.',
      ],
    },
  },
  'json-formatter': {
    zh: {
      title: 'JSON 格式化 | Tool4Furry',
      description: '校验、格式化或压缩 JSON，保留数字字面量。',
      h1: 'JSON 格式化',
      intro: '校验、格式化或压缩 JSON，保留数字字面量。',
      steps: ['输入 JSON', '选择缩进或压缩', '检查错误并复制下载。'],
      limitations: [
        '最多 50 万字符、128 层嵌套。不支持 JSON Schema 或注释语法。',
        '所有文件与文本均在当前浏览器本地处理，不上传、不持久保存。',
      ],
    },
    en: {
      title: 'JSON Formatter | Tool4Furry',
      description:
        'Validate, format or minify JSON while preserving numeric literals.',
      h1: 'JSON Formatter',
      intro:
        'Validate, format or minify JSON while preserving numeric literals.',
      steps: [
        'Enter JSON',
        'choose indentation or minification',
        'review errors and copy or download.',
      ],
      limitations: [
        'Up to 500,000 characters and 128 nesting levels. JSON Schema and comments are unsupported.',
        'Files and text stay in your browser, without uploads or persistent storage.',
      ],
    },
  },
  'url-base64': {
    zh: {
      title: 'URL 与 Base64 | Tool4Furry',
      description: '进行 UTF-8 文本的 URL 编码与 Base64 转换。',
      h1: 'URL 与 Base64',
      intro: '进行 UTF-8 文本的 URL 编码与 Base64 转换。',
      steps: ['选择编解码操作', '输入文本', '复制或下载结果。'],
      limitations: [
        '最多 50 万字符。Base64 需合法填充与 UTF-8；Base64 不是加密，URL 编码作用于文本组件。',
        '所有文件与文本均在当前浏览器本地处理，不上传、不持久保存。',
      ],
    },
    en: {
      title: 'URL & Base64 | Tool4Furry',
      description: 'Encode or decode UTF-8 text using URL encoding or Base64.',
      h1: 'URL & Base64',
      intro: 'Encode or decode UTF-8 text using URL encoding or Base64.',
      steps: [
        'Choose an operation',
        'enter text',
        'copy or download the result.',
      ],
      limitations: [
        'Up to 500,000 characters. Base64 requires valid padding and UTF-8. Base64 is not encryption; URL encoding operates on a text component.',
        'Files and text stay in your browser, without uploads or persistent storage.',
      ],
    },
  },
  'timestamp-converter': {
    zh: {
      title: '时间戳转换 | Tool4Furry',
      description: '在 Unix 时间戳、ISO 8601、UTC 与本地时间间转换。',
      h1: '时间戳转换',
      intro: '在 Unix 时间戳、ISO 8601、UTC 与本地时间间转换。',
      steps: [
        '明确选择秒、毫秒或 ISO',
        '输入带明确单位或时区的时间',
        '核对并复制结果。',
      ],
      limitations: [
        '不猜测时间戳单位，不支持闰秒。本地时间以当前浏览器时区显示。',
        '所有文件与文本均在当前浏览器本地处理，不上传、不持久保存。',
      ],
    },
    en: {
      title: 'Timestamp Converter | Tool4Furry',
      description:
        'Convert Unix timestamps and ISO 8601 into UTC and local time.',
      h1: 'Timestamp Converter',
      intro: 'Convert Unix timestamps and ISO 8601 into UTC and local time.',
      steps: [
        'Choose seconds, milliseconds or ISO explicitly',
        'enter a value with its unit or timezone',
        'review and copy results.',
      ],
      limitations: [
        'Units are never guessed. Leap seconds are unsupported. Local display uses your browser timezone.',
        'Files and text stay in your browser, without uploads or persistent storage.',
      ],
    },
  },
  'qr-code-generator': {
    zh: {
      title: '二维码生成 | Tool4Furry',
      description: '将文本或网址生成 PNG 与 SVG 二维码。',
      h1: '二维码生成',
      intro: '将文本或网址生成 PNG 与 SVG 二维码。',
      steps: ['输入内容', '设置尺寸与颜色', '生成并下载 PNG 或 SVG。'],
      limitations: [
        '最多 2000 字符、128–2048px。需深色前景、浅色背景和足够对比度，内容越多需要越大尺寸。',
        '所有文件与文本均在当前浏览器本地处理，不上传、不持久保存。',
      ],
    },
    en: {
      title: 'QR Code Generator | Tool4Furry',
      description: 'Create PNG and SVG QR codes from text or URLs.',
      h1: 'QR Code Generator',
      intro: 'Create PNG and SVG QR codes from text or URLs.',
      steps: [
        'Enter content',
        'set size and colors',
        'generate and download PNG or SVG.',
      ],
      limitations: [
        'Up to 2,000 characters, 128–2048px. Requires a dark foreground, light background and sufficient contrast. Longer content needs larger output.',
        'Files and text stay in your browser, without uploads or persistent storage.',
      ],
    },
  },
  'color-contrast': {
    zh: {
      title: '颜色与对比度 | Tool4Furry',
      description: '转换 HEX、RGB、HSL 并计算 WCAG 文字对比度。',
      h1: '颜色与对比度',
      intro: '转换 HEX、RGB、HSL 并计算 WCAG 文字对比度。',
      steps: [
        '输入颜色或使用颜色选择器',
        '设置前景与背景',
        '核对 AA/AAA 并复制。',
      ],
      limitations: [
        '只支持不透明 sRGB。大号文字阈值只判断对比度，不测量实际页面字号。',
        '所有文件与文本均在当前浏览器本地处理，不上传、不持久保存。',
      ],
    },
    en: {
      title: 'Color & Contrast | Tool4Furry',
      description: 'Convert HEX, RGB and HSL and calculate WCAG text contrast.',
      h1: 'Color & Contrast',
      intro: 'Convert HEX, RGB and HSL and calculate WCAG text contrast.',
      steps: [
        'Enter colors or use the picker',
        'set foreground and background',
        'check AA/AAA and copy values.',
      ],
      limitations: [
        'Opaque sRGB only. Large-text thresholds assess contrast, without measuring actual page font sizes.',
        'Files and text stay in your browser, without uploads or persistent storage.',
      ],
    },
  },
  'audio-trimmer': {
    zh: {
      title: '音频裁切 | Tool4Furry',
      description: '试听音频范围，导出真实 PCM WAV 文件。',
      h1: '音频裁切',
      intro: '试听音频范围，导出真实 PCM WAV 文件。',
      steps: ['导入音频', '设置起点终点并试听', '导出并下载 WAV。'],
      limitations: [
        '输入上限 20 MiB、180 秒、双声道，解码缓冲上限 64 MiB。原生解码可能有额外瞬时内存；不支持 MP3/AAC 输出。',
        '所有文件与文本均在当前浏览器本地处理，不上传、不持久保存。',
      ],
    },
    en: {
      title: 'Audio Trimmer | Tool4Furry',
      description:
        'Audition an audio selection and export a real PCM WAV file.',
      h1: 'Audio Trimmer',
      intro: 'Audition an audio selection and export a real PCM WAV file.',
      steps: [
        'Import audio',
        'set start and end and audition',
        'export and download WAV.',
      ],
      limitations: [
        'Input limits: 20 MiB, 180 seconds, two channels; decoded buffer limit 64 MiB. Native decoding can use additional transient memory. No MP3/AAC output.',
        'Files and text stay in your browser, without uploads or persistent storage.',
      ],
    },
  },
} satisfies ToolContentMap;
