import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import AudioTrimmer from '../src/tools/audio-trimmer/AudioTrimmer';
import type { AudioRequest, AudioTaskResults } from '../src/tools/audio-trimmer/protocol';

import { setViewport } from './setup';

const { task, audition, save } = vi.hoisted(() => ({
  task: vi.fn(), audition: vi.fn(), save: vi.fn(),
}));

vi.mock('../src/tools/audio-trimmer/task', async importOriginal => ({
  ...await importOriginal<typeof import('../src/tools/audio-trimmer/task')>(),
  audioTask: task,
}));

vi.mock('../src/tools/general/ui', async importOriginal => ({
  ...await importOriginal<typeof import('../src/tools/general/ui')>(),
  saveBlob: save,
}));

vi.mock('../src/tools/audio-trimmer/audition', () => ({
  Audition: class {
    play = audition;
    stop = vi.fn();
    dispose = vi.fn();
    setVolume = vi.fn();
  },
}));

vi.mock('../src/tools/audio-trimmer/Waveform', () => ({
  Waveform: ({ onSelect }: { onSelect(start: number, end: number): void }) =>
    <button onClick={() => onSelect(1, 2)}>Set waveform selection</button>,
}));

const analysis: AudioTaskResults['analyze'] = {
  info: { frames: 192000, sampleRate: 48000, channels: 1, origin: 0 },
  peaks: { from: 0, to: 192000, min: new Float32Array(64), max: new Float32Array(64) },
  capabilities: { wav: { 0: 48000 }, mp3: { 192: 48000 }, flac: { 0: 48000 } },
};
const file = new File(['bytes'], 'recording.wav', { type: 'audio/wav' });
const exported = new Blob(['encoded'], { type: 'audio/mpeg' });

async function load(locale: 'zh' | 'en' = 'en') {
  const view = render(<AudioTrimmer region="cn" locale={locale} />);
  const picker = view.container.querySelector<HTMLInputElement>('input[type="file"]')!;
  fireEvent.change(picker, { target: { files: [file] } });
  await screen.findByText('recording.wav');
  return view;
}

beforeEach(() => {
  setViewport();
  task.mockImplementation((request: AudioRequest) =>
    Promise.resolve(request.type === 'analyze' ? analysis : exported));
});
afterEach(() => vi.clearAllMocks());

it('synchronizes waveform selection and millisecond fields, and auditions the same removal plan', async () => {
  await load();
  expect(screen.getByRole('button', { name: 'Keep selection' }).getAttribute('aria-pressed')).toBe('true');
  expect(screen.getByRole('combobox', { name: 'Format' }).textContent).toContain('MP3');
  expect(screen.getByRole('combobox', { name: 'Bitrate' }).textContent).toContain('192 kbps');
  fireEvent.click(screen.getByRole('button', { name: 'Set waveform selection' }));
  expect((screen.getByRole('textbox', { name: 'Start' }) as HTMLInputElement).value).toBe('00:01.000');
  expect((screen.getByRole('textbox', { name: 'End' }) as HTMLInputElement).value).toBe('00:02.000');
  fireEvent.click(screen.getByRole('button', { name: 'Remove selection' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Fade in (s)' }), { target: { value: '0.125' } });
  fireEvent.click(screen.getByRole('button', { name: 'Loop preview' }));
  fireEvent.click(screen.getByRole('button', { name: 'Play' }));
  expect(audition.mock.calls[0].slice(2, 5)).toEqual([{
    spans: [{ from: 0, to: 48000, output: 0 }, { from: 96000, to: 192000, output: 48000 }],
    frames: 144000, fadeIn: 6000, fadeOut: 0,
  }, 0, true]);
  fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
  expect(screen.getByRole('button', { name: 'Play' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Export audio' }));
  await screen.findByText('Audio exported.');
  expect(save).toHaveBeenCalledWith(exported, 'recording-trimmed.mp3');
  expect(task.mock.calls[1][0].plan).toEqual(audition.mock.calls[0][2]);
});

it('invalidates a canceled worker result and disables export for an empty removal', async () => {
  await load('zh');
  let finish!: (value: Blob) => void;
  task.mockImplementationOnce(() => new Promise<Blob>(resolve => { finish = resolve; }));
  fireEvent.click(screen.getByRole('button', { name: '导出音频' }));
  const signal = task.mock.calls[1][1] as AbortSignal;
  fireEvent.click(screen.getByRole('button', { name: '取消' }));
  expect(signal.aborted).toBe(true);
  await act(async () => finish(exported));
  expect(save).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '删除选区' }));
  expect(screen.getByRole('alert').textContent).toContain('至少保留一个样本');
  expect((screen.getByRole('button', { name: '导出音频' }) as HTMLButtonElement).disabled).toBe(true);
});
