// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  editCue,
  inspectCues,
  offsetMilliseconds,
  parseSubtitles,
  readSubtitleFile,
  serializeSubtitles,
  subtitleLimits,
  type SubtitleDocument,
} from '../src/tools/subtitle-tools/core';
import { createSubtitleNamer, subtitleStem } from '../src/tools/subtitle-tools/delivery';

const srt = '7\r\n00:00:01,000 --> 00:00:03,000\r\n你好 🐾\r\n\tSecond line\r\n\r\n9\r\n00:00:02,500 --> 00:00:04,000\r\nOverlapping\r\n';
const vtt = 'WEBVTT Opening captions\n\nintro\n00:01.000 --> 00:03.000 line:20% align:start\n你好 🐾\n\tSecond line\n\n00:02.500 --> 00:04.000\nOverlapping\n';
const content = (document: SubtitleDocument) =>
  document.cues.map(({ start, end, text }) => ({ start, end, text }));

describe('subtitle input and output', () => {
  it('reads actual UTF-8 with BOM and CRLF and round-trips SRT/WebVTT in both directions', async () => {
    const file = new File(['\uFEFF', srt], '示例.srt');
    const source = parseSubtitles(await readSubtitleFile(file));
    expect(source.cues.map(cue => [cue.uiId, cue.id, cue.text])).toEqual([
      [1, '7', '你好 🐾\n\tSecond line'], [2, '9', 'Overlapping'],
    ]);
    const converted = serializeSubtitles(source, 'vtt');
    expect(converted).toContain('00:00:01.000 --> 00:00:03.000');
    expect(parseSubtitles(converted).cues.map(cue => cue.id)).toEqual(['', '']);
    const back = serializeSubtitles(parseSubtitles(converted), 'srt');
    expect(back).toContain('1\n00:00:01,000 --> 00:00:03,000');
    expect(parseSubtitles(back).cues.map(cue => cue.id)).toEqual(['1', '2']);
    expect(content(parseSubtitles(back))).toEqual(content(source));
    expect(content(parseSubtitles(serializeSubtitles(source)))).toEqual(content(source));
    expect(await file.text()).toBe(srt);
  });

  it('keeps WebVTT IDs, settings and header on same-format output and identifies actual SRT losses', async () => {
    const source = parseSubtitles(await readSubtitleFile(new File([vtt], 'track.vtt')));
    const sameFormat = parseSubtitles(serializeSubtitles(source, 'vtt'));
    expect(sameFormat).toEqual(source);
    expect(sameFormat.header).toBe('WEBVTT Opening captions');
    expect(sameFormat.cues.map(cue => [cue.id, cue.settings])).toEqual([
      ['intro', 'line:20% align:start'], ['', ''],
    ]);
    expect(inspectCues(source).losses).toEqual(new Set(['header', 'settings', 'ids']));
    const asSrt = parseSubtitles(serializeSubtitles(source, 'srt'));
    expect(content(asSrt)).toEqual(content(source));
    expect(asSrt.cues.every(cue => cue.settings === '')).toBe(true);
  });

  it.each(['NOTE explanatory text', 'STYLE', 'REGION'])('points to an unsupported WebVTT block %s', block => {
    expect(() => parseSubtitles('WEBVTT\n\n' + block + '\ntext\n\n' + vtt.split('\n\n')[1]))
      .toThrow('Line 3: WebVTT ' + block.split(' ')[0] + ' blocks are unsupported.');
  });

  it('reports real cue positions and rejects malformed data instead of producing partial output', async () => {
    expect(() => parseSubtitles('plain text')).toThrow('Cue 1: Missing a valid timing line');
    expect(() => parseSubtitles(srt.replace('00:00:04,000', '00:00:60,000'))).toThrow('Cue 2: Invalid timestamp');
    expect(() => parseSubtitles(srt.replace('00:00:04,000', '00:00:02,500'))).toThrow('Cue 2: End time');
    expect(() => parseSubtitles(srt.replace('Overlapping', ''))).toThrow('Cue 2: Subtitle text is empty');
    expect(() => parseSubtitles(srt.replace('Second line\r\n\r\n9', 'Second line\r\n9'))).toThrow('Cue 1: Another timing line');
    expect(() => parseSubtitles(srt.replace('Overlapping', '\uD800'))).toThrow('invalid Unicode');
    expect(() => parseSubtitles(vtt.replace('\n\n00:02.500', '\n\nintro\n00:02.500'))).toThrow('Cue 2: Duplicate');
    expect(() => parseSubtitles(vtt.replace('line:20%', 'line'))).toThrow('Cue 1: The timing line contains invalid');
    await expect(readSubtitleFile(new File([Uint8Array.of(0xc3, 0x28)], 'bad.srt'))).rejects.toThrow('Invalid subtitle encoding');
    await expect(readSubtitleFile(new File([srt], 'bad.txt'))).rejects.toThrow('Choose an .srt or .vtt file');
  });

  it('preserves valid inline timestamps and detects conversion or shift limitations', () => {
    const source = parseSubtitles(vtt.replace('你好 🐾', '你好 <00:02.000>🐾'));
    expect(parseSubtitles(serializeSubtitles(source))).toEqual(source);
    expect(inspectCues(source).losses).toContain('timedText');
    expect(() => serializeSubtitles(source, 'vtt', 250)).toThrow('Cue 1: Overall shifting');
    expect(() => parseSubtitles(vtt.replace('你好 🐾', '你好 <00:04.000>🐾'))).toThrow('Cue 1: Inline');
    expect(() => serializeSubtitles(parseSubtitles(srt.replace('Overlapping', 'Look --> here')), 'vtt'))
      .toThrow('Cue 2: WebVTT cue text cannot contain -->');
  });
});

describe('editing and delivery limits', () => {
  it('uses integer milliseconds and never accumulates shifts or changes cue ordering/duration', () => {
    const source = parseSubtitles(srt);
    expect(offsetMilliseconds('0', 'earlier')).toBe(0);
    expect(offsetMilliseconds('0.25', 'earlier')).toBe(-250);
    expect(offsetMilliseconds('1.5', 'later')).toBe(1500);
    expect(offsetMilliseconds('1,001', 'later')).toBe(1001);
    for (const amount of ['-1', '0.0001', '86400.001', '', 'Infinity']) {
      expect(() => offsetMilliseconds(amount, 'later')).toThrow('up to three decimal places');
    }
    for (const offset of [-250, 1500, 0, 1001, -250]) {
      const shifted = parseSubtitles(serializeSubtitles(source, 'srt', offset));
      expect(content(shifted)).toEqual(content(source).map(cue => ({
        ...cue, start: cue.start + offset, end: cue.end + offset,
      })));
    }
    expect(() => serializeSubtitles(source, 'vtt', -1001)).toThrow('Cue 1: The adjusted start time is negative');
    expect(() => serializeSubtitles(source, 'vtt', 0.01)).toThrow('out of range');
    const nearEnd = parseSubtitles('WEBVTT\n\n999:59:59.998 --> 999:59:59.999\nLast\n');
    expect(() => serializeSubtitles(nearEnd, 'vtt', 1)).toThrow('Cue 1: The adjusted end time');
    const outOfOrder = parseSubtitles(srt.replace('00:00:02,500', '00:00:00,500'));
    expect(content(parseSubtitles(serializeSubtitles(outOfOrder)))).toEqual(content(outOfOrder));
    expect(() => serializeSubtitles(outOfOrder, 'vtt')).toThrow('Cue 2: WebVTT requires nondecreasing start times');
  });

  it('edits only the chosen cue, validates body and timestamps and retains the UI ID and source metadata', () => {
    const source = parseSubtitles(vtt);
    const [first, next] = source.cues;
    const edit = (start: string, end: string, body: string) => editCue(first, 1, start, end, body, 'vtt');
    const updated = edit('00:00:01.125', '00:04.000', '改动\r\nsecond');
    expect(updated).toEqual({ ...first, start: 1125, end: 4000, text: '改动\nsecond' });
    expect(content({ ...source, cues: [updated, next] })[1]).toEqual(content(source)[1]);
    expect(first.text).toBe('你好 🐾\n\tSecond line');
    expect(() => edit('00:01.000', '00:01.000', 'text')).toThrow('Cue 1: End time');
    expect(() => edit('00:02.000', '00:01.000', 'text')).toThrow('Cue 1: End time');
    expect(() => edit('-00:01.000', '00:02.000', 'text')).toThrow('Cue 1: Invalid timestamp');
    expect(() => edit('00:01.000', '00:02.000', 'One\n\nTwo')).toThrow('Cue 1: The text contains');
  });

  it('handles larger documents without truncation and rejects over-limit text before parsing', () => {
    const count = 5100;
    const text = Array.from({ length: count }, (_, i) =>
      [i + 1, '00:00:01,000 --> 00:00:02,000', '字幕'.repeat(100) + i].join('\n'),
    ).join('\n\n');
    expect(text.length).toBeGreaterThan(1_000_000);
    const source = parseSubtitles(text);
    expect(source.cues).toHaveLength(count);
    expect(content(parseSubtitles(serializeSubtitles(source, 'vtt')))).toEqual(content(source));
    expect(() => parseSubtitles('x'.repeat(subtitleLimits.text + 1))).toThrow('16 million');
  });

  it('preflights output size when the chosen format adds bytes near the processing boundary', () => {
    const timing = '1\n100:00:00,000 --> 100:00:01,000\n';
    const source = parseSubtitles(timing + 'a'.repeat(subtitleLimits.text - timing.length - 1) + '\n');
    expect(serializeSubtitles(source, 'srt').length).toBe(subtitleLimits.text);
    expect(() => serializeSubtitles(source, 'vtt')).toThrow('16 million');
  });

  it('rejects files over 32 MiB before reading and cue counts over 100,000 without returning partial data', async () => {
    const file = new File([], 'oversized.srt');
    Object.defineProperty(file, 'size', { value: subtitleLimits.bytes + 1 });
    file.arrayBuffer = () => { throw new Error('Oversized file must not be read'); };
    await expect(readSubtitleFile(file)).rejects.toThrow('32 MiB read limit');

    const cue = '00:00:01,000 --> 00:00:02,000\nText\n\n';
    expect(() => parseSubtitles(cue.repeat(subtitleLimits.cues + 1))).toThrow('100,000 cue processing limit');
  });

  it('uses a safe Unicode source name, a local timestamp and unique names within a millisecond', () => {
    const name = createSubtitleNamer(), timestamp = new Date(2026, 10, 22, 16, 9, 0, 123);
    expect(name('..示例?:.srt', 'vtt', timestamp)).toBe('示例-20261122-160900-123.vtt');
    expect(name('..示例?:.srt', 'vtt', timestamp)).toBe('示例-20261122-160900-123-2.vtt');
    expect(name(undefined, 'srt', new Date(timestamp.getTime() + 1))).toBe('subtitles-20261122-160900-124.srt');
    expect(subtitleStem('NUL.srt')).toBe('subtitles');
    expect(new TextEncoder().encode(subtitleStem('🐾'.repeat(100) + '.srt')).length).toBeLessThanOrEqual(150);
  });
});
