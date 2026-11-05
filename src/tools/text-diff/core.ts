import { diffArrays } from 'diff';
import { fail } from '../general/bounds';

export type LineEnding = '' | '\n' | '\r\n' | '\r';
export type DiffLine = {
  type: 'equal' | 'added' | 'removed';
  oldNumber?: number;
  newNumber?: number;
  text: string;
  // Both real source strings, including ignored whitespace and separators.
  oldText?: string;
  newText?: string;
  oldEnding?: LineEnding;
  newEnding?: LineEnding;
};
export type DiffResult = {
  lines: DiffLine[];
  added: number;
  removed: number;
  changes: number;
  oldCount: number;
  newCount: number;
  ignoreEndWhitespace: boolean;
  eof: { old: boolean; new: boolean; changed: boolean };
  endings: { old: string; new: string };
};
export const comparisonBudget = 750;

/** A terminated empty line is real; the empty tail after its separator isn't. */
export function logicalLines(text: string) {
  const lines: { text: string; ending: LineEnding }[] = [];
  const separator = /\r\n|\n|\r/g;
  let start = 0, match: RegExpExecArray | null;
  while ((match = separator.exec(text))) {
    lines.push({ text: text.slice(start, match.index), ending: match[0] as LineEnding });
    start = match.index + match[0].length;
  }
  if (start < text.length) lines.push({ text: text.slice(start), ending: '' });
  return lines;
}
function endingStyle(lines: ReturnType<typeof logicalLines>) {
  const found = new Set(lines.map(line => line.ending).filter(Boolean));
  return found.size > 1 ? 'mixed' : found.has('\r\n') ? 'CRLF' : found.has('\r') ? 'CR' : found.has('\n') ? 'LF' : 'none';
}

/** One alignment source for the viewer, counts and readable report. */
export function compareLines(left: string, right: string, ignoreEndWhitespace = false, timeout = comparisonBudget): DiffResult {
  const old = logicalLines(left), revised = logicalLines(right);
  const key = (line: { text: string }) => ignoreEndWhitespace ? line.text.trimEnd() : line.text;
  const parts = diffArrays(old.map(key), revised.map(key), { timeout });
  if (!parts) fail('比较超时，请减少差异范围后重试。', 'Comparison timed out. Compare a smaller range of changes.');
  const lines: DiffLine[] = [];
  let oldIndex = 0, newIndex = 0;
  for (const part of parts) for (let i = 0; i < part.count; i++) {
    const a = part.added ? undefined : old[oldIndex++];
    const b = part.removed ? undefined : revised[newIndex++];
    lines.push({
      type: part.added ? 'added' : part.removed ? 'removed' : 'equal',
      oldNumber: a ? oldIndex : undefined, newNumber: b ? newIndex : undefined,
      text: (b ?? a)!.text, oldText: a?.text, newText: b?.text,
      oldEnding: a?.ending, newEnding: b?.ending,
    });
  }
  const added = lines.filter(line => line.type === 'added').length;
  const removed = lines.filter(line => line.type === 'removed').length;
  const oldEOF = !!old.at(-1)?.ending, newEOF = !!revised.at(-1)?.ending;
  return {
    lines, added, removed, changes: added + removed,
    oldCount: old.length, newCount: revised.length, ignoreEndWhitespace,
    eof: { old: oldEOF, new: newEOF, changed: oldEOF !== newEOF },
    endings: { old: endingStyle(old), new: endingStyle(revised) },
  };
}
