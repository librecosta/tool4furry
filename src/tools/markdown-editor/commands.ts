import { EditorSelection, Transaction, type ChangeSpec } from '@codemirror/state';
import type { Command, EditorView } from '@codemirror/view';

export type Format = 'bold' | 'italic' | 'strike' | 'bullet' | 'ordered' | 'task' | 'quote' |
  'link' | 'image' | 'inlineCode' | 'codeBlock' | 'table' | 'rule' | 'body' | 1 | 2 | 3 | 4 | 5 | 6;

const inline = { bold: '**', italic: '*', strike: '~~' };
function longestTicks(text: string) {
  let length = 0;
  for (const [run] of text.matchAll(/`+/g)) length = Math.max(length, run.length);
  return length;
}

function editSelections(view: EditorView, format: Format) {
  const state = view.state;
  const transaction = state.changeByRange(range => {
    const selected = state.sliceDoc(range.from, range.to);
    if (format === 'link' || format === 'image') {
      const label = selected.replace(/\n/g, ' ').replace(/[\\[\]]/g, '\\$&');
      const prefix = `${format === 'image' ? '!' : ''}[${label}](`;
      const from = range.from + prefix.length;
      return {
        changes: { from: range.from, to: range.to, insert: prefix + 'https://)' },
        range: EditorSelection.range(from, from + 8),
      };
    }
    if (format === 'inlineCode' || format === 'bold' || format === 'italic' || format === 'strike') {
      const marker = format === 'inlineCode' ? '`'.repeat(longestTicks(selected) + 1) : inline[format];
      const pad = format === 'inlineCode' && (selected.startsWith('`') || selected.endsWith('`') ||
        (/\S/.test(selected) && selected.startsWith(' ') && selected.endsWith(' '))) ? ' ' : '';
      const prefix = marker + pad, suffix = pad + marker;
      return {
        changes: { from: range.from, to: range.to, insert: prefix + selected + suffix },
        range: EditorSelection.range(range.anchor + prefix.length, range.head + prefix.length),
      };
    }
    const fence = '`'.repeat(format === 'codeBlock' ? Math.max(3, longestTicks(selected) + 1) : 3);
    const left = state.sliceDoc(Math.max(0, range.from - 2), range.from);
    const right = state.sliceDoc(range.to, range.to + 2);
    const before = range.from === 0 || left.endsWith('\n\n') ? '' : left.endsWith('\n') ? '\n' : '\n\n';
    const after = range.to === state.doc.length || right.startsWith('\n\n') ? '' : right.startsWith('\n') ? '\n' : '\n\n';
    const prefix = format === 'codeBlock' ? before + fence + '\n' : before;
    const content = format === 'codeBlock' ? selected + (selected.endsWith('\n') ? '' : '\n') + fence
      : format === 'table' ? '| Column 1 | Column 2 |\n| --- | --- |\n| Cell | Cell |' : '---';
    const start = range.from + prefix.length;
    const selection = format === 'codeBlock'
      ? EditorSelection.range(start, start + selected.length)
      : EditorSelection.cursor(start + content.length);
    return {
      changes: { from: range.from, to: range.to, insert: prefix + content + after },
      range: selection,
    };
  });
  view.dispatch({ ...transaction, scrollIntoView: true, userEvent: 'input.format', annotations: Transaction.addToHistory.of(true) });
}

function editLines(view: EditorView, format: 1 | 2 | 3 | 4 | 5 | 6 | 'body' | 'bullet' | 'ordered' | 'task' | 'quote') {
  const { doc, selection } = view.state;
  const changes: ChangeSpec[] = [];
  const seen = new Set<number>();
  const heading = typeof format === 'number' || format === 'body';
  for (const range of selection.ranges) {
    const start = doc.lineAt(range.from).number;
    // A selection ending at column 1 excludes that line.
    const end = doc.lineAt(range.empty ? range.to : range.to - 1).number;
    for (let number = start; number <= end; number++) {
      if (seen.has(number)) continue;
      seen.add(number);
      const line = doc.line(number);
      if (!line.text.trim() && start !== end && !heading) continue;
      const indent = /^[ \t]*/.exec(line.text)![0].length;
      const text = line.text.slice(indent);
      const old = heading ? /^(?:#{1,6}(?:[ \t]+|$))/.exec(text)?.[0] ?? ''
        : /^(?:>[ \t]?|(?:[-+*]|\d+[.)])[ \t]+(?:\[[ xX]\][ \t]+)?)/.exec(text)?.[0] ?? '';
      const prefix = typeof format === 'number' ? '#'.repeat(format) + ' '
        : format === 'body' ? '' : format === 'quote' ? '> ' : format === 'task' ? '- [ ] '
          : format === 'ordered' ? `${number - start + 1}. ` : '- ';
      if (old !== prefix) changes.push({ from: line.from + indent, to: line.from + indent + old.length, insert: prefix });
    }
  }
  view.dispatch({ changes, userEvent: 'input.format', scrollIntoView: true });
}

export function formatCommand(format: Format): Command {
  return view => {
    if (view.state.readOnly || view.composing) return false;
    if (typeof format === 'number' || format === 'body' || format === 'bullet' ||
        format === 'ordered' || format === 'task' || format === 'quote') editLines(view, format);
    else editSelections(view, format);
    return true;
  };
}
