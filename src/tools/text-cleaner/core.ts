export type CleanOptions = {
  trimEnd: boolean;
  trimStart: boolean;
  blankLines: 'keep' | 'collapse' | 'remove';
  lineEnding: 'lf' | 'crlf';
};
export const defaults: Readonly<CleanOptions> = {
  trimEnd: true,
  trimStart: false,
  blankLines: 'collapse',
  lineEnding: 'lf',
};

/** A single line pass; no shared boundedText quota and no change to the source. */
export function cleanText(
  input: string,
  options: Readonly<CleanOptions> = defaults,
) {
  if (!input) return '';
  const lines = input.split(/\r\n?|\n/),
    ended = /[\r\n]$/.test(input);
  if (ended) lines.pop(); // The terminal separator is not another blank record.
  const output: string[] = [];
  let previousBlank = false;
  for (let line of lines) {
    if (options.trimEnd) line = line.trimEnd();
    if (options.trimStart) line = line.trimStart();
    const blank = !/\S/u.test(line);
    if (
      blank &&
      (options.blankLines === 'remove' ||
        (options.blankLines === 'collapse' && previousBlank))
    )
      continue;
    output.push(line);
    previousBlank = blank;
  }
  const separator = options.lineEnding === 'crlf' ? '\r\n' : '\n';
  return output.join(separator) + (ended && output.length ? separator : '');
}
/** Basic editor stats without Segmenter, match arrays or per-character copies. */
export function textStats(text: string) {
  let characters = text.length,
    lines = text ? 1 : 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (
      code >= 0xdc00 &&
      code <= 0xdfff &&
      i &&
      text.charCodeAt(i - 1) >= 0xd800 &&
      text.charCodeAt(i - 1) <= 0xdbff
    )
      characters--;
    if (code === 13 || (code === 10 && text.charCodeAt(i - 1) !== 13)) lines++;
  }
  return { characters, lines };
}
export function createCleanedNamer() {
  let previous = '',
    collision = 0;
  return (now = new Date()) => {
    const pad = (value: number, width = 2) =>
      String(value).padStart(width, '0');
    const stamp = `${pad(now.getFullYear(), 4)}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}-${pad(now.getMilliseconds(), 3)}`;
    collision = stamp === previous ? collision + 1 : 0;
    previous = stamp;
    return `cleaned-${stamp}${collision ? `-${collision + 1}` : ''}.txt`;
  };
}
export const cleanedDownloadName = createCleanedNamer();
