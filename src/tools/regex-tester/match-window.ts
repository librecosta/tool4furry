import type { RegexMatch } from './protocol';

export const matchRowHeight = 46;
const overscan = 4;

/** Matches are in source order. Traverse line breaks once, using the editor's LF boundaries. */
export function matchLines(text: string, matches: readonly RegexMatch[]) {
  let line = 1;
  let nextBreak = text.indexOf('\n');
  return matches.map(match => {
    while (nextBreak !== -1 && nextBreak < match.index) {
      line++;
      nextBreak = text.indexOf('\n', nextBreak + 1);
    }
    return line;
  });
}

/** A single inline disclosure can add space to the otherwise fixed-height list. */
export function matchWindow(count: number, expanded: number, extra: number, scroll: number, viewport: number) {
  const offset = (index: number) => index * matchRowHeight + (index > expanded ? extra : 0);
  const rowAt = (y: number) => {
    if (extra && y >= offset(expanded)) {
      if (y < offset(expanded + 1)) return expanded;
      y -= extra;
    }
    return Math.floor(y / matchRowHeight);
  };
  return {
    offset,
    height: offset(count),
    start: Math.min(count, Math.max(0, rowAt(scroll) - overscan)),
    end: Math.min(count, rowAt(scroll + viewport) + 1 + overscan),
  };
}
