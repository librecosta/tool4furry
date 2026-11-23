import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import QrCodeGenerator from '../src/tools/qr-code-generator/QrCodeGenerator';
import type { VerifiedQr } from '../src/tools/qr-code-generator/art/export';
import type { QrRenderMode } from '../src/tools/qr-code-generator/art/render';
import type { QrMatrixData } from '../src/tools/qr-code-generator/matrix/qr-matrix';
import { deriveSeed } from '../src/tools/qr-code-generator/recipe/seed';

type Call = {
  content: string; size: number; mode: QrRenderMode; matrix: QrMatrixData; signal: AbortSignal;
  deliver: (result: VerifiedQr) => void;
};
const { calls, encode } = vi.hoisted(() => ({ calls: [] as Call[], encode: vi.fn() }));
vi.mock('../src/tools/qr-code-generator/art/export', () => ({
  generateVerifiedQr: (matrix: QrMatrixData, content: string, size: number, mode: QrRenderMode, signal: AbortSignal) =>
    new Promise(resolve => { calls.push({ content, size, mode, matrix, signal, deliver: resolve }); }),
}));
vi.mock('../src/tools/qr-code-generator/graphics/DioramaScene', () => ({ default: () => null }));
vi.mock('../src/tools/qr-code-generator/core', async importOriginal => {
  const core = await importOriginal<typeof import('../src/tools/qr-code-generator/core')>();
  return { ...core, createWorkspaceMatrix: (...args: Parameters<typeof core.createWorkspaceMatrix>) => {
    encode(...args);
    return core.createWorkspaceMatrix(...args);
  } };
});

const button = (name: string) => screen.getByRole('button', { name }) as HTMLButtonElement;
const field = (name: string) => screen.getByRole('textbox', { name });
const advance = (ms = 300) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
const settle = (call: Call) => act(async () => {
  call.deliver({
    png: new Blob(['png'], { type: 'image/png' }),
    svg: new Blob(['svg'], { type: 'image/svg+xml' }), size: call.size,
  });
});
const releaseUrl = vi.fn();
beforeEach(() => {
  vi.useFakeTimers();
  calls.length = 0;
  encode.mockClear();
  releaseUrl.mockClear();
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('URL', class extends URL {
    static createObjectURL = () => 'blob:preview';
    static revokeObjectURL = releaseUrl;
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('debounces edits, invalidates in-flight scans, and reuses only the current encoding', async () => {
  const view = render(<QrCodeGenerator region="global" locale="en" />);
  fireEvent.click(screen.getByRole('tab', { name: '2D' }));
  await advance();
  expect(calls[0]).toMatchObject({ content: 'https://example.com', size: 512, matrix: { errorCorrectionLevel: 'M' } });
  const content = ' https://example.com/雪?q=1#🦊 ';
  fireEvent.change(field('Text or URL'), { target: { value: content } });
  fireEvent.click(button('Contour'));
  fireEvent.click(button('Strata'));
  expect(calls[0].signal.aborted).toBe(true);
  await settle(calls[0]);
  expect(button('Download 2D PNG').disabled).toBe(true);
  await advance(400);
  await advance(0);
  expect(calls).toHaveLength(2);
  const second = calls[1];
  expect(second).toMatchObject({ content, mode: { recipe: { artwork: { id: 'strata' } } } });
  expect(second.matrix).not.toBe(calls[0].matrix);
  await settle(second);
  expect(button('Download 2D PNG').disabled).toBe(false);
  fireEvent.change(field('Output size (pixels)'), { target: { value: '513' } });
  fireEvent.click(button('Aeolian'));
  expect(button('Download 2D SVG').disabled).toBe(true);
  expect(releaseUrl).toHaveBeenCalledWith('blob:preview');
  await advance();
  expect(calls[2].matrix).toBe(second.matrix);
  const terrain = { id: 'dunes', revision: 1, seed: deriveSeed(content, 'dunes') };
  expect(second.mode).toMatchObject({ recipe: { terrain } });
  expect(calls[2].mode).toMatchObject({ recipe: { terrain } });
  await settle(calls[2]);
  fireEvent.click(button('H'));
  await advance();
  expect(calls[3].matrix).not.toBe(second.matrix);
  expect(calls[3].matrix.errorCorrectionLevel).toBe('H');
  view.unmount();
  expect(calls[3].signal.aborted).toBe(true);
});

it('waits for a typing pause before encoding and submits the single-line draft immediately on request', async () => {
  render(<QrCodeGenerator region="global" locale="en" />);
  fireEvent.click(screen.getByRole('tab', { name: '2D' }));
  await advance();
  await settle(calls[0]);
  encode.mockClear();
  const input = field('Text or URL') as HTMLInputElement;
  expect(input.tagName).toBe('INPUT');
  expect(button('Download 2D PNG').closest('[data-qr-artwork]')).not.toBeNull();
  expect(screen.queryByRole('button', { name: 'Standard style' })).toBeNull();
  fireEvent.change(input, { target: { value: 'https://example.net/' } });
  await advance(399);
  fireEvent.change(input, { target: { value: 'https://example.net/fox' } });
  await advance(399);
  expect(encode).not.toHaveBeenCalled();
  expect(button('Download 2D SVG').disabled).toBe(true);
  await advance(1);
  await advance(0);
  expect(encode).toHaveBeenCalledOnce();
  expect(calls[1].content).toBe('https://example.net/fox');
  await settle(calls[1]);
  encode.mockClear();
  input.select();
  const pasted = 'hello\r\nfox\n🌿';
  fireEvent.paste(input, { clipboardData: { getData: () => pasted } });
  expect(input.value).toBe('hello fox 🌿');
  fireEvent.click(button('Generate QR code'));
  expect(encode).toHaveBeenCalledOnce();
  await advance(0);
  expect(calls[2].content).toBe(pasted);
  await settle(calls[2]);
  await advance(400);
  expect(calls).toHaveLength(3);
});

it('keeps an explicitly canceled snapshot unavailable until the next action', async () => {
  render(<QrCodeGenerator region="cn" locale="zh" />);
  fireEvent.click(screen.getByRole('tab', { name: '2D' }));
  await advance();
  fireEvent.click(button('取消二维生成'));
  expect(calls[0].signal.aborted).toBe(true);
  await settle(calls[0]);
  await advance();
  expect(calls).toHaveLength(1);
  expect(button('下载 2D PNG').disabled).toBe(true);
  fireEvent.click(button('生成二维码'));
  expect(calls).toHaveLength(2);
  await settle(calls[1]);
  expect(button('下载 2D SVG').disabled).toBe(false);
});

it('selects an output preset and moves the active artwork with arrow keys', async () => {
  render(<QrCodeGenerator region="global" locale="en" />);
  fireEvent.click(screen.getByRole('tab', { name: '2D' }));
  const open = button('Show size presets');
  fireEvent.click(open);
  expect(open.getAttribute('aria-expanded')).toBe('true');
  fireEvent.click(button('1024'));
  expect((field('Output size (pixels)') as HTMLInputElement).value).toBe('1024');
  expect(open.getAttribute('aria-expanded')).toBe('false');
  fireEvent.keyDown(button('Aeolian'), { key: 'ArrowRight' });
  expect(button('Contour').getAttribute('aria-pressed')).toBe('true');
  await advance();
  expect(calls[0]).toMatchObject({ size: 1024, mode: { recipe: { artwork: { id: 'contour' } } } });
});
