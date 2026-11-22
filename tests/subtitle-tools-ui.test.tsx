import { act, fireEvent, render, screen } from '@testing-library/react';
import { Tooltip } from '@base-ui/react/tooltip';
import { EditorView } from '@codemirror/view';
import { beforeEach, expect, it, vi } from 'vitest';
import { saveBlob } from '../src/tools/general/ui';
import SubtitleTools from '../src/tools/subtitle-tools/SubtitleTools';
import { parseSubtitles } from '../src/tools/subtitle-tools/core';
import { editorDOM } from './fixtures/editor-dom';
import { setViewport } from './setup';

vi.mock('../src/tools/general/ui', async original => ({
  ...(await original<typeof import('../src/tools/general/ui')>()),
  saveBlob: vi.fn(),
}));

const clipboard = vi.fn().mockResolvedValue(undefined);
const srt = '8\n00:00:01,000 --> 00:00:02,000\n第一行 🐾\nSecond line\n';
const vtt = 'WEBVTT\n\nfirst\n00:02.500 --> 00:04.000 align:end\nA WebVTT cue\n';

beforeEach(() => {
  editorDOM();
  setViewport();
  vi.clearAllMocks();
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: clipboard } });
});

function setup(locale: 'zh' | 'en' = 'en', region: 'cn' | 'global' = 'cn') {
  return render(<Tooltip.Provider><SubtitleTools locale={locale} region={region} /></Tooltip.Provider>);
}

const button = (name: string) => screen.getByRole('button', { name });
const click = (name: string) => fireEvent.click(button(name));
const change = (name: string, value: string) => fireEvent.change(screen.getByRole('textbox', { name }), { target: { value } });
const cueRows = () => [...document.querySelectorAll('[data-subtitle-cue]')];
const preview = () => cueRows().map(row => row.querySelector('[data-subtitle-text]')?.textContent);
const timings = () => cueRows().map(row => row.querySelector('[data-subtitle-timing]')?.textContent);
const editor = () => EditorView.findFromDOM(screen.getByRole('textbox', { name: 'Subtitle source' }))!;

function editSource(value: string) {
  const view = editor();
  act(() => view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: value },
    userEvent: 'input.paste',
  }));
}

function testFile(name: string, input: string | Uint8Array) {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input.slice();
  const file = new File([bytes], name);
  return Object.assign(file, { arrayBuffer: () => Promise.resolve(bytes.slice().buffer) });
}

function chooseFile(file: File) {
  fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } });
}

function dropFile(file: File) {
  fireEvent.drop(button('Import SRT / VTT'), { dataTransfer: { files: [file], types: ['Files'] } });
}

async function savedText(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

it.each([
  ['cn', 'zh', '快速', '示例字幕', '下载'],
  ['cn', 'en', 'Quick', 'Sample subtitles', 'Download'],
  ['global', 'zh', '快速', '示例字幕', '下载'],
  ['global', 'en', 'Quick', 'Sample subtitles', 'Download'],
] as const)('opens %s/%s with the same three English cues and localized controls', async (region, locale, quick, label, download) => {
  setup(locale, region);
  expect(button(quick).getAttribute('aria-pressed')).toBe('true');
  expect(button('WebVTT').getAttribute('aria-pressed')).toBe('true');
  expect(screen.getByText(label)).toBeTruthy();
  const cues = [
    [1000, 3000, 'Welcome to Tool4Furry.'],
    [3500, 5500, 'Preview each subtitle cue here.'],
    [6000, 8000, 'Choose a format and download your subtitles.'],
  ];
  expect(preview()).toEqual(cues.map(([, , line]) => line));
  expect(document.querySelector('textarea, .cm-editor')).toBeNull();
  click(download + ' WebVTT');
  click('SRT');
  click(download + ' SRT');
  const [first, second] = vi.mocked(saveBlob).mock.calls;
  for (const [[blob], format] of [[first, 'vtt'], [second, 'srt']] as const) {
    const parsed = parseSubtitles(await savedText(blob));
    expect(parsed.format).toBe(format);
    expect(parsed.cues.map(cue => [cue.start, cue.end, cue.text])).toEqual(cues);
  }
});

it('replaces a CRLF/BOM SRT file with a dropped WebVTT and exports actual blobs and clipboard text', async () => {
  setup();
  const input = testFile('字幕 Take.srt', '\uFEFF' + srt.replace(/\n/g, '\r\n'));
  chooseFile(input);
  await screen.findByText('字幕 Take.srt');
  expect(preview()).toEqual(['第一行 🐾\nSecond line']);
  click('Download WebVTT');
  click('Download WebVTT');
  const [first, second] = vi.mocked(saveBlob).mock.calls;
  expect(first[0].type).toBe('text/vtt;charset=utf-8');
  expect(first[1]).toMatch(/^字幕 Take-\d{8}-\d{6}-\d{3}(?:-\d+)?\.vtt$/);
  expect(second[1]).not.toBe(first[1]);
  const text = await savedText(first[0]);
  expect(parseSubtitles(text).cues[0]).toMatchObject({ start: 1000, end: 2000, text: '第一行 🐾\nSecond line' });
  click('Copy subtitles');
  await screen.findByText('Subtitles copied');
  expect(clipboard).toHaveBeenCalledWith(text);

  dropFile(testFile('track.vtt', vtt));
  await screen.findByText('A WebVTT cue');
  expect(screen.getByText('track.vtt', { selector: 'strong' })).toBeTruthy();
  expect(preview()).toEqual(['A WebVTT cue']);
  click('SRT');
  expect(screen.getByText(/cannot preserve.*positioning settings, cue identifiers/)).toBeTruthy();
  click('Download SRT');
  const [asSrt, filename] = vi.mocked(saveBlob).mock.calls[2];
  expect(asSrt.type).toBe('application/x-subrip;charset=utf-8');
  expect(filename).toMatch(/^track-.*\.srt$/);
  const parsed = parseSubtitles(await savedText(asSrt));
  expect(parsed.format).toBe('srt');
  expect(parsed.cues).toEqual([{ uiId: 1, id: '1', text: 'A WebVTT cue', start: 2500, end: 4000, settings: '' }]);
  expect(new TextDecoder().decode(await input.arrayBuffer())).toBe(srt.replace(/\n/g, '\r\n'));
});

it('blocks stale output during a failed import, ignores a superseded read and can use the sample again', async () => {
  setup();
  let completeRead!: (buffer: ArrayBuffer) => void;
  const pending = Object.assign(testFile('old.srt', srt), {
    arrayBuffer: () => new Promise<ArrayBuffer>(resolve => { completeRead = resolve; }),
  });
  chooseFile(pending);
  expect(button('Download WebVTT')).toHaveProperty('disabled', true);
  click('Load sample');
  await act(async () => completeRead(new TextEncoder().encode(srt).buffer));
  expect(screen.getByText('Sample subtitles')).toBeTruthy();
  chooseFile(testFile('broken.srt', Uint8Array.of(0xc3, 0x28)));
  await screen.findByText(/Invalid subtitle encoding/);
  expect(button('Download WebVTT')).toHaveProperty('disabled', true);
  expect(button('Copy subtitles')).toHaveProperty('disabled', true);
  click('Download WebVTT');
  expect(saveBlob).not.toHaveBeenCalled();
  click('Keep current subtitles');
  expect(button('Download WebVTT')).toHaveProperty('disabled', false);
  chooseFile(testFile('invalid.vtt', 'WEBVTT\n\nSTYLE\nno\n'));
  await screen.findByText(/Line 3: WebVTT STYLE blocks are unsupported/);
  click('Load sample');
  expect(preview()).toHaveLength(3);
});

it('applies pasted text, shifts in both directions and saves only a valid single-cue edit', async () => {
  setup();
  click('Paste text');
  expect(document.querySelector('textarea')).toBeNull();
  editSource('bad source');
  click('Apply');
  expect(screen.getByText(/Cue 1: Missing a valid timing line/)).toBeTruthy();
  expect(editor().state.doc.toString()).toBe('bad source');
  editSource(srt + '\n9\n00:00:03,500 --> 00:00:04,000\nUntouched\n');
  click('Apply');
  expect(screen.getByText('Pasted subtitles')).toBeTruthy();
  click('Advanced');
  click('Earlier');
  change('Amount (seconds)', '0.25');
  expect(timings()[0]).toContain('00:00.750');
  change('Amount (seconds)', '1.5');
  expect(screen.getByText(/Cue 1: The adjusted start time is negative/)).toBeTruthy();
  expect(button('Download WebVTT')).toHaveProperty('disabled', true);
  click('Later');
  expect(timings()[0]).toContain('00:02.500');
  expect(button('Download WebVTT')).toHaveProperty('disabled', false);
  click('Edit cue 1');
  change('Start time', '00:00:01.200');
  change('End time', '00:00:01.200');
  click('Save cue');
  expect(screen.getByText(/Cue 1: End time must be later/)).toBeTruthy();
  change('End time', '00:00:02.900');
  change('Cue text', 'Edited 字幕\nSecond line');
  click('Save cue');
  expect(preview()).toEqual(['Edited 字幕\nSecond line', 'Untouched']);
  click('Quick');
  expect(timings()[0]).toContain('00:02.700');
  expect(screen.queryByRole('textbox', { name: 'Amount (seconds)' })).toBeNull();
  click('Download WebVTT');
  const output = parseSubtitles(await savedText(vi.mocked(saveBlob).mock.calls[0][0]));
  expect(output.cues.map(({ start, end, text }) => [start, end, text])).toEqual([
    [2700, 4400, 'Edited 字幕\nSecond line'], [5000, 5500, 'Untouched'],
  ]);
  click('Advanced');
  expect(screen.getByRole('textbox', { name: 'Amount (seconds)' })).toHaveProperty('value', '1.5');
  click('View / edit source');
  expect(editor().state.doc.toString()).toContain('8\n00:00:01,200 --> 00:00:02,900\nEdited 字幕\nSecond line');
});

it('keeps invalid source drafts through close and mode changes, supports cancel, and applies valid drafts atomically', async () => {
  setup();
  click('Advanced');
  click('View / edit source');
  expect(editor().state.doc.toString()).toContain('Welcome to Tool4Furry.');
  editSource(srt.replace('00:00:02,000', '00:00:01,000'));
  click('Apply');
  expect(await screen.findByText(/Cue 1: End time must be later/)).toBeTruthy();
  click('Close');
  await screen.findByText('You have an unapplied draft.');
  click('Quick');
  expect(button('Download WebVTT')).toHaveProperty('disabled', true);
  expect(preview()).toHaveLength(3);
  click('Advanced');
  click('Resume editing');
  expect(editor().state.doc.toString()).toContain('00:00:01,000 --> 00:00:01,000');
  click('Cancel');
  expect(button('Download WebVTT')).toHaveProperty('disabled', false);
  expect(preview()).toHaveLength(3);
  click('View / edit source');
  editSource(vtt);
  click('Apply');
  expect(preview()).toEqual(['A WebVTT cue']);
  expect(button('Download WebVTT')).toHaveProperty('disabled', false);
});

it('pages the preview while exporting every cue including those outside the DOM', async () => {
  setup();
  const count = 83;
  const source = Array.from({ length: count }, (_, i) =>
    [i + 1, '00:00:01,000 --> 00:00:02,000', 'Cue text ' + (i + 1)].join('\n'),
  ).join('\n\n');
  chooseFile(testFile('many.srt', source));
  await screen.findByText('many.srt');
  expect(cueRows()).toHaveLength(40);
  click('Next');
  click('Next');
  expect(preview()).toEqual(['Cue text 81', 'Cue text 82', 'Cue text 83']);
  click('Download WebVTT');
  const output = parseSubtitles(await savedText(vi.mocked(saveBlob).mock.calls[0][0]));
  expect(output.cues).toHaveLength(count);
  expect(output.cues[0].text).toBe('Cue text 1');
  expect(output.cues.at(-1)?.text).toBe('Cue text 83');
});
