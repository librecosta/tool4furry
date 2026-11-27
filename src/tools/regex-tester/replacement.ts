import { limits, RegexIssue } from './protocol';

/** Check the length before slicing a source or joining the next batch. */
export class BoundedOutput {
  private size = 0;
  private parts: string[] = [];
  private chunks: string[] = [];

  append(source: string, from = 0, to = source.length) {
    const length = to - from;
    if (!length) return;
    if (this.size + length > limits.output) throw new RegexIssue('output-limit');
    this.size += length;
    this.parts.push(from === 0 && to === source.length ? source : source.slice(from, to));
    if (this.parts.length === 512) this.flush();
  }

  private flush() {
    this.chunks.push(this.parts.join(''));
    this.parts = [];
  }

  finish() {
    if (this.parts.length) this.flush();
    return this.chunks.join('');
  }
}

type Segment =
  | { kind: 'text'; value: string }
  | { kind: 'match' | 'prefix' | 'suffix' }
  | { kind: 'capture'; index: number }
  | { kind: 'named'; name: string };

const digit = (value: number) => value >= 48 && value <= 57;

/** Compile ECMAScript GetSubstitution tokens once for a match's capture schema. */
export function replacementSegments(template: string, captures: number, hasNames: boolean) {
  const parts: Segment[] = [];
  let textStart = 0;
  for (let at = template.indexOf('$'); at >= 0; at = template.indexOf('$', at + 1)) {
    const next = template[at + 1];
    let end = at + 2, part: Segment | undefined;
    if (next === '$') part = { kind: 'text', value: '$' };
    else if (next === '&') part = { kind: 'match' };
    else if (next === String.fromCharCode(96)) part = { kind: 'prefix' };
    else if (next === "'") part = { kind: 'suffix' };
    else if (next === '<' && hasNames) {
      const close = template.indexOf('>', end);
      if (close >= 0) {
        part = { kind: 'named', name: template.slice(end, close) };
        end = close + 1;
      } else {
        // The remaining template has no closing angle bracket. Other dollar
        // sequences still need scanning, but no later named reference can close.
        hasNames = false;
      }
    } else if (digit(template.charCodeAt(at + 1))) {
      const first = Number(next);
      const second = digit(template.charCodeAt(end)) ? first * 10 + Number(template[end]) : 0;
      if (second > 0 && second <= captures) {
        part = { kind: 'capture', index: second };
        end++;
      } else if (first > 0 && first <= captures) part = { kind: 'capture', index: first };
    }
    if (!part) continue;
    if (textStart < at) parts.push({ kind: 'text', value: template.slice(textStart, at) });
    parts.push(part);
    textStart = end;
    at = end - 1;
  }
  if (textStart < template.length) parts.push({ kind: 'text', value: template.slice(textStart) });
  return parts;
}

export function appendReplacement(writer: BoundedOutput, text: string, match: RegExpExecArray, parts: Segment[]) {
  for (const part of parts) {
    switch (part.kind) {
      case 'text': writer.append(part.value); break;
      case 'match': writer.append(match[0]); break;
      case 'prefix': writer.append(text, 0, match.index); break;
      case 'suffix': writer.append(text, match.index + match[0].length); break;
      case 'capture': writer.append(match[part.index] ?? ''); break;
      case 'named': writer.append(match.groups?.[part.name] ?? ''); break;
    }
  }
}
