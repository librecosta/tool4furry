import { describe, it, expect } from 'vitest';
import { renderMarkdown } from '../src/tools/markdown-editor/core';
import { convertTable } from '../src/tools/csv-json-converter/core';
import { csvDefaults, jsonDefaults, type Delimiter } from '../src/tools/csv-json-converter/settings';
import { evaluateRegex } from '../src/tools/regex-tester/core';
import { generateUuids } from '../src/tools/uuid-generator/core';
describe('second general toolbox batch', () => {
  it('renders GFM while rejecting executable and remote embedded content', async () => {
    const html = await renderMarkdown(
      '# Hello\n\n- [x] Task\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n```js\nconst a = 1;\n```\n\n<script>alert(1)</script><img src="https://evil.invalid/a" onerror="alert(1)"><iframe src="https://evil.invalid/"></iframe>\n\n[bad](javascript:alert(1))',
    );
    const el = document.createElement('div');
    el.innerHTML = html;
    expect(el.querySelector('h1')?.textContent).toBe('Hello');
    expect(el.querySelector('table')).not.toBeNull();
    expect(el.querySelector('input[checked][disabled]')).not.toBeNull();
    expect(el.querySelector('pre code')?.textContent).toContain('const a = 1;');
    expect(
      el.querySelector('script,img,iframe,[onerror],[href^="javascript:"]'),
    ).toBeNull();
  });
  it('round trips quoted Unicode CSV with literal numbers and multiline cells', async () => {
    const csv = (source: string, delimiter: Delimiter) => convertTable(source, { direction: 'csv-json', settings: { ...csvDefaults, delimiter } });
    const original = 'name,note,id\r\n"你好, friend","line 1\nline ""2""",90071992547409931234';
    const fromCsv = await csv(original, ',');
    expect(JSON.parse(fromCsv.result.preview.text)).toEqual([
      { name: '你好, friend', note: 'line 1\nline "2"', id: '90071992547409931234' },
    ]);
    const fromJson = await convertTable(fromCsv.result.preview.text, {
      direction: 'json-csv', settings: { ...jsonDefaults, delimiter: ';' },
    });
    expect((await csv(fromJson.result.preview.text, ';')).result.preview.text).toBe(fromCsv.result.preview.text);
    for (const delimiterInput of ['a,a\n1,2', 'a,b\n1', 'a,b\n"unclosed,2'])
      await expect(csv(delimiterInput, ',')).rejects.toThrow();
  });
  it('handles regex capture groups, substitutions, no match and Unicode zero-width matches', () => {
    const result = evaluateRegex({
      pattern: '(?<word>\\w+)',
      flags: 'g',
      text: 'one two',
      replacement: '[$<word>]',
    });
    expect(result.replaced).toBe('[one] [two]');
    expect(result.matches[0]).toMatchObject({
      index: 0,
      end: 3,
      groups: ['one'],
      named: { word: 'one' },
    });
    expect(
      evaluateRegex({
        pattern: '(?:)',
        flags: 'gu',
        text: '🦊x',
        replacement: '-',
      }).matches.map((m) => m.index),
    ).toEqual([0, 2, 3]);
    expect(
      evaluateRegex({
        pattern: 'z',
        flags: 'g',
        text: 'abc',
        replacement: 'x',
      }),
    ).toMatchObject({ matches: [], count: 0, replaced: 'abc' });
    expect(() =>
      evaluateRegex({ pattern: '[', flags: 'g', text: 'a', replacement: '' }),
    ).toThrow();
    expect(() =>
      evaluateRegex({ pattern: 'a', flags: 'gg', text: 'a', replacement: '' }),
    ).toThrow();
  });
  it('generates secure standard UUIDv4 batches and enforces bounds', () => {
    const values = generateUuids(100);
    expect(new Set(values).size).toBe(100);
    expect(
      values.every((v) =>
        /^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/.test(
          v,
        ),
      ),
    ).toBe(true);
    for (const count of [0, -1, 1001, 1.5])
      expect(() => generateUuids(count)).toThrow();
    expect(() => generateUuids(1, {} as Crypto)).toThrow();
  });
});
