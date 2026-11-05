// @vitest-environment node
import { expect, it } from 'vitest';
import {
  cleanText,
  defaults,
  textStats,
  createCleanedNamer,
} from '../src/tools/text-cleaner/core';

const sample = '  标题  \r\n\t内容\t \r\n\r\n \t\r\nend  \r';
it('uses the Quick preset without removing indentation, including mixed line endings', () => {
  expect(cleanText(sample)).toBe('  标题\n\t内容\n\nend\n');
  expect(cleanText('  a  \n\n\n')).toBe('  a\n\n');
  expect(cleanText('')).toBe('');
  expect(cleanText('\r\n\n')).toBe('\n');
  expect(sample).toBe('  标题  \r\n\t内容\t \r\n\r\n \t\r\nend  \r');
});
it('handles mutually exclusive blank line rules and separate leading/trailing whitespace', () => {
  expect(cleanText(sample, { ...defaults, blankLines: 'keep' })).toBe(
    '  标题\n\t内容\n\n\nend\n',
  );
  expect(cleanText(sample, { ...defaults, blankLines: 'remove' })).toBe(
    '  标题\n\t内容\nend\n',
  );
  expect(
    cleanText('  a  \n\tb\t', { ...defaults, trimStart: true, trimEnd: false }),
  ).toBe('a  \nb\t');
  expect(cleanText(' \n\t\n', { ...defaults, blankLines: 'remove' })).toBe('');
  expect(
    cleanText('a\n\n b', { ...defaults, trimEnd: false, blankLines: 'keep' }),
  ).toBe('a\n\n b');
});
it.each(['lf', 'crlf'] as const)(
  'exports actual %s bytes, preserving whether there was a terminal newline',
  (lineEnding) => {
    const output = cleanText('  a \r\n\r  b \n', {
      ...defaults,
      blankLines: 'keep',
      lineEnding,
    });
    const newline = lineEnding === 'lf' ? '\n' : '\r\n';
    expect(output).toBe(`  a${newline}${newline}  b${newline}`);
    expect(Buffer.from(output).toString('hex')).toBe(
      Buffer.from(`  a${newline}${newline}  b${newline}`).toString('hex'),
    );
    expect(cleanText('a\rb', { ...defaults, lineEnding })).toBe(`a${newline}b`);
  },
);
it('accepts text past the old quota and counts code points with bounded-memory statistics', () => {
  const input = '  中文 🐾  \r\n'.repeat(60_000);
  expect(input.length).toBeGreaterThan(500_000);
  const output = cleanText(input);
  expect(output).toBe('  中文 🐾\n'.repeat(60_000));
  expect(textStats('A🐾中\r\nB\rC\n')).toEqual({ characters: 9, lines: 4 });
  expect(textStats('')).toEqual({ characters: 0, lines: 0 });
});
it('names every download at click time, including same-millisecond collisions', () => {
  const name = createCleanedNamer(),
    date = new Date(2026, 10, 5, 21, 22, 33, 444);
  expect(name(date)).toBe('cleaned-20261105-212233-444.txt');
  expect(name(date)).toBe('cleaned-20261105-212233-444-2.txt');
});
