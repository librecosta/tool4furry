import { fail, MiB } from '../general/bounds';

export const subtitleLimits = { bytes: 32 * MiB, text: 16_000_000, cues: 100_000 };
const maxTime = 3_599_999_999; // 999:59:59.999, also accepted by the importer.
const maxOffset = 86_400_000;
const brokenText = /[\u0000\uD800-\uDFFF]/u;
const blankLine = /^[ \t]*$/;
const inlineTimestamp = /<((?:\d{2,}:)?\d{2}:\d{2}\.\d{3})>/g;
const timingLine = /^(\S+)[ \t]+-->[ \t]+(\S+)(?:[ \t]+(.*))?$/;
const consecutiveTiming = /^\s*(?:\d{2,}:)?\d{2}:\d{2}[.,]\d{3}[ \t]+-->[ \t]+(?:\d{2,}:)?\d{2}:\d{2}[.,]\d{3}(?:[ \t]|$)/;

export type SubtitleFormat = 'srt' | 'vtt';
export type Cue = {
  uiId: number;
  id: string;
  start: number;
  end: number;
  text: string;
  settings: string;
};
export type SubtitleDocument = {
  format: SubtitleFormat;
  cues: readonly Cue[];
  header: string;
};
export type ShiftDirection = 'earlier' | 'later';

function cueError(index: number, zh: string, en: string): never {
  return fail('第 ' + index + ' 条字幕：' + zh, 'Cue ' + index + ': ' + en);
}

export function parseTime(value: string, vtt: boolean, index?: number) {
  const parts = value.match(
    vtt ? /^(?:(\d{2,}):)?(\d{2}):(\d{2})\.(\d{3})$/ : /^(\d{2,}):(\d{2}):(\d{2}),(\d{3})$/,
  );
  if (parts) {
    const [, hours = '0', minutes, seconds, millis] = parts;
    const h = Number(hours), m = Number(minutes), s = Number(seconds);
    if (h <= 999 && m <= 59 && s <= 59) return ((h * 60 + m) * 60 + s) * 1000 + Number(millis);
  }
  const zh = '时间码无效，请检查小时、分钟、秒和毫秒。';
  const en = 'Invalid timestamp. Check hours, minutes, seconds and milliseconds.';
  return index === undefined ? fail(zh, en) : cueError(index, zh, en);
}

export function formatTime(ms: number, vtt = true) {
  const pad = (value: number, width = 2) => String(value).padStart(width, '0');
  return pad(Math.floor(ms / 3600000)) + ':' + pad(Math.floor(ms / 60000) % 60) + ':' +
    pad(Math.floor(ms / 1000) % 60) + (vtt ? '.' : ',') + pad(ms % 1000, 3);
}

export function checkTextSize(length: number) {
  if (length > subtitleLimits.text)
    fail('字幕文本超过 1600 万 UTF-16 代码单元，无法一次处理。', 'Subtitle text exceeds the 16 million UTF-16 code unit processing limit.');
}

function validateDuration(start: number, end: number, index: number) {
  if (end <= start) cueError(index, '结束时间必须晚于开始时间。', 'End time must be later than start time.');
}

function validateBody(text: string, index: number) {
  if (!text.trim()) cueError(index, '缺少字幕正文。', 'Subtitle text is empty.');
  const lines = text.split('\n');
  if (brokenText.test(text) || lines.some(line => blankLine.test(line)))
    cueError(index, '正文含无效字符或空白分隔行。', 'The text contains an invalid character or a blank separator line.');
  if (lines.some(line => consecutiveTiming.test(line)))
    cueError(index, '正文中出现另一条时间行。请在字幕条目之间留一个空行。', 'Another timing line appears in the text. Separate cues with a blank line.');
}

function validateVttBody(text: string, index: number, start: number, end: number) {
  if (text.includes('-->'))
    cueError(index, 'WebVTT 正文不能包含 -->。', 'WebVTT cue text cannot contain -->.');
  let previous = start;
  for (const [, timestamp] of text.matchAll(inlineTimestamp)) {
    const time = parseTime(timestamp, true, index);
    if (time <= previous || time >= end)
      cueError(index, 'WebVTT 内嵌时间戳须按顺序排列，并位于起止时间之间。', 'Inline WebVTT timestamps must increase within the cue’s start and end times.');
    previous = time;
  }
}

export function parseSubtitles(input: string): SubtitleDocument {
  checkTextSize(input.length);
  const normalized = input.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  if (!normalized.trim()) fail('请输入至少一条字幕。', 'Enter at least one subtitle cue.');
  if (brokenText.test(normalized)) fail('字幕含空字节或无效的 Unicode 字符。', 'Subtitles contain a null byte or invalid Unicode.');
  const lines = normalized.split('\n');
  let cursor = 0;
  while (cursor < lines.length && blankLine.test(lines[cursor])) cursor++;
  if (cursor === lines.length) fail('请输入至少一条字幕。', 'Enter at least one subtitle cue.');
  const vtt = /^WEBVTT(?:[ \t]|$)/.test(lines[cursor]);
  const header = vtt ? lines[cursor++] : '';
  if (vtt && (header.includes('-->') || !blankLine.test(lines[cursor] ?? '')))
    fail('WebVTT 文件头无效，或包含不支持的头部元数据。WEBVTT 行后需要一个空行。', 'Invalid WebVTT header or unsupported header metadata. Put a blank line after the WEBVTT line.');

  const cues: Cue[] = [];
  const vttIds = new Set<string>();
  while (cursor < lines.length) {
    const first = lines[cursor++];
    if (blankLine.test(first)) continue;
    if (vtt && /^(NOTE|STYLE|REGION)(?:[ \t]|$)/.test(first)) {
      const block = first.split(/[ \t]/, 1)[0];
      const line = cursor;
      fail('第 ' + line + ' 行：不支持 WebVTT 的 ' + block + ' 块。', 'Line ' + line + ': WebVTT ' + block + ' blocks are unsupported.');
    }
    const index = cues.length + 1;
    if (index > subtitleLimits.cues)
      fail('字幕超过 10 万条，无法一次处理。', 'The file exceeds the 100,000 cue processing limit.');

    const hasId = !first.includes('-->');
    const id = hasId ? first : '';
    const timing = (hasId ? lines[cursor++] : first)?.trim().match(timingLine);
    if (!timing || (!vtt && id && !/^\d+$/.test(id.trim())))
      cueError(index, '缺少有效的时间行，或字幕序号无效。', 'Missing a valid timing line or subtitle sequence number.');
    const settings = timing[3] ?? '';
    if (settings && (!vtt || !settings.split(/[ \t]+/).every(value => /^[^:\s]+:\S+$/.test(value)) || settings.includes('-->')))
      cueError(index, '时间行包含无效的定位设置。', 'The timing line contains invalid cue settings.');
    const start = parseTime(timing[1], vtt, index), end = parseTime(timing[2], vtt, index);
    validateDuration(start, end, index);
    const textStart = cursor;
    while (cursor < lines.length && !blankLine.test(lines[cursor])) cursor++;
    const text = lines.slice(textStart, cursor).join('\n');
    validateBody(text, index);
    if (vtt) {
      validateVttBody(text, index, start, end);
      if (start < (cues.at(-1)?.start ?? 0))
        cueError(index, 'WebVTT 的开始时间不能早于上一条。', 'A WebVTT start time cannot precede the previous cue.');
      if (id && vttIds.has(id)) cueError(index, 'WebVTT 字幕标识重复。', 'Duplicate WebVTT cue identifier.');
      if (id) vttIds.add(id);
    }
    cues.push({ uiId: index, id, start, end, text, settings });
  }
  if (!cues.length) fail('文件不包含字幕条目。', 'The file contains no subtitle cues.');
  return { format: vtt ? 'vtt' : 'srt', cues, header };
}

export async function readSubtitleFile(file: File) {
  if (!/\.(srt|vtt)$/i.test(file.name))
    fail('请选择 .srt 或 .vtt 文件。', 'Choose an .srt or .vtt file.');
  if (file.size > subtitleLimits.bytes)
    fail('字幕文件超过 32 MiB，无法一次读取。', 'The subtitle file exceeds the 32 MiB read limit.');
  const bytes = await file.arrayBuffer();
  try {
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    return fail('无法读取字幕编码，请将文件保存为 UTF-8 后重试。', 'Invalid subtitle encoding. Save the file as UTF-8 and try again.');
  }
}

export function offsetMilliseconds(value: string, direction: ShiftDirection) {
  const parts = value.trim().match(/^(\d+)(?:[.,](\d{1,3}))?$/);
  if (parts) {
    const millis = Number(parts[1]) * 1000 + Number((parts[2] ?? '').padEnd(3, '0'));
    if (millis <= maxOffset) return direction === 'earlier' && millis ? -millis : millis;
  }
  return fail('请输入 0 至 86400 秒，最多保留三位小数。', 'Enter 0 to 86,400 seconds with up to three decimal places.');
}

export function editCue(cue: Cue, index: number, startText: string, endText: string, body: string, source: SubtitleFormat): Cue {
  checkTextSize(body.length);
  const start = parseTime(startText.trim().replace(',', '.'), true, index);
  const end = parseTime(endText.trim().replace(',', '.'), true, index);
  validateDuration(start, end, index);
  const text = body.replace(/\r\n?/g, '\n');
  validateBody(text, index);
  if (source === 'vtt') validateVttBody(text, index, start, end);
  return { ...cue, start, end, text };
}

/** Scan once per cue collection. Format and offset changes reuse these bounds. */
export function inspectCues(document: SubtitleDocument) {
  let first = 0, last = 0, unordered = 0, arrow = 0, timedText = 0, textUnits = 0;
  let sequenceUnits = 0, sourceIdUnits = 0, settingsUnits = 0;
  const losses = new Set<'settings' | 'ids' | 'header' | 'timedText'>();
  if (document.header.trim() !== '' && document.header.trim() !== 'WEBVTT') losses.add('header');
  document.cues.forEach((cue, i) => {
    if (cue.start < document.cues[first].start) first = i;
    if (cue.end > document.cues[last].end) last = i;
    if (!unordered && i > 0 && cue.start < document.cues[i - 1].start) unordered = i + 1;
    if (!arrow && cue.text.includes('-->')) arrow = i + 1;
    if (!timedText && !cue.text.matchAll(inlineTimestamp).next().done) timedText = i + 1;
    if (cue.settings) losses.add('settings');
    if (document.format === 'vtt' && cue.id) losses.add('ids');
    textUnits += cue.text.length;
    sequenceUnits += String(i + 1).length + 1;
    if (cue.id) sourceIdUnits += cue.id.length + 1;
    if (cue.settings) settingsUnits += cue.settings.length + 1;
  });
  if (timedText && document.format === 'vtt') losses.add('timedText');
  return { first, last, unordered, arrow, timedText, textUnits, sequenceUnits, sourceIdUnits, settingsUnits, losses };
}

export function validateShift(document: SubtitleDocument, facts: ReturnType<typeof inspectCues>, offset: number) {
  if (!document.cues.length) fail('没有可输出的字幕。', 'There are no subtitles to export.');
  if (!Number.isSafeInteger(offset) || Math.abs(offset) > maxOffset)
    fail('整体时间调整超出范围。', 'The overall time adjustment is out of range.');
  if (document.cues[facts.first].start + offset < 0)
    cueError(facts.first + 1, '提前后开始时间小于零，请减小调整量。', 'The adjusted start time is negative. Use a smaller shift.');
  if (document.cues[facts.last].end + offset > maxTime)
    cueError(facts.last + 1, '延后后超过 999:59:59.999。', 'The adjusted end time exceeds 999:59:59.999.');
  if (offset && facts.timedText && document.format === 'vtt')
    cueError(facts.timedText, '正文含 WebVTT 内嵌时间戳，不能整体偏移。', 'Overall shifting is unavailable with inline WebVTT timestamps.');
}

export function validateExport(document: SubtitleDocument, facts: ReturnType<typeof inspectCues>, format: SubtitleFormat, offset: number, sourceView = false) {
  validateShift(document, facts, offset);
  const count = document.cues.length;
  const timingLineUnits = '00:00:00.000 --> 00:00:00.000\n'.length;
  let outputUnits = facts.textUnits + (timingLineUnits + 2) * count - 1;
  if (format === 'vtt') {
    if (facts.unordered) cueError(facts.unordered, 'WebVTT 的开始时间不能早于上一条，请调整时间。', 'WebVTT requires nondecreasing start times. Adjust this cue.');
    if (facts.arrow) cueError(facts.arrow, 'WebVTT 正文不能包含 -->。', 'WebVTT cue text cannot contain -->.');
    if (document.format === 'srt' && facts.timedText)
      cueError(facts.timedText, '正文中的时间标签会被 WebVTT 解释为内嵌时间戳，请先编辑该条。', 'WebVTT interprets the timestamp tag in this SRT cue as timed text. Edit the cue before exporting.');
    outputUnits += (document.header || 'WEBVTT').length + 2;
    if (document.format === 'vtt') outputUnits += facts.sourceIdUnits + facts.settingsUnits;
  } else {
    outputUnits += sourceView ? facts.sourceIdUnits : facts.sequenceUnits;
  }
  // Three-digit hours add at most one unit per timecode. Scan only near the processing limit.
  if (outputUnits + 2 * count > subtitleLimits.text) {
    checkTextSize(outputUnits);
    const threeDigitHours = 100 * 3600000;
    for (const cue of document.cues) {
      if (cue.start + offset >= threeDigitHours) outputUnits++;
      if (cue.end + offset >= threeDigitHours) outputUnits++;
    }
    checkTextSize(outputUnits);
  }
}

/** Serialize the current snapshot; the working cues are never shifted or resequenced in place. */
export function serializeSubtitles(
  document: SubtitleDocument,
  format: SubtitleFormat = document.format,
  offset = 0,
  facts = inspectCues(document),
  sourceView = false,
) {
  validateExport(document, facts, format, offset, sourceView);
  const vtt = format === 'vtt';
  const blocks = document.cues.map((cue, index) => {
    const id = vtt ? (document.format === 'vtt' ? cue.id : '') : (sourceView ? cue.id : String(index + 1));
    return (id ? id + '\n' : '') + formatTime(cue.start + offset, vtt) + ' --> ' + formatTime(cue.end + offset, vtt) +
      (vtt && cue.settings ? ' ' + cue.settings : '') + '\n' + cue.text;
  });
  return (vtt ? (document.header || 'WEBVTT') + '\n\n' : '') + blocks.join('\n\n') + '\n';
}

export function convertSubtitles(input: string, format: SubtitleFormat, offset: string) {
  const document = parseSubtitles(input);
  const facts = inspectCues(document);
  const milliseconds = /^-?\d+$/.test(offset) ? Number(offset) : NaN;
  const text = serializeSubtitles(document, format, milliseconds, facts);
  return {
    cues: document.cues.map(cue => ({ ...cue, start: cue.start + milliseconds, end: cue.end + milliseconds })),
    layoutDropped: format === 'srt' && facts.losses.has('settings'),
    text,
  };
}
