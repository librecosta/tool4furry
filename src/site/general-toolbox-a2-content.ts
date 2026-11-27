import type { ToolContentMap } from './tool-content';
// Static Astro content only; never imported by the client or registry.
export const generalToolboxA2Content = {
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
        '使用浏览器原生 JavaScript RegExp。表达式最多 16 Ki、测试文本最多 2 Mi UTF-16 单元。匹配记录和捕获数据达到预算后标记为部分结果，超时任务会终止。',
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
        'Uses the browser’s native JavaScript RegExp. Expressions and test text are limited to 16 Ki and 2 Mi UTF-16 code units. Match or capture limits produce marked partial results. Timed-out tasks are terminated.',
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
