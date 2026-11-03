import { describe, it, expect } from 'vitest';
import { renderMarkdown } from '../src/tools/markdown-editor/core';
import { convertTable } from '../src/tools/csv-json-converter/core';
import {
  highlightCode,
  codeLines,
  languages,
} from '../src/tools/code-image-generator/core';
import { readSvg, svgOutputSize } from '../src/tools/svg-to-png/core';
import { evaluateRegex } from '../src/tools/regex-tester/core';
import { generateUuids } from '../src/tools/uuid-generator/core';
import { frameSize, frameTimes } from '../src/tools/video-frame-extractor/core';
describe('second general toolbox batch', () => {
  it('renders GFM while rejecting executable and remote embedded content', () => {
    const html = renderMarkdown(
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
  it('round trips quoted Unicode CSV with literal numbers and multiline cells', () => {
    const original =
      'name,note,id\r\n"你好, friend","line 1\nline ""2""",90071992547409931234';
    const json = convertTable(original, 'csv-json', ',');
    expect(JSON.parse(json.output)).toEqual([
      {
        name: '你好, friend',
        note: 'line 1\nline "2"',
        id: '90071992547409931234',
      },
    ]);
    const csv = convertTable(json.output, 'json-csv', ';');
    expect(convertTable(csv.output, 'csv-json', ';').rows).toEqual(json.rows);
    expect(convertTable('a\tb\n0\ttrue', 'csv-json', '\t').rows).toEqual([
      ['0', 'true'],
    ]);
  });
  it('rejects malformed tables, duplicate headers and unsafe JSON numbers', () => {
    for (const input of ['a,a\n1,2', 'a,b\n1', 'a,b\n"unclosed,2'])
      expect(() => convertTable(input, 'csv-json', ',')).toThrow();
    for (const input of ['{}', '[1]', '[{"a":{}}]', '[{"a":9007199254740993}]'])
      expect(() => convertTable(input, 'json-csv', ',')).toThrow();
    expect(
      convertTable('[{"a":true},{"b":null}]', 'json-csv', ',').rows,
    ).toEqual([
      ['true', ''],
      ['', ''],
    ]);
  });
  it('highlights all nine languages without interpreting code as HTML', () => {
    for (const lang of Object.keys(languages) as (keyof typeof languages)[]) {
      const html = highlightCode(
        '<script>alert("你好")</script>\nconst value = 42;',
        lang,
      );
      const lines = codeLines(html);
      expect(
        lines.map((line) => line.map((span) => span.text).join('')).join('\n'),
      ).toBe('<script>alert("你好")</script>\nconst value = 42;');
      expect(html).not.toContain('<script>');
    }
    expect(highlightCode('const value: number = 42;', 'typescript')).toContain(
      'hljs-keyword',
    );
    expect(() => highlightCode('x\n'.repeat(161), 'python')).toThrow();
  });
  it('reuses the strict SVG allowlist and checks proportional output budgets', () => {
    const svg = readSvg(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 40"><rect width="20" height="20" fill="#ff0000"/></svg>',
    );
    expect(svg).toMatchObject({ width: 80, height: 40, viewBox: '0 0 80 40' });
    expect(svgOutputSize(svg, '160', '80')).toEqual({ width: 160, height: 80 });
    for (const [w, h] of [
      ['0', '0'],
      ['160', '100'],
      ['10000', '5000'],
      ['1px', '1'],
    ])
      expect(() => svgOutputSize(svg, w, h)).toThrow();
    for (const body of [
      '<script>alert(1)</script>',
      '<image href="https://evil.invalid/a.png"/>',
      '<rect onclick="alert(1)"/>',
      '<foreignObject/>',
      '<animate/>',
    ])
      expect(() =>
        readSvg(
          `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="40">${body}</svg>`,
        ),
      ).toThrow();
    expect(() =>
      readSvg(
        '<!DOCTYPE svg [<!ENTITY x SYSTEM "https://evil.invalid/">]><svg/>',
      ),
    ).toThrow();
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
    ).toEqual({ matches: [], replaced: 'abc' });
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
  it('plans bounded interval frames without changing image proportions', () => {
    expect(frameSize('640', { width: 1920, height: 1080 })).toEqual({
      width: 640,
      height: 360,
    });
    expect(frameTimes(2, '0.5', { width: 640, height: 360 })).toEqual([
      0, 0.5, 1, 1.5,
    ]);
    for (const interval of ['0', '-1', 'x', '0.01'])
      expect(() =>
        frameTimes(2, interval, { width: 640, height: 360 }),
      ).toThrow();
    expect(() => frameTimes(120, '1', { width: 640, height: 360 })).toThrow();
    expect(() => frameTimes(40, '1', { width: 3000, height: 2000 })).toThrow();
  });
});
