
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import VideoFrameExtractor from '../src/tools/video-frame-extractor/VideoFrameExtractor';
import type { FrameEvent, VideoRequest } from '../src/tools/video-frame-extractor/protocol';
import { setViewport } from './setup';

const task = vi.hoisted(() => vi.fn());
vi.mock('../src/tools/video-frame-extractor/task', () => ({ videoTask: task }));

const file = new File(['source'], 'sample.mp4', { type: 'video/mp4' });
const image = new Blob(['frame'], { type: 'image/png' });
const info = { width: 640, height: 360, origin: 2, end: 6, duration: 4, fps: 25, timeResolution: 90000, hdr: false };

async function open() {
  const local = render(<VideoFrameExtractor region="global" locale="en" />);
  fireEvent.change(local.container.querySelector('input[type="file"]')!, { target: { files: [file] } });
  await screen.findByText('sample.mp4');
  return local;
}

beforeEach(() => {
  setViewport();
  task.mockReset();
  task.mockImplementation(async (request: VideoRequest, _signal: AbortSignal, events?: { frame: (event: FrameEvent) => Promise<void> }) => {
    if (request.type === 'inspect') return { info, preview: { timestamp: info.origin, image } };
    if (request.type === 'preview') return { timestamp: 2.08, image };
    await events?.frame({ timestamp: request.plan.mode === 'single' ? request.plan.timestamp : 2.12, image, thumbnail: image });
    return { frames: 1, sampled: 1 };
  });
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
});

it('uses the displayed raw PTS for single extraction and keeps earlier gallery results after seeking', async () => {
  await open();
  const extract = screen.getByRole('button', { name: 'Extract images' });
  fireEvent.click(extract);
  await screen.findByText('1 frames · 1 selected');
  fireEvent.click(screen.getByRole('button', { name: 'Next frame' }));
  await screen.findByText('/ 00:04.000');
  await act(async () => {});
  expect(task.mock.calls[2][0]).toMatchObject({ type: 'preview', position: { timestamp: 2, step: 'next' } });
  fireEvent.click(extract);
  await screen.findByText('2 frames · 2 selected');
  expect(task.mock.calls[3][0]).toMatchObject({ type: 'extract', plan: { mode: 'single', timestamp: 2.08 } });
  fireEvent.click(screen.getByRole('button', { name: 'Deselect all' }));
  expect(screen.getByText('2 frames · 0 selected')).toBeTruthy();
  fireEvent.click(screen.getByRole('checkbox', { name: 'Select frame 00:00.080000' }));
  expect(screen.getByText('2 frames · 1 selected')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Delete frame 00:00.000000' }));
  expect(screen.getByText('1 frames · 1 selected')).toBeTruthy();
});

it('blocks invalid ranges, cancels extraction and ignores its late response', async () => {
  await open();
  fireEvent.click(screen.getByRole('button', { name: 'Every Frame' }));
  const end = screen.getByRole('textbox', { name: 'End (exclusive)' });
  fireEvent.change(end, { target: { value: '0' } });
  expect(screen.getByText(/The end must follow the start/)).toBeTruthy();
  const extract = screen.getByRole<HTMLButtonElement>('button', { name: 'Extract images' });
  expect(extract.disabled).toBe(true);
  fireEvent.change(end, { target: { value: '2.5' } });
  let complete!: (value: { frames: number; sampled: number }) => void;
  task.mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
  fireEvent.click(extract);
  const signal = task.mock.lastCall![1] as AbortSignal;
  expect(task.mock.lastCall![0]).toMatchObject({ plan: { mode: 'every', start: 0, end: 2.5 } });
  fireEvent.click(screen.getByRole('button', { name: 'Cancel task' }));
  expect(signal.aborted).toBe(true);
  await act(async () => complete({ frames: 1, sampled: 1 }));
  expect(screen.getByText('0 frames · 0 selected')).toBeTruthy();
  expect(extract.disabled).toBe(false);
});

it('recommends ZIP only for large sampling plans without assuming every sample is unique', async () => {
  await open();
  fireEvent.click(screen.getByRole('button', { name: 'Count' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Sample count' }), { target: { value: '400' } });
  expect(screen.getByText('For large batches, use Export ZIP only.')).toBeTruthy();
  expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Extract images' }).disabled).toBe(false);
  fireEvent.click(screen.getByRole('checkbox', { name: 'Export ZIP only' }));
  expect(screen.queryByText('For large batches, use Export ZIP only.')).toBeNull();
});
