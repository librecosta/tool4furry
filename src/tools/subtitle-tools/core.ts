import { boundedText, fail } from '../general/bounds';
export type Cue = {
  start: number;
  end: number;
  text: string;
  settings: string;
  id: string;
};
function bad(): never {
  return fail(
    '字幕时间或结构无效。请检查时间戳、空行与正文。',
    'Invalid subtitle timing or structure. Check timestamps, blank lines and cue text.',
  );
}
export function parseTime(value: string, vtt: boolean) {
  const p = value.match(
    vtt
      ? /^(?:(\d{2,}):)?(\d{2}):(\d{2})\.(\d{3})$/
      : /^(\d{2,}):(\d{2}):(\d{2}),(\d{3})$/,
  );
  if (!p) bad();
  const h = Number(p[1] ?? 0),
    m = Number(p[2]),
    s = Number(p[3]),
    ms = Number(p[4]);
  if (m > 59 || s > 59 || h > 999) bad();
  return ((h * 60 + m) * 60 + s) * 1000 + ms;
}
export function parseSubtitles(input: string) {
  boundedText(input, 1000000);
  let text = input
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .trim();
  const vtt = /^WEBVTT(?:[ \t].*)?(?:\n|$)/.test(text);
  if (vtt) {
    const split = text.indexOf('\n\n');
    if (split < 0) bad();
    text = text.slice(split + 2);
  }
  if (!text) bad();
  const cues: Cue[] = [];
  for (const block of text.split(/\n[ \t]*\n/)) {
    const lines = block.split('\n');
    if (vtt && /^(NOTE|STYLE|REGION)(?:\s|$)/.test(lines[0]))
      fail(
        '暂不支持 NOTE、STYLE 或 REGION 块，请移除后再转换。',
        'NOTE, STYLE and REGION blocks are not supported. Remove them before converting.',
      );
    let id = '';
    if (!lines[0].includes('-->')) id = lines.shift()!;
    if (!vtt && id && !/^\d+$/.test(id)) bad();
    const timing = lines.shift()?.match(/^(\S+)\s+-->\s+(\S+)(?:[ \t]+(.*))?$/);
    if (!timing || !lines.length || !lines.some((v) => v.trim())) bad();
    if (!vtt && timing[3]) bad();
    const start = parseTime(timing[1], vtt),
      end = parseTime(timing[2], vtt);
    if (end <= start) bad();
    cues.push({
      start,
      end,
      text: lines.join('\n'),
      id,
      settings: timing[3] ?? '',
    });
    if (cues.length > 5000)
      fail('最多处理 5000 条字幕。', 'At most 5,000 cues are supported.');
  }
  return { cues, format: vtt ? 'vtt' : 'srt' };
}
export function formatTime(ms: number, vtt: boolean) {
  const h = Math.floor(ms / 3600000),
    m = Math.floor(ms / 60000) % 60,
    s = Math.floor(ms / 1000) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}${vtt ? '.' : ','}${String(ms % 1000).padStart(3, '0')}`;
}
export function convertSubtitles(
  input: string,
  format: 'srt' | 'vtt',
  offset: string,
) {
  if (
    !/^-?\d+$/.test(offset) ||
    !Number.isSafeInteger(Number(offset)) ||
    Math.abs(Number(offset)) > 86400000
  )
    fail(
      '偏移必须是 ±86400000 内的整数毫秒。',
      'Offset must be integer milliseconds within ±86400000.',
    );
  const parsed = parseSubtitles(input),
    cues = parsed.cues.map((c) => ({
      ...c,
      start: c.start + Number(offset),
      end: c.end + Number(offset),
    }));
  if (cues.some((c) => c.start < 0 || c.end > 3600000000))
    fail(
      '偏移后的字幕时间超出范围。',
      'Shifted subtitle timestamps are outside the supported range.',
    );
  return {
    cues,
    layoutDropped: format === 'srt' && cues.some((c) => c.settings),
    text:
      (format === 'vtt' ? 'WEBVTT\n\n' : '') +
      cues
        .map((c, i) =>
          `${format === 'srt' ? i + 1 : c.id}\n${formatTime(c.start, format === 'vtt')} --> ${formatTime(c.end, format === 'vtt')}${format === 'vtt' && c.settings ? ' ' + c.settings : ''}\n${c.text}`.replace(
            /^\n/,
            '',
          ),
        )
        .join('\n\n') +
      '\n',
  };
}
