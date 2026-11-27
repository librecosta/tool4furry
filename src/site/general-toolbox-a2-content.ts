import type { ToolContentMap } from './tool-content';
// Static Astro content only; never imported by the client or registry.
export const generalToolboxA2Content = {
  'svg-converter': {
    zh: {
      title: 'SVG 转换 | Tool4Furry',
      description: '栅格化静态 SVG、描摹位图轮廓，或将位图封装进 SVG。',
      h1: 'SVG 转换',
      intro: '编辑并预览静态 SVG，在矢量和位图之间转换，或将图片嵌入 SVG。',
      steps: [
        '选择栅格化、位图矢量化或图片封装。',
        '导入图片或输入 SVG 源码。',
        '检查预览，调整转换参数并下载。',
      ],
      limitations: [
        '静态 SVG 支持受控样式、内嵌资源和常用滤镜。脚本、动画与外部资源会被拒绝。转换能力取决于文件复杂度和浏览器。',
        '所有文件与文本仅在当前浏览器本地处理，不上传、不持久保存。',
      ],
    },
    en: {
      title: 'SVG Converter | Tool4Furry',
      description: 'Rasterize static SVGs, trace bitmap outlines or embed images in SVG.',
      h1: 'SVG Converter',
      intro: 'Edit and preview static SVG, convert between vector and raster images, or embed an image in SVG.',
      steps: [
        'Choose Rasterize, Vectorize or Embed.',
        'Import an image or enter SVG source.',
        'Review the preview, adjust the settings and download.',
      ],
      limitations: [
        'Static SVG supports controlled styling, embedded resources and common filters. Scripts, animation and external resources are rejected. Conversion depends on file complexity and browser capabilities.',
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
