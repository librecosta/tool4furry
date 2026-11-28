import type { ToolContentMap } from './tool-content';
// Static Astro content only; never imported by the client or registry.
export const generalToolboxA2Content = {
  'uuid-generator': {
    zh: {
      title: 'UUID 生成器 | Tool4Furry',
      description: '使用安全随机数生成单个或批量 UUIDv4。',
      h1: 'UUID 生成器',
      intro: '快速生成 UUIDv4 或 UUIDv7，或在高级模式中批量生成、验证和解析 UUID。',
      steps: [
        '使用快速模式生成和复制 UUIDv4 或 UUIDv7。',
        '在高级模式选择版本和表示格式，可复制单项或下载整批结果。',
        '切换到验证与解析，输入单个 UUID 或导入列表。',
      ],
      limitations: [
        '高级模式每批最多 10,000 条。批量输入和本地 UTF-8 文件最多 2 MiB。',
        '所有文件与文本仅在当前浏览器本地处理，不上传、不持久保存。',
      ],
    },
    en: {
      title: 'UUID Generator | Tool4Furry',
      description:
        'Generate individual or batch UUIDv4 values using secure randomness.',
      h1: 'UUID Generator',
      intro:
        'Generate UUIDv4 or UUIDv7 in Quick mode, or generate, validate and inspect UUIDs in Advanced mode.',
      steps: [
        'Use Quick mode to generate and copy UUIDv4 or UUIDv7.',
        'In Advanced mode, choose a version and representation, then copy individual values or download the batch.',
        'Open Validate & Inspect and enter one UUID or import a list.',
      ],
      limitations: [
        'Advanced mode supports up to 10,000 rows per batch. Batch input and local UTF-8 files are limited to 2 MiB.',
        'Files and text stay in your browser, without uploads or persistent storage.',
      ],
    },
  },
} satisfies ToolContentMap;
