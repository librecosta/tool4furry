import type { ExpressionNode, Issue } from './protocol';

export type Translate = (zh: string, en: string) => string;
type Bilingual = readonly [string, string];
type Example = {
  title: Bilingual;
  detail: Bilingual;
  pattern: string;
  flags: string;
  text: string;
  replacement?: string;
};

export const examples: Example[] = [
  {
    title: ['HTTP 日志', 'HTTP log'], detail: ['捕获日志级别及三位状态码。', 'Capture a log level and its three-digit status code.'],
    pattern: '(?<level>INFO|WARN|ERROR)\\s+(?<code>\\d{3})', flags: 'g', replacement: '[$<level>] $<code>',
    text: '10:42:01 INFO 200 Request received\n10:42:03 WARN 429 Rate limit reached\n10:42:08 ERROR 500 Database timeout\n10:42:12 INFO 200 Request completed',
  },
  { title: ['字符类', 'Character class'], detail: ['查找十六进制字符。', 'Find hexadecimal characters.'], pattern: '[A-F0-9]', flags: 'gi', text: 'Keys: A9, ff, xZ' },
  { title: ['分支', 'Alternation'], detail: ['匹配两种文件扩展名。', 'Match either file extension.'], pattern: '\\.(?:png|webp)\\b', flags: 'gi', text: 'title.png poster.webp photo.jpg' },
  { title: ['量词', 'Quantifier'], detail: ['匹配连续出现的三到五个数字。', 'Match runs of three to five digits.'], pattern: '\\b\\d{3,5}\\b', flags: 'g', text: '7 42 123 99999 100000' },
  { title: ['行首与行尾', 'Line boundaries'], detail: ['匹配整行状态。', 'Match a status on its own line.'], pattern: '^Ready$', flags: 'gm', text: 'Ready\nNot Ready\nReady' },
  { title: ['单词提取', 'Word extraction'], detail: ['提取示例中的拉丁字母单词。', 'Extract Latin-letter words from the sample.'], pattern: '\\b[A-Za-z]+\\b', flags: 'g', text: 'Hello, world! Ship it at 12:00.' },
  { title: ['空白清理', 'Whitespace cleanup'], detail: ['将连续空白替换为一个空格。', 'Replace repeated whitespace with one space.'], pattern: '[ \\t]{2,}', flags: 'g', text: 'Alpha   Beta\t\tGamma', replacement: ' ' },
  { title: ['重复单词', 'Repeated words'], detail: ['使用反向引用匹配连续重复。', 'Use a backreference to find consecutive duplicates.'], pattern: '\\b(\\w+)\\s+\\1\\b', flags: 'gi', text: 'The the fox ran ran home.', replacement: '$1' },
  { title: ['邮件地址提取', 'Email extraction'], detail: ['识别常见格式。', 'Find addresses in a common format.'], pattern: '[\\w.+-]+@[\\w.-]+\\.[A-Za-z]{2,}', flags: 'g', text: 'Mail editor@example.com or help@example.org.' },
  { title: ['URL 提取', 'URL extraction'], detail: ['提取常见的 HTTP 和 HTTPS 地址。', 'Find simple HTTP and HTTPS addresses.'], pattern: 'https?://[^\\s<>()]+', flags: 'g', text: 'Docs at https://example.com/docs and http://example.org' },
  { title: ['IPv4 形式', 'IPv4 shape'], detail: ['识别四段数字形式，不检查每段的范围。', 'Find four-part addresses without validating octet ranges.'], pattern: '\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b', flags: 'g', text: 'Servers 192.0.2.1 and 203.0.113.10' },
  { title: ['UUID 形式', 'UUID shape'], detail: ['识别带连字符的 UUID 字面形式。', 'Find UUIDs in their hyphenated form.'], pattern: '\\b[\\da-f]{8}(?:-[\\da-f]{4}){3}-[\\da-f]{12}\\b', flags: 'gi', text: 'id=550e8400-e29b-41d4-a716-446655440000' },
  { title: ['HEX 颜色', 'HEX colors'], detail: ['识别三位和六位颜色代码。', 'Find three- and six-digit color codes.'], pattern: '#(?:[\\da-f]{6}|[\\da-f]{3})\\b', flags: 'gi', text: 'Accent #72618a on #fff; invalid #abcdefg.' },
  { title: ['日期形式', 'Date shape'], detail: ['识别年月日形式，不检查日历日期。', 'Find year-month-day text without validating calendar dates.'], pattern: '\\b\\d{4}-\\d{2}-\\d{2}\\b', flags: 'g', text: 'From 2026-01-05 to 2026-03-24' },
  { title: ['数字提取', 'Number extraction'], detail: ['提取示例中的有符号整数和小数。', 'Find signed integers and decimals in the sample.'], pattern: '[-+]?\\d+(?:\\.\\d+)?', flags: 'g', text: 'Temperature: -12.5 C, previous +3.2 C, count 20' },
  { title: ['简单 CSV 字段', 'Simple CSV fields'], detail: ['匹配示例中非空字段及双引号转义。', 'Match non-empty fields and doubled quotes in the sample.'], pattern: '"(?:[^"]|"")*"|[^,\\r\\n"]+', flags: 'g', text: 'Avery,"Designer, lead","Said ""hello"""' },
];

export const flagHelp: Record<string, Bilingual> = {
  g: ['全局匹配', 'Global'], i: ['忽略大小写', 'Ignore case'],
  m: ['多行边界', 'Multiline'], s: ['点号匹配换行', 'DotAll'],
  u: ['Unicode 模式', 'Unicode'], v: ['Unicode 集合模式', 'Unicode sets'],
  y: ['从 lastIndex 精确匹配', 'Sticky from lastIndex'], d: ['匹配与捕获范围', 'Match indices'],
};

export const reference = [
  { id: 'characters', title: ['字符', 'Characters'], entries: [
    ['.', '任意字符，换行行为由 s 决定', 'Any character, with newlines controlled by s'],
    ['\\d', 'ASCII 数字', 'ASCII digit'], ['\\w', '单词字符', 'Word character'],
    ['\\s', '空白字符', 'Whitespace'], ['[abc]', '字符集合', 'Character class'],
    ['[^abc]', '排除集合中的字符', 'Negated character class'],
    ['[a-z]', '字符范围', 'Character range'], ['\\p{Letter}', 'Unicode 字母属性，需要 u 或 v', 'Unicode letter property, requires u or v'],
    ['[\\p{Letter}&&\\p{ASCII}]', 'Unicode 集合交集，需要 v', 'Unicode set intersection, requires v'],
  ] },
  { id: 'repetition', title: ['重复', 'Repetition'], entries: [
    ['*', '零次或多次', 'Zero or more'], ['+', '一次或多次', 'One or more'],
    ['?', '零次或一次', 'Zero or once'], ['{2,4}', '两到四次', 'Two to four times'],
    ['+?', '非贪婪的一次或多次', 'One or more, lazily'],
  ] },
  { id: 'groups', title: ['分组与断言', 'Groups and assertions'], entries: [
    ['(abc)', '编号捕获组', 'Numbered capture'], ['(?<name>abc)', '命名捕获组', 'Named capture'],
    ['(?:abc)', '非捕获组', 'Noncapturing group'], ['|', '替代分支', 'Alternative branch'],
    ['\\1', '编号反向引用', 'Numbered backreference'], ['\\k<name>', '命名反向引用', 'Named backreference'],
    ['^', '起点边界', 'Start boundary'], ['$', '终点边界', 'End boundary'], ['\\b', '单词边界', 'Word boundary'],
    ['(?=abc)', '正向先行断言', 'Positive lookahead'], ['(?!abc)', '负向先行断言', 'Negative lookahead'],
    ['(?<=abc)', '正向后行断言', 'Positive lookbehind'], ['(?<!abc)', '负向后行断言', 'Negative lookbehind'],
  ] },
  { id: 'replacement', title: ['替换', 'Replacement'], entries: [
    ['$&', '完整匹配', 'Entire match'], ['$1', '编号捕获', 'Numbered capture'],
    ['$<name>', '命名捕获', 'Named capture'], ['$$', '美元符号', 'Dollar sign'],
    ['$' + String.fromCharCode(96), '匹配前的原文', 'Source before the match'],
    ["$'", '匹配后的原文', 'Source after the match'],
  ] },
] as const;

export function describeNode(node: ExpressionNode, t: Translate): string {
  const labels = {
    pattern: t('表达式', 'Expression'), sequence: t('顺序匹配', 'Match in order'),
    character: t('字面字符', 'Literal character'), escape: t('转义字符', 'Escaped character'),
    class: node.detail === 'negated' ? t('排除字符类', 'Negated character class') : t('字符类', 'Character class'),
    range: t('字符范围', 'Character range'), set: t('字符集合', 'Character set'),
    property: t('Unicode 属性', 'Unicode property'),
    quantifier: t('重复次数', 'Repetition'),
    group: t('非捕获组', 'Noncapturing group'), capture: t('捕获组', 'Capture'),
    assertion: t('位置断言', 'Position assertion'), backreference: t('反向引用', 'Backreference'),
  }[node.kind];
  if (node.kind === 'capture') return labels + ' ' + node.group + (node.name ? ' · ' + node.name : '');
  if (node.kind === 'quantifier') {
    const times = node.min === node.max ? String(node.min) : node.min + '–' + (node.max === Infinity ? '∞' : node.max);
    return [labels + ' ' + times, node.greedy ? t('贪婪', 'Greedy') : t('非贪婪', 'Lazy')].join(' · ');
  }
  if (node.kind === 'assertion') {
    const detail: Record<string, string> = {
      start: t('起点边界', 'Start boundary'), end: t('终点边界', 'End boundary'),
      word: t('单词边界', 'Word boundary'), 'not-word': t('非单词边界', 'Non-word boundary'),
      lookahead: t('正向先行断言', 'Positive lookahead'), 'not-lookahead': t('负向先行断言', 'Negative lookahead'),
      lookbehind: t('正向后行断言', 'Positive lookbehind'), 'not-lookbehind': t('负向后行断言', 'Negative lookbehind'),
    };
    return detail[node.detail ?? ''] ?? labels;
  }
  if (node.kind === 'set') {
    const detail: Record<string, string> = {
      any: t('点号字符集合', 'Dot character set'), digit: t('数字字符', 'Digit'),
      'not-digit': t('非数字字符', 'Non-digit'), word: t('单词字符', 'Word character'),
      'not-word': t('非单词字符', 'Non-word character'), space: t('空白字符', 'Whitespace'),
      'not-space': t('非空白字符', 'Non-whitespace'), intersection: t('集合交集', 'Set intersection'),
      subtraction: t('集合差集', 'Set subtraction'), strings: t('集合中的字符串分支', 'String alternatives in a set'),
    };
    return detail[node.detail ?? ''] ?? labels;
  }
  if (node.children.length > 1 && ['pattern', 'group'].includes(node.kind))
    return labels + ' · ' + t('分支', 'Alternatives');
  return node.detail && node.detail !== 'negated' ? labels + ' · ' + node.detail : labels;
}

export function issueText(issue: Issue, t: Translate) {
  const message: Record<Issue['code'], Bilingual> = {
    syntax: ['表达式语法错误。', 'Invalid expression.'],
    flags: ['Flag 无效、互斥或当前浏览器不支持。', 'A flag is invalid, incompatible or unsupported.'],
    'pattern-limit': ['表达式超过 16 Ki UTF-16 单元。', 'The expression exceeds 16 Ki UTF-16 code units.'],
    'text-limit': ['测试文本超过 2 Mi UTF-16 单元。', 'The test text exceeds 2 Mi UTF-16 code units.'],
    'replacement-limit': ['替换表达式超过 64 Ki UTF-16 单元。', 'The replacement exceeds 64 Ki UTF-16 code units.'],
    'output-limit': ['超出输出预算（16 Mi UTF-16 单元或构建操作上限）。', 'The output exceeds its 16 Mi UTF-16 or construction budget.'],
    'scan-limit': ['已到扫描上限，匹配总数未知。', 'The scan budget was reached. The total is unknown.'],
    'capture-limit': ['已到匹配记录或捕获数据上限，仅显示部分结果。', 'The match or capture budget was reached. Showing partial results.'],
    'test-limit': ['测试用例数量或文本超出预算。', 'The test count or text exceeds its budget.'],
    'test-time': ['测试任务已达到累计执行时限。', 'The test suite reached its execution budget.'],
    'test-expected': ['请输入非负的预期匹配数量。', 'Enter a nonnegative whole match count.'],
    'extract-group': ['此次表达式中没有所选捕获组。', 'The selected capture is absent from this expression.'],
    'separator-limit': ['分隔符最多 1,024 个 UTF-16 单元。', 'The separator can use up to 1,024 UTF-16 code units.'],
    worker: ['后台执行失败。请检查浏览器支持后重试。', 'Background execution failed. Check browser support and retry.'],
    timeout: ['执行超时，后台任务已终止。', 'Execution timed out and the worker was terminated.'],
    cancelled: ['已取消。', 'Cancelled.'],
  };
  return t(...message[issue.code]) + (issue.position === undefined ? '' : ' ' + t('索引 ', 'Index ') + issue.position + t('。', '.'));
}
