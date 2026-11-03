import { boundedText, fail } from '../general/bounds';
/** Validate with JSON.parse, but retain numeric/string tokens without rounding. */
export function formatJson(input: string, indent: 0 | 2 | 4) {
  boundedText(input);
  try {
    JSON.parse(input);
  } catch (e) {
    fail(
      `JSON 语法错误：${(e as Error).message}`,
      `Invalid JSON: ${(e as Error).message}`,
    );
  }
  const tokens =
    input.match(
      /"(?:\\.|[^"\\])*"|[{}\[\],:]|true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/g,
    ) ?? [];
  let nesting = 0;
  for (const token of tokens) {
    if (token === '{' || token === '[') {
      if (++nesting > 128) fail('嵌套层数过深。', 'JSON nesting is too deep.');
    } else if (token === '}' || token === ']') nesting--;
  }
  if (!indent) return tokens.join('');
  let depth = 0,
    result = '';
  const line = () => {
    result += '\n' + ' '.repeat(depth * indent);
  };
  tokens.forEach((token, i) => {
    if (token === '{' || token === '[') {
      result += token;
      if (++depth > 128) fail('嵌套层数过深。', 'JSON nesting is too deep.');
      if (tokens[i + 1] !== '}' && tokens[i + 1] !== ']') line();
    } else if (token === '}' || token === ']') {
      depth--;
      if (tokens[i - 1] !== '{' && tokens[i - 1] !== '[') line();
      result += token;
    } else if (token === ',') {
      result += token;
      line();
    } else if (token === ':') result += ': ';
    else result += token;
    if (result.length > 4_000_000)
      fail(
        '格式化结果超过 400 万字符，请改用压缩输出或缩短输入。',
        'Formatted output exceeds four million characters. Minify or shorten the input.',
      );
  });
  return result;
}
