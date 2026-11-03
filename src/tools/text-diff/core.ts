import { diffLines } from 'diff';
import { boundedText, fail } from '../general/bounds';
export function compareLines(
  left: string,
  right: string,
  ignoreEndWhitespace: boolean,
) {
  boundedText(left, 100000);
  boundedText(right, 100000);
  if (left.split('\n').length > 4000 || right.split('\n').length > 4000)
    fail('最多比较 4000 行。', 'Compare at most 4,000 lines.');
  const normalize = (text: string) =>
    text
      .replace(/\r\n?/g, '\n')
      .split('\n')
      .map((line) => (ignoreEndWhitespace ? line.trimEnd() : line))
      .join('\n');
  const parts = diffLines(normalize(left), normalize(right), {
    timeout: 750,
    maxEditLength: 4000,
  });
  if (!parts)
    fail(
      '差异过大，请缩短文本后重试。',
      'The difference is too large. Compare smaller texts.',
    );
  return {
    parts,
    added: parts.filter((p) => p.added).reduce((n, p) => n + (p.count ?? 0), 0),
    removed: parts
      .filter((p) => p.removed)
      .reduce((n, p) => n + (p.count ?? 0), 0),
    text: parts
      .map((p) =>
        p.value
          .replace(/\n$/, '')
          .split('\n')
          .map((line) => (p.added ? '+ ' : p.removed ? '- ' : '  ') + line)
          .join('\n'),
      )
      .join('\n'),
  };
}
