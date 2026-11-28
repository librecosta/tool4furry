import { describe, expect, it, vi } from 'vitest';
import Papa from 'papaparse';
import { analyzePattern } from '../src/tools/regex-tester/analysis';
import { evaluateRegex, supportedFlags } from '../src/tools/regex-tester/core';
import { createRegexNamer } from '../src/tools/regex-tester/delivery';
import { limits, type ExpressionNode, type RegexRequest } from '../src/tools/regex-tester/protocol';
import { defaultExample, examples, summarizeExpression } from '../src/tools/regex-tester/reference';
import { matchLines, matchRowHeight, matchWindow } from '../src/tools/regex-tester/match-window';

const run = (input: Partial<RegexRequest>) =>
  evaluateRegex({ pattern: 'a', flags: 'g', text: 'a b a', replacement: 'X', ...input });

describe('native JavaScript matching', () => {
  it.each([
    ['a', '', 'aaa'], ['a', 'g', 'aba'], ['^x', 'gm', 'x\nx'], ['x.y', 's', 'x\ny'],
    ['a', 'gi', 'aaAAA'], ['a', 'gy', 'aaXaa'], ['a', 'y', 'ba'],
    ['(?<=([ab]+)([bc]+))$', 'd', 'abc'], ['(?=(a+))', 'g', 'aaa'], ['(a)\\1', 'g', 'aaaa'],
    ['', 'g', '🦊x'], ['', 'gu', '🦊x'], ['', 'gv', '🦊x'], ['[\\p{Letter}&&\\p{ASCII}]', 'gv', 'ab你好'],
    ['(?<a>a)?(?<b>b*)', 'gu', 'a🦊b\n'], ['.', 'gu', '\uD800🦊\uDC00'],
  ])('agrees with native exec and indices for %s / %s', (pattern, flags, text) => {
    if ([...flags].some(flag => !supportedFlags().includes(flag))) return;
    const native = new RegExp(pattern, flags.includes('d') ? flags : flags + 'd');
    const expected = native.global ? [...text.matchAll(native)] : [native.exec(text)].filter(result => result !== null);
    const actual = run({ pattern, flags, text, mode: 'match' });
    expect(actual.count).toBe(expected.length);
    expect(actual.matches.map(match => [match.index, match.end, match.ranges]))
      .toEqual(expected.map(match => [match.index, match.index + match[0].length, match.indices?.slice(1).map(range => range ?? null)]));
  });

  it('distinguishes captures outside the match, empty captures, and missing captures', () => {
    const result = run({ pattern: '(?<=([a]))(?<absent>z)?(?<empty>)b(?=(c))', text: 'abc', mode: 'match' });
    expect(result.matches[0]).toMatchObject({
      index: 1, end: 2, groups: ['a', null, '', 'c'], ranges: [[0, 1], null, [1, 1], [2, 3]],
      named: { absent: null, empty: '' }, namedRanges: { absent: null, empty: [1, 1] },
    });
    expect(() => run({ flags: 'uv' })).toThrow('flags');
    expect(() => run({ flags: 'dgdd' })).toThrow('flags');
  });
});

describe('bounded delivery', () => {
  it('matches native substitution for named, numeric, fallback and context tokens', () => {
    const contextBefore = '$' + String.fromCharCode(96);
    const templates = [
      '$100|$01|$00|$12|$2|$0|$30', '$<part>|$<not-known>|$<empty>|$$|$&',
      contextBefore + "$'|$1|$<part>", '$<unterminated$$$1', '$<x$&>', '$$$$&&foo$',
      '🦊$&木\n$<__proto__>', '$<constructor>|$<toString>', '',
    ];
    for (const [pattern, flags, text] of [
      ['(?<part>a)?(?<empty>b*)', 'g', 'ba🦊ba'], ['(a)(b)?', '', 'a za'],
      ['(?<__proto__>x)', 'y', 'xa'], ['(a)(b)(c)(d)(e)(f)(g)(h)(i)(j)(k)(l)', 'g', 'abcdefghijkl'],
      ['', 'gu', '🦊中\r\n'], ['z', 'g', 'text'], ['(^|x)', 'gm', 'x\nx'],
    ]) for (const replacement of templates) {
      expect(run({ pattern, flags, text, replacement }).replaced)
        .toBe(text.replace(new RegExp(pattern, flags), replacement));
    }
  });

  it('checks cumulative expansion before assembling huge replacement strings', () => {
    const text = 'a'.repeat(limits.text);
    const result = run({ text, pattern: '', replacement: "$'", mode: 'replace' });
    expect(result.issue?.code).toBe('output-limit');
    expect(result.replaced).toBeUndefined();
    expect(run({ text, pattern: '^a', replacement: 'X' }).replaced?.length).toBe(limits.text);
    expect(run({ text, pattern: '^a', replacement: 'X' }).diff).toBeUndefined();
  });

  it('distinguishes retained records, capture data, exact total, and complete output', () => {
    const text = 'a'.repeat(limits.records + 5);
    const tested = run({ pattern: 'a', text, mode: 'match' });
    expect(tested).toMatchObject({ partial: true, count: null, issue: { code: 'capture-limit' } });
    expect(tested.matches).toHaveLength(limits.records);
    expect(run({ pattern: 'a', text, mode: 'extract', extract: { group: 0, unique: false, format: 'txt', separator: '\n' } })
      .extraction).toBeUndefined();
    expect(run({ pattern: 'a', text, mode: 'replace' })).toMatchObject({ partial: true, count: text.length, replaced: 'X'.repeat(text.length) });
    expect(run({ pattern: '((.*))', flags: '', text: 'x'.repeat(limits.text), mode: 'match' }))
      .toMatchObject({ partial: true, count: null, matches: [], issue: { code: 'capture-limit' } });
  });

  it('exports ordered TXT, structured JSON, and actual CSV cell values', () => {
    const settings = { group: 'value', unique: true, separator: ' ⟶ ', format: 'json' } as const;
    const input = { mode: 'extract', pattern: 'ID:(?<value>[^;]*)|missing', text: 'ID:中,"🐱\n"; missing; ID:; ID:中,"🐱\n";' } as const;
    const expected = ['中,"🐱\n"', null, ''];
    expect(JSON.parse(run({ ...input, extract: settings }).extraction!.value)).toEqual(expected);
    expect(run({ ...input, extract: { ...settings, format: 'txt' } }).extraction?.value).toBe('中,"🐱\n" ⟶  ⟶ ');
    const csv = run({ ...input, extract: { ...settings, format: 'csv' } }).extraction!.value;
    expect(Papa.parse(csv).data).toEqual([['status', 'value'], ['matched', expected[0]], ['absent', ''], ['matched', '']]);
    const name = createRegexNamer(), now = new Date(2026, 10, 27, 8, 9, 10, 11);
    expect(name('样本.log', 'json', now)).toBe('样本-20261127-080910-011.json');
    expect(name('样本.log', 'csv', now)).toBe('样本-20261127-080910-011-2.csv');
  });
});

it('isolates sticky lastIndex and distinguishes test errors from failed assertions', () => {
  const result = run({ flags: 'gy', mode: 'tests', cases: [
    { id: 1, text: 'aab', assertion: 'count', expected: '2' },
    { id: 2, text: 'a', assertion: 'match', expected: '' },
    { id: 3, text: 'ba', assertion: 'no-match', expected: '' },
    { id: 4, text: 'aa', assertion: 'replace', expected: 'XX' },
    { id: 5, text: 'a', assertion: 'count', expected: 'x' },
    { id: 6, text: 'ba', assertion: 'match', expected: '' },
    { id: 7, text: 'a'.repeat(limits.scan + 1), assertion: 'count', expected: '1' },
  ] });
  expect(result.tests?.map(test => test.status)).toEqual(['pass', 'pass', 'pass', 'pass', 'error', 'fail', 'error']);
  expect(result.tests?.at(-1)?.issue?.code).toBe('scan-limit');
  expect(() => run({ mode: 'tests', cases: Array.from({ length: limits.tests + 1 }, (_, id) => ({ id, text: '', expected: '', assertion: 'match' })) })).toThrow('test-limit');
});

it('reports a test-time error for the case that reaches the suite deadline and later cases', () => {
  const time = vi.spyOn(performance, 'now').mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValue(1000);
  try {
    const result = run({ mode: 'tests', cases: [
      { id: 1, text: 'a', assertion: 'match', expected: '' },
      { id: 2, text: 'b', assertion: 'no-match', expected: '' },
    ] });
    expect(result.tests?.map(item => [item.status, item.issue?.code])).toEqual([
      ['error', 'test-time'], ['error', 'test-time'],
    ]);
  } finally {
    time.mockRestore();
  }
});

it('returns the native safe literal, typed AST with source spans and enforced AST bounds', () => {
  const fixture = examples.find(item => item.title[1] === 'Analyze HTTP logs')!;
  const result = analyzePattern(fixture.pattern, fixture.flags);
  const group = (node: ExpressionNode): ExpressionNode[] => node.children.flatMap(child => [child, ...group(child)]);
  expect(result.captures).toEqual([{ index: 1, name: 'level' }, { index: 2, name: 'code' }]);
  const nodes = group(result.root!);
  expect(nodes.find(node => node.kind === 'capture')).toMatchObject({ from: 0, group: 1 });
  expect(nodes.find(node => node.kind === 'quantifier')).toMatchObject({ min: 1, max: Infinity, greedy: true });
  expect(analyzePattern('a/b\n\\\\c', 'ig').literal).toBe(new RegExp('a/b\n\\\\c', 'ig').toString());
  expect(analyzePattern('[', '').issue).toEqual({ code: 'syntax', position: 1 });
  expect(analyzePattern('a'.repeat(limits.astNodes + 1), '').limited).toBe('budget');
  expect(analyzePattern('('.repeat(80) + 'a' + ')'.repeat(80), '').literal).toBeDefined();
  expect(analyzePattern('('.repeat(80) + 'a' + ')'.repeat(80), '').limited).toBe('budget');
  expect(analyzePattern('[\\p{Letter}&&\\p{ASCII}]', 'v').root).toBeDefined();
});

it('runs the new default and all 16 existing examples against the native engine', () => {
  expect(examples).toHaveLength(17);
  for (const { pattern, flags, text, title } of examples) {
    const result = run({ pattern, flags, text, mode: 'match' });
    expect(result.matches.length, title[1]).toBeGreaterThan(0);
    expect(analyzePattern(pattern, flags).root).toBeDefined();
  }
  const { pattern, flags, text } = defaultExample;
  expect(run({ pattern, flags, text, mode: 'match' }).matches.map(match => match.value)).toEqual(['1024', '2048', '4096']);
  const root = analyzePattern(defaultExample.pattern, defaultExample.flags).root!;
  expect(summarizeExpression(root, (_, en) => en)).toBe('Matches one or more consecutive digits.');
  const different = analyzePattern('A|B', 'g').root!;
  expect(summarizeExpression(different, (_, en) => en)).toBe('Matches any of the alternatives.');
});

it('derives source lines at zero-width, CRLF and UTF-16 boundaries', () => {
  const text = '🦊x\r\ny\n';
  const result = run({ pattern: '(?=x|y)|$', text, mode: 'match' });
  expect(matchLines(text, result.matches)).toEqual([1, 2, 3]);
});

it('windows 10,000 rows while measuring one expandable row independently', () => {
  const count = 10_000, expanded = 50, extra = 168, row = matchRowHeight;
  const inside = matchWindow(count, expanded, extra, expanded * row + 150, 320);
  expect(inside.start).toBe(expanded - 4);
  expect(inside.offset(expanded)).toBe(expanded * row);
  expect(inside.offset(expanded + 1)).toBe((expanded + 1) * row + extra);
  expect(inside.height).toBe(count * row + extra);
  const tail = matchWindow(count, expanded, extra, inside.height - 320, 320);
  expect(tail.end).toBe(count);
  expect(tail.end - tail.start).toBeLessThan(20);
});
