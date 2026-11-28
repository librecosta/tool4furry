import type { ToolContentMap } from './tool-content';
// Static Astro content only; never imported by the client or registry.
export const generalToolboxA2Content = {
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
