// @vitest-environment node
import { expect, it, vi } from 'vitest';
import { compareLines, logicalLines, type DiffResult } from '../src/tools/text-diff/core';
import { createDiffNamer, diffReport, displayRows } from '../src/tools/text-diff/report';

const tuples = (result: DiffResult) => result.lines.map(line => [line.type, line.oldNumber, line.newNumber, line.text]);
function invariants(old: string, revised: string, ignore = false) {
  const result = compareLines(old, revised, ignore);
  expect(result.lines.filter(line => line.oldNumber !== undefined).map(line => line.oldText! + line.oldEnding!).join('')).toBe(old);
  expect(result.lines.filter(line => line.newNumber !== undefined).map(line => line.newText! + line.newEnding!).join('')).toBe(revised);
  const tokens = (input: string) => input ? input.replace(/\r\n?/g, '\n').split('\n').slice(0, /[\r\n]$/.test(input) ? -1 : undefined) : [];
  expect(result.lines.flatMap(line => line.oldNumber === undefined ? [] : [line.oldText])).toEqual(tokens(old));
  expect(result.lines.flatMap(line => line.newNumber === undefined ? [] : [line.newText])).toEqual(tokens(revised));
  expect(result.lines.flatMap(line => line.oldNumber === undefined ? [] : [line.oldNumber])).toEqual(tokens(old).map((_, i) => i + 1));
  expect(result.lines.flatMap(line => line.newNumber === undefined ? [] : [line.newNumber])).toEqual(tokens(revised).map((_, i) => i + 1));
  expect(result.added).toBe(result.lines.filter(line => line.type === 'added').length);
  expect(result.removed).toBe(result.lines.filter(line => line.type === 'removed').length);
  expect(result.changes).toBe(result.added + result.removed);
  for (const line of result.lines) {
    if (line.type === 'added') expect(line.oldNumber).toBeUndefined();
    if (line.type === 'removed') expect(line.newNumber).toBeUndefined();
    if (line.type === 'equal') expect(ignore ? line.oldText!.trimEnd() : line.oldText).toBe(ignore ? line.newText!.trimEnd() : line.newText);
  }
  return result;
}

it('aligns an inserted line without replacing the following original line or inventing an empty row', () => {
  const result = compareLines('123\n134', '123\n2\n134', false);
  expect(result).toMatchObject({ added: 1, removed: 0 });
  expect(result.lines).toMatchObject([
    { type: 'equal', oldNumber: 1, newNumber: 1, text: '123' },
    { type: 'added', newNumber: 2, text: '2' },
    { type: 'equal', oldNumber: 2, newNumber: 3, text: '134' },
  ]);
  expect(result.lines).toHaveLength(3);
  // Also cover the screenshot's possible paste-added terminator.
  expect(tuples(compareLines('123\n134', '123\n2\n134\n'))).toEqual(tuples(result));
});

it('reports an EOF newline separately from the last content line', () => {
  const result = compareLines('a\nb', 'a\nb\n', false);
  expect(result).toMatchObject({ added: 0, removed: 0, eof: { old: false, new: true, changed: true } });
  expect(result.lines).toHaveLength(2);
  expect(result.lines.every(line => line.type === 'equal')).toBe(true);
});

it.each([
  ['a\nb\nc', 'a\nc', [['equal', 1, 1, 'a'], ['removed', 2, undefined, 'b'], ['equal', 3, 2, 'c']]],
  ['hello\nworld', 'hello\nearth', [['equal', 1, 1, 'hello'], ['removed', 2, undefined, 'world'], ['added', undefined, 2, 'earth']]],
  ['', '', []],
  ['', 'a', [['added', undefined, 1, 'a']]],
  ['a', '', [['removed', 1, undefined, 'a']]],
  ['b', 'a\nb', [['added', undefined, 1, 'a'], ['equal', 1, 2, 'b']]],
  ['a', 'a\nb', [['equal', 1, 1, 'a'], ['added', undefined, 2, 'b']]],
  ['a\nb', 'b', [['removed', 1, undefined, 'a'], ['equal', 2, 1, 'b']]],
  ['a\nb', 'a', [['equal', 1, 1, 'a'], ['removed', 2, undefined, 'b']]],
  ['\n', '', [['removed', 1, undefined, '']]],
  ['a\n\nb\n', 'a\n\n\nb\n', [['equal', 1, 1, 'a'], ['equal', 2, 2, ''], ['added', undefined, 3, ''], ['equal', 3, 4, 'b']]],
  ['a\n \nb', 'a\n\nb', [['equal', 1, 1, 'a'], ['removed', 2, undefined, ' '], ['added', undefined, 2, ''], ['equal', 3, 3, 'b']]],
  ['a\nx\nx\nb', 'a\nx\nb', [['equal', 1, 1, 'a'], ['equal', 2, 2, 'x'], ['removed', 3, undefined, 'x'], ['equal', 4, 3, 'b']]],
  ['中文\n🦊\ncafé', '中文\n🐾\ncafé', [['equal', 1, 1, '中文'], ['removed', 2, undefined, '🦊'], ['added', undefined, 2, '🐾'], ['equal', 3, 3, 'café']]],
  ['a\nb\nc\nd', 'x\ny\nc\nz', [['removed', 1, undefined, 'a'], ['removed', 2, undefined, 'b'], ['added', undefined, 1, 'x'], ['added', undefined, 2, 'y'], ['equal', 3, 3, 'c'], ['removed', 4, undefined, 'd'], ['added', undefined, 4, 'z']]],
] as const)('preserves the exact edit sequence and both source projections: %j → %j', (old, revised, expected) => {
  expect(tuples(invariants(old, revised))).toEqual(expected);
});

it.each(['\n', '\r\n', '\r'])('normalizes matching boundaries while retaining original %j bytes', ending => {
  const result = invariants(`a${ending}${ending}中文${ending}`, 'a\n\n中文\n');
  expect(result.changes).toBe(0);
  expect(result.lines).toHaveLength(3);
  expect(result.eof).toEqual({ old: true, new: true, changed: false });
});
it('retains mixed separators, missing EOF and literal empty lines without phantom content', () => {
  expect(logicalLines('')).toEqual([]);
  expect(logicalLines('\n')).toEqual([{ text: '', ending: '\n' }]);
  expect(logicalLines('\n\n')).toHaveLength(2);
  const result = invariants('a\r\nb\rc\n\n', 'a\nb\nc\n');
  expect(result.endings.old).toBe('mixed');
  expect(tuples(result)).toEqual([['equal', 1, 1, 'a'], ['equal', 2, 2, 'b'], ['equal', 3, 3, 'c'], ['removed', 4, undefined, '']]);
});
it('ignores only matching keys, preserving both actual whitespace strings and input bytes', () => {
  const old = '  a \t\r\n \n', revised = '  a\n\n';
  const result = invariants(old, revised, true);
  expect(result.changes).toBe(0);
  expect(displayRows(result, false).filter(row => row.kind === 'line').map(row => row.text)).toEqual(['  a \t', '  a', ' ', '']);
  expect(invariants(old, revised, false)).toMatchObject({ added: 2, removed: 2 });
  expect(invariants(' a', 'a', true).changes).toBe(2); // Leading space is meaningful.
});
it('accepts a long line and a large local edit beyond both previous input quotas', () => {
  const long = '中文 x '.repeat(30_000);
  expect(invariants(long, long).lines).toHaveLength(1);
  const lines = Array.from({ length: 12_000 }, (_, i) => `line ${i} 中文`).join('\n');
  const result = invariants(lines, lines.replace('line 6000 中文', 'inserted\nline 6000 中文'));
  expect(result).toMatchObject({ added: 1, removed: 0, oldCount: 12_000, newCount: 12_001 });
  expect(result.lines.find(line => line.type === 'added')).toMatchObject({ text: 'inserted', newNumber: 6001 });
});
it('agrees with an independent LCS edit distance on repeated, blank and unrelated lines', () => {
  let seed = 12345;
  const random = () => (seed = (seed * 1664525 + 1013904223) >>> 0);
  const alphabet = ['', 'a', 'b', '中文', ' '];
  for (let trial = 0; trial < 120; trial++) {
    const a = Array.from({ length: random() % 10 }, () => alphabet[random() % alphabet.length]);
    const b = Array.from({ length: random() % 10 }, () => alphabet[random() % alphabet.length]);
    const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
    a.forEach((x, i) => b.forEach((y, j) => { dp[i + 1][j + 1] = x === y ? dp[i][j] + 1 : Math.max(dp[i][j + 1], dp[i + 1][j]); }));
    const result = invariants(a.length ? a.join('\n') + '\n' : '', b.length ? b.join('\n') + '\n' : '');
    expect(result.changes).toBe(a.length + b.length - 2 * dp[a.length][b.length]);
  }
});
it('rejects an exhausted search budget rather than returning a partial result', () => {
  let clock = 0;
  const now = vi.spyOn(Date, 'now').mockImplementation(() => (clock += 1000));
  try { expect(() => compareLines('a\nb\nc', 'x\ny\nz', false, 750)).toThrow(/timed out/); }
  finally { now.mockRestore(); }
});
it('projects context and exports the complete selected view with real line numbers and EOF metadata', () => {
  const old = Array.from({ length: 30 }, (_, i) => `line ${i}`).join('\n');
  const result = compareLines(old, old.replace('line 15\n', '中文\n'));
  const rows = displayRows(result, true);
  expect(rows.filter(row => row.kind === 'gap')).toEqual([{ kind: 'gap', count: 13 }, { kind: 'gap', count: 12 }]);
  expect(rows.filter(row => row.kind === 'line').map(row => row.text)).toEqual(['line 13', 'line 14', 'line 15', '中文', 'line 16', 'line 17']);
  expect(diffReport(result, true)).toContain('16\t\t−\tline 15\n\t16\t+\t中文');
  expect(diffReport(result, false)).toContain('30\t30\t \tline 29');
  expect(diffReport(compareLines('a', 'a\n'))).toContain('EOF newline (original → revised): no → yes');
  expect(diffReport(result)).not.toMatch(/@@|--- original|\+\+\+ revised/);
});
it('generates a unique local timestamp on every TXT download, including same-millisecond clicks', () => {
  const name = createDiffNamer(), now = new Date(2026, 10, 5, 12, 34, 56, 123);
  expect(name(now)).toBe('text-diff-20261105-123456-123.txt');
  expect(name(now)).toBe('text-diff-20261105-123456-123-2.txt');
});
