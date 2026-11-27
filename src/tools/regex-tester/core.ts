import { diffChars } from 'diff';
import Papa from 'papaparse';
import {
  flagsOrder, limits, RegexIssue, type ExtractSettings, type Issue,
  type Range, type RegexMatch, type RegexRequest, type RegexResult, type TestCase, type TestResult,
} from './protocol';
import { appendReplacement, BoundedOutput, replacementSegments } from './replacement';

export type { RegexRequest, RegexResult } from './protocol';

/** Worker-only adapter. Native RegExp owns compilation, flags, and lastIndex. */
let supported: string | undefined;
export function supportedFlags() {
  return supported ??= [...flagsOrder].filter(flag => {
    try { new RegExp('', flag); return true; } catch { return false; }
  }).join('');
}

export function compile(pattern: string, flags: string, captureIndices = false) {
  if (pattern.length > limits.pattern) throw new RegexIssue('pattern-limit');
  if (flags.length > flagsOrder.length || new Set(flags).size !== flags.length ||
      [...flags].some(flag => !supportedFlags().includes(flag)) || (flags.includes('u') && flags.includes('v')))
    throw new RegexIssue('flags');
  const effective = captureIndices && supportedFlags().includes('d') && !flags.includes('d') ? flags + 'd' : flags;
  try { return new RegExp(pattern, effective); }
  catch (error) {
    if (error instanceof SyntaxError) throw new RegexIssue('syntax');
    throw error;
  }
}

function* matchesOf(regex: RegExp, text: string) {
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text))) {
    yield match;
    if (!regex.global) break;
    if (!match[0].length) {
      const at = regex.lastIndex;
      const codePoint = (regex.unicode || regex.unicodeSets) && text.codePointAt(at);
      regex.lastIndex = at + (codePoint && codePoint > 0xffff ? 2 : 1);
    }
  }
}

function retentionCost(match: RegExpExecArray) {
  let cost = 96;
  for (const value of match) cost += 48 + (value?.length ?? 0);
  for (const name in match.groups) cost += 56 + name.length + (match.groups[name]?.length ?? 0);
  return cost;
}

function recordMatch(match: RegExpExecArray): RegexMatch {
  return {
    index: match.index, end: match.index + match[0].length, value: match[0],
    groups: match.slice(1).map(value => value ?? null),
    named: Object.fromEntries(Object.entries(match.groups ?? {}).map(([name, value]) => [name, value ?? null])),
    ranges: match.indices?.slice(1).map(range => range ?? null),
    namedRanges: match.indices?.groups && Object.fromEntries(
      Object.entries(match.indices.groups).map(([name, range]) => [name, (range ?? null) as Range | null]),
    ),
  };
}

function selectedValue(match: RegExpExecArray, group: ExtractSettings['group']) {
  if (typeof group === 'number') {
    if (!Number.isInteger(group) || group < 0 || group >= match.length) throw new RegexIssue('extract-group');
    return match[group] ?? null;
  }
  if (!match.groups || !Object.hasOwn(match.groups, group)) throw new RegexIssue('extract-group');
  return match.groups[group] ?? null;
}

function extractRows(values: (string | null)[], settings: ExtractSettings) {
  const rows = settings.unique ? [...new Set(values)] : values;
  if (settings.separator.length > limits.separator) throw new RegexIssue('separator-limit');
  const writer = new BoundedOutput();
  if (settings.format === 'json') writer.append('[');
  if (settings.format === 'csv') writer.append('status,value');
  let absent = 0;
  for (const [index, value] of rows.entries()) {
    if (value === null) absent++;
    switch (settings.format) {
      case 'txt':
        if (index) writer.append(settings.separator);
        writer.append(value ?? '');
        break;
      case 'json':
        if (index) writer.append(',');
        writer.append(JSON.stringify(value));
        break;
      case 'csv':
        writer.append('\r\n');
        writer.append(Papa.unparse([[value === null ? 'absent' : 'matched', value ?? '']]));
        break;
    }
  }
  if (settings.format === 'json') writer.append(']');
  return { value: writer.finish(), rows: rows.length, absent };
}

function scan(regex: RegExp, text: string, replacement?: string, extraction?: ExtractSettings, retain = true) {
  const matches: RegexMatch[] = [], values: (string | null)[] = [];
  let retained = 0, count: number | null = 0, partial = false, offset = 0, operations = 0;
  let writer = replacement === undefined ? undefined : new BoundedOutput();
  let parts: ReturnType<typeof replacementSegments> | undefined, issue: Issue | undefined;
  for (const match of matchesOf(regex, text)) {
    if (count === limits.scan) {
      count = null;
      partial = true;
      issue ??= { code: 'scan-limit' };
      writer = undefined;
      break;
    }
    count++;
    if (retain && !partial) {
      const cost = retentionCost(match);
      if (matches.length === limits.records || retained + cost > limits.captureUnits) {
        partial = true;
        if (!writer) {
          count = null;
          issue ??= { code: 'capture-limit' };
          break;
        }
      } else {
        retained += cost;
        matches.push(recordMatch(match));
      }
    }
    if (extraction && !issue) {
      try { values.push(selectedValue(match, extraction.group)); }
      catch (error) {
        if (!(error instanceof RegexIssue)) throw error;
        issue = error.issue;
      }
    }
    if (writer) {
      try {
        parts ??= replacementSegments(replacement!, match.length - 1, match.groups !== undefined);
        operations += parts.length;
        if (operations > 2_000_000) throw new RegexIssue('output-limit');
        writer.append(text, offset, match.index);
        appendReplacement(writer, text, match, parts);
        offset = match.index + match[0].length;
      } catch (error) {
        if (!(error instanceof RegexIssue)) throw error;
        issue = error.issue;
        writer = undefined;
        if (regex.global) {
          count = null;
          partial = true;
        }
        break;
      }
    }
  }
  let replaced: string | undefined;
  if (writer) {
    try { writer.append(text, offset); replaced = writer.finish(); }
    catch (error) {
      if (!(error instanceof RegexIssue)) throw error;
      issue = error.issue;
    }
  }
  let output: ReturnType<typeof extractRows> | undefined;
  if (extraction && !partial && !issue) {
    try { output = extractRows(values, extraction); }
    catch (error) {
      if (!(error instanceof RegexIssue)) throw error;
      issue = error.issue;
    }
  }
  return { matches, count, partial, replaced, extraction: output, issue };
}

function runCases(request: RegexRequest, cases: TestCase[], start: number) {
  let data = 0;
  if (cases.length > limits.tests) throw new RegexIssue('test-limit');
  for (const test of cases) data += test.text.length + test.expected.length;
  if (data > limits.testData) throw new RegexIssue('test-limit');
  const checkTime = () => {
    if (performance.now() - start >= limits.testTimeout) throw new RegexIssue('test-time');
  };
  return cases.map((test): TestResult => {
    try {
      checkTime();
      if (test.text.length > limits.testText || test.expected.length > limits.testText) throw new RegexIssue('test-limit');
      const regex = compile(request.pattern, request.flags);
      if (test.assertion === 'replace') {
        const result = scan(regex, test.text, request.replacement, undefined, false);
        checkTime();
        if (result.issue) return { id: test.id, status: 'error', issue: result.issue };
        const value = result.replaced!;
        return { id: test.id, status: value === test.expected ? 'pass' : 'fail', actual: value.slice(0, 512), truncated: value.length > 512 };
      }
      if (test.assertion === 'count') {
        if (!/^(?:0|[1-9]\d*)$/.test(test.expected) || !Number.isSafeInteger(Number(test.expected)))
          throw new RegexIssue('test-expected');
        const result = scan(regex, test.text, undefined, undefined, false);
        checkTime();
        if (result.issue) return { id: test.id, status: 'error', issue: result.issue };
        return { id: test.id, status: result.count === Number(test.expected) ? 'pass' : 'fail', actual: String(result.count) };
      }
      const found = regex.exec(test.text) !== null;
      checkTime();
      return { id: test.id, status: found === (test.assertion === 'match') ? 'pass' : 'fail', actual: String(found) };
    } catch (error) {
      return { id: test.id, status: 'error', issue: error instanceof RegexIssue ? error.issue : { code: 'worker' } };
    }
  });
}

export function evaluateRegex(request: RegexRequest): RegexResult {
  const start = performance.now();
  const { pattern, flags, text, replacement, mode = 'replace' } = request;
  const regex = compile(pattern, flags, mode !== 'tests');
  if ((mode === 'replace' || mode === 'tests') && replacement.length > limits.replacement)
    throw new RegexIssue('replacement-limit');
  if (mode === 'tests') {
    const tests = runCases(request, request.cases ?? [], start);
    return { matches: [], count: null, partial: false, tests, elapsed: performance.now() - start };
  }
  if (text.length > limits.text) throw new RegexIssue('text-limit');
  const result = scan(regex, text, mode === 'replace' ? replacement : undefined, mode === 'extract' ? request.extract : undefined);
  const elapsed = performance.now() - start;
  const diff = result.replaced !== undefined && text.length <= limits.diff && result.replaced.length <= limits.diff
    ? diffChars(text, result.replaced, { timeout: 120, maxEditLength: 1200 }) : undefined;
  return { ...result, elapsed, diff };
}
