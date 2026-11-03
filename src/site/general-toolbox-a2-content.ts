import type { ToolContentMap } from './tool-content';
// Static Astro content only; never imported by the client or registry.
export const generalToolboxA2Content = {
  'markdown-editor': {
    zh: {
      title: 'Markdown 编辑器 | Tool4Furry',
      description: '编写 Markdown，实时预览并保存文档。',
      h1: 'Markdown 编辑器',
      intro: '编写 Markdown，实时预览并保存文档。',
      steps: [
        '编辑 Markdown 或载入示例',
        '选择双栏、编辑或预览视图',
        '复制 Markdown 或下载 .md 文件。',
      ],
      limitations: [
        '支持常见 GFM 表格、任务列表及代码块，最多 10 万字符。HTML 会安全清理，图片和嵌入内容不加载；不会自动保存。',
        '所有文件与文本仅在当前浏览器本地处理，不上传、不持久保存。',
      ],
    },
    en: {
      title: 'Markdown Editor | Tool4Furry',
      description: 'Write Markdown with a live preview and save your document.',
      h1: 'Markdown Editor',
      intro: 'Write Markdown with a live preview and save your document.',
      steps: [
        'Edit Markdown or load the example',
        'choose split, editor or preview mode',
        'copy Markdown or download an .md file.',
      ],
      limitations: [
        'Supports common GFM tables, tasks and code blocks, up to 100,000 characters. HTML is sanitized; images and embedded content are not loaded. No autosave.',
        'Files and text stay in your browser, without uploads or persistent storage.',
      ],
    },
  },
  'video-frame-extractor': {
    zh: {
      title: '视频取帧 | Tool4Furry',
      description: '从本地视频提取当前画面或按间隔导出图片。',
      h1: '视频取帧',
      intro: '从本地视频提取当前画面或按间隔导出图片。',
      steps: [
        '选择浏览器支持的视频',
        '定位画面，设置尺寸、格式或批量间隔',
        '提取并下载图片或 ZIP。',
      ],
      limitations: [
        '输入最多 100 MiB、30 分钟、1600 万源像素。单帧最多 800 万像素；批量最多 40 帧、8000 万像素、96 MiB。仅支持浏览器可解码视频，不保证逐帧精确定位。',
        '所有文件与文本仅在当前浏览器本地处理，不上传、不持久保存。',
      ],
    },
    en: {
      title: 'Video Frame Extractor | Tool4Furry',
      description:
        'Extract a frame or interval-based images from a local video.',
      h1: 'Video Frame Extractor',
      intro: 'Extract a frame or interval-based images from a local video.',
      steps: [
        'Choose a browser-supported video',
        'seek and set dimensions, format or interval',
        'extract and download images or a ZIP.',
      ],
      limitations: [
        'Input limit: 100 MiB, 30 minutes and 16 million source pixels. Each output is limited to eight million pixels; batches to 40 frames, 80 million pixels and 96 MiB. Uses browser codecs and does not guarantee frame-exact seeking.',
        'Files and text stay in your browser, without uploads or persistent storage.',
      ],
    },
  },
  'csv-json-converter': {
    zh: {
      title: 'CSV / JSON 转换 | Tool4Furry',
      description: '转换 CSV 与对象数组 JSON，预览表格并保留 CSV 字符串。',
      h1: 'CSV / JSON 转换',
      intro: '转换 CSV 与对象数组 JSON，预览表格并保留 CSV 字符串。',
      steps: [
        '粘贴文本或导入 UTF-8 文件',
        '选择转换方向与 CSV 分隔符',
        '查看表格，复制或下载结果。',
      ],
      limitations: [
        '文件最多 2 MiB、文本 100 万字符；最多 10000 行、100 列、20 万单元格。CSV 保留字符串；JSON 仅支持对象数组中的标量字段，拒绝非安全整数与嵌套对象。',
        '所有文件与文本仅在当前浏览器本地处理，不上传、不持久保存。',
      ],
    },
    en: {
      title: 'CSV / JSON Converter | Tool4Furry',
      description:
        'Convert CSV and JSON object arrays with a table preview and string-preserving CSV input.',
      h1: 'CSV / JSON Converter',
      intro:
        'Convert CSV and JSON object arrays with a table preview and string-preserving CSV input.',
      steps: [
        'Paste text or import a UTF-8 file',
        'choose the direction and CSV delimiter',
        'review the table, then copy or download.',
      ],
      limitations: [
        'Files: 2 MiB; text: one million characters. Up to 10,000 rows, 100 columns and 200,000 cells. CSV values remain strings. JSON supports scalar fields in object arrays; unsafe integers and nested objects are rejected.',
        'Files and text stay in your browser, without uploads or persistent storage.',
      ],
    },
  },
  'code-image-generator': {
    zh: {
      title: '代码分享图 | Tool4Furry',
      description: '将高亮代码与标题保存为 PNG 分享图。',
      h1: '代码分享图',
      intro: '将高亮代码与标题保存为 PNG 分享图。',
      steps: [
        '粘贴代码并选择语言',
        '设置主题、标题、行号及内边距',
        '查看实时画布并生成 PNG 下载。',
      ],
      limitations: [
        '支持 TypeScript、JavaScript、Go、Python、Rust、JSON、HTML、CSS、Bash。最多 20000 字符、160 行；画布不超过 8192px 和 800 万像素，过长内容须先缩短。',
        '所有文件与文本仅在当前浏览器本地处理，不上传、不持久保存。',
      ],
    },
    en: {
      title: 'Code Image Generator | Tool4Furry',
      description: 'Turn highlighted code and a title into a PNG share image.',
      h1: 'Code Image Generator',
      intro: 'Turn highlighted code and a title into a PNG share image.',
      steps: [
        'Paste code and select a language',
        'set the theme, title, line numbers and padding',
        'review the live canvas, then generate and download a PNG.',
      ],
      limitations: [
        'Supports TypeScript, JavaScript, Go, Python, Rust, JSON, HTML, CSS and Bash. Up to 20,000 characters and 160 lines. Canvas limits: 8,192px per side and eight million pixels; shorten excessive content.',
        'Files and text stay in your browser, without uploads or persistent storage.',
      ],
    },
  },
  'svg-to-png': {
    zh: {
      title: 'SVG 转 PNG | Tool4Furry',
      description: '安全预览静态 SVG，按比例调整尺寸并导出 PNG。',
      h1: 'SVG 转 PNG',
      intro: '安全预览静态 SVG，按比例调整尺寸并导出 PNG。',
      steps: [
        '上传 SVG 或粘贴源码',
        '设置输出尺寸或倍率，选择透明或纯色背景',
        '生成并下载 PNG。',
      ],
      limitations: [
        'SVG 最多 256 KiB、512 个节点、16 层。复用静态白名单，仅支持形状、路径、变换、渐变和裁切；不支持脚本、外部资源、文本、CSS 样式或复杂滤镜。需有效尺寸或 viewBox；输出最多 8192px、800 万像素。',
        '所有文件与文本仅在当前浏览器本地处理，不上传、不持久保存。',
      ],
    },
    en: {
      title: 'SVG to PNG | Tool4Furry',
      description:
        'Safely preview static SVGs, resize proportionally and export PNGs.',
      h1: 'SVG to PNG',
      intro:
        'Safely preview static SVGs, resize proportionally and export PNGs.',
      steps: [
        'Upload an SVG or paste its source',
        'set dimensions or scale and choose transparency or a solid background',
        'generate and download a PNG.',
      ],
      limitations: [
        'SVG limits: 256 KiB, 512 nodes and 16 levels. The static allowlist supports shapes, paths, transforms, gradients and clipping. Scripts, external resources, text, CSS styles and complex filters are rejected. Valid dimensions or a viewBox are required; output is limited to 8,192px and eight million pixels.',
        'Files and text stay in your browser, without uploads or persistent storage.',
      ],
    },
  },
  'regex-tester': {
    zh: {
      title: '正则测试 | Tool4Furry',
      description: '测试 JavaScript 正则，查看匹配与替换结果。',
      h1: '正则测试',
      intro: '测试 JavaScript 正则，查看匹配与替换结果。',
      steps: [
        '输入表达式并选择 Flags',
        '输入测试文本和替换表达式',
        '查看高亮、捕获组并复制替换结果。',
      ],
      limitations: [
        '使用 JavaScript RegExp，可能与其他引擎不同。表达式最多 500 字符、文本 20 万字符、1000 处匹配；Worker 超时会终止，过于复杂的表达式须简化。',
        '所有文件与文本仅在当前浏览器本地处理，不上传、不持久保存。',
      ],
    },
    en: {
      title: 'Regex Tester | Tool4Furry',
      description:
        'Test JavaScript regular expressions, matches and replacements.',
      h1: 'Regex Tester',
      intro: 'Test JavaScript regular expressions, matches and replacements.',
      steps: [
        'Enter a pattern and flags',
        'add test text and a replacement',
        'review highlights and capture groups, then copy the replacement result.',
      ],
      limitations: [
        'Uses JavaScript RegExp semantics, which may differ from other engines. Limits: 500 pattern characters, 200,000 text characters and 1,000 matches. Timed-out workers are terminated; simplify complex expressions.',
        'Files and text stay in your browser, without uploads or persistent storage.',
      ],
    },
  },
  'uuid-generator': {
    zh: {
      title: 'UUID 生成器 | Tool4Furry',
      description: '使用安全随机数生成单个或批量 UUIDv4。',
      h1: 'UUID 生成器',
      intro: '使用安全随机数生成单个或批量 UUIDv4。',
      steps: [
        '设置生成数量和大小写',
        '生成 UUIDv4',
        '复制单项或全部，或下载 TXT。',
      ],
      limitations: [
        '每批 1–1000 个 UUID，使用浏览器安全随机数，不使用 Math.random。仅提供 UUIDv4，不持久保存结果。',
        '所有文件与文本仅在当前浏览器本地处理，不上传、不持久保存。',
      ],
    },
    en: {
      title: 'UUID Generator | Tool4Furry',
      description:
        'Generate individual or batch UUIDv4 values using secure randomness.',
      h1: 'UUID Generator',
      intro:
        'Generate individual or batch UUIDv4 values using secure randomness.',
      steps: [
        'Set the count and letter case',
        'generate UUIDv4 values',
        'copy one or all values, or download a TXT file.',
      ],
      limitations: [
        'Generates 1–1,000 UUIDs per batch using browser cryptographic randomness, never Math.random. UUIDv4 only, without persistent storage.',
        'Files and text stay in your browser, without uploads or persistent storage.',
      ],
    },
  },
} satisfies ToolContentMap;
