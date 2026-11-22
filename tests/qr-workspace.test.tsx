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
const calls = vi.hoisted(() => [] as Call[]);
vi.mock('../src/tools/qr-code-generator/art/export', () => ({
  generateVerifiedQr: (matrix: QrMatrixData, content: string, size: number, mode: QrRenderMode, signal: AbortSignal) =>
    new Promise(resolve => { calls.push({ content, size, mode, matrix, signal, deliver: resolve }); }),
}));
vi.mock('../src/tools/qr-code-generator/graphics/DioramaScene', () => ({ default: () => null }));

const button = (name: string) => screen.getByRole('button', { name }) as HTMLButtonElement;
const field = (name: string) => screen.getByRole('textbox', { name });
const advance = () => act(async () => { await vi.advanceTimersByTimeAsync(300); });
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
  fireEvent.click(button('2D artwork & settings'));
  await advance();
  expect(calls[0]).toMatchObject({ content: 'https://example.com', size: 512, matrix: { errorCorrectionLevel: 'M' } });
  const content = ' https://example.com/雪?q=1#🦊 ';
  fireEvent.change(field('Text or URL'), { target: { value: content } });
  fireEvent.click(button('Contour'));
  fireEvent.click(button('Strata'));
  expect(calls[0].signal.aborted).toBe(true);
  await settle(calls[0]);
  expect(button('Download 2D PNG').disabled).toBe(true);
  await advance();
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

it('keeps an explicitly canceled snapshot unavailable until the next action', async () => {
  render(<QrCodeGenerator region="cn" locale="zh" />);
  fireEvent.click(button('二维成品与设置'));
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
