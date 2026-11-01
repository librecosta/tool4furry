import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ImageCompressor from '../src/tools/image-compressor/ImageCompressor';
import { UiProvider } from '../src/ui/UiProvider';
import { messages } from '../src/i18n/messages';
import { setViewport } from './setup';
import { acceptImage } from '../src/tools/image/browser-codec';
import { compressImage } from '../src/tools/image-compressor/compress';

vi.mock('../src/tools/image/browser-codec', () => ({acceptImage: vi.fn()}));
vi.mock('../src/tools/image-compressor/compress', async original => ({...await original<typeof import('../src/tools/image-compressor/compress')>(), compressImage: vi.fn()}));
beforeEach(() => {
  setViewport(false);
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} unobserve() {} });
  let n = 0;
  vi.stubGlobal('URL', class extends URL { static createObjectURL = vi.fn(() => `blob:test-${++n}`); static revokeObjectURL = vi.fn(); });
  vi.mocked(acceptImage).mockImplementation(async file => ({file, blob: file, width: 100, height: 50, info: {format: 'png', width: 100, height: 50, orientation: 1}}));
  vi.mocked(compressImage).mockImplementation(async (_source, settings) => ({blob: new Blob([new Uint8Array(1000)], {type: `image/${settings.format}`}), width: 100, height: 50, format: settings.format, quality: 82, saved: 2000, targetMet: true, attempts: 1}));
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});
async function mount(locale: 'en' | 'zh' = 'en') {
  const mounted = render(<UiProvider labels={messages[locale]}><ImageCompressor region="global" locale={locale}/></UiProvider>);
  const input = mounted.container.querySelector('input[type="file"]') as HTMLInputElement;
  await waitFor(() => expect(input.disabled).toBe(false));
  fireEvent.change(input, {target: {files: [new File([new Uint8Array(3000)], 'source.png', {type: 'image/png'})]}});
  await waitFor(() => expect(screen.getByRole('button', {name: locale === 'en' ? 'Start compression' : '开始压缩'}).hasAttribute('disabled')).toBe(false));
  return mounted;
}

it('renders controlled format selection and refuses incomplete numeric drafts before encoding', async () => {
  const {container} = await mount();
  expect(container.querySelector('select')).toBeNull();
  expect(screen.getByRole('combobox', {name: 'Output format'}).textContent).toContain('WEBP');
  fireEvent.click(screen.getByRole('button', {name: 'Target size', exact: true}));
  fireEvent.change(screen.getByRole('textbox', {name: 'Target size per image'}), {target: {value: '-'}});
  fireEvent.click(screen.getByRole('button', {name: 'Start compression'}));
  expect(compressImage).not.toHaveBeenCalled(); expect(screen.getByRole('alert').textContent).toContain('Enter a valid number');
  fireEvent.change(screen.getByRole('textbox', {name: 'Target size per image'}), {target: {value: '12.5'}});
  fireEvent.click(screen.getByRole('button', {name: 'Start compression'}));
  await waitFor(() => expect(compressImage).toHaveBeenCalledOnce());
  expect(vi.mocked(compressImage).mock.calls[0][1]).toMatchObject({mode: 'target', targetBytes: 12800});
});

it('shows actual savings and current output thumbnail, then invalidates both on a parameter change', async () => {
  const {container} = await mount();
  fireEvent.click(screen.getByRole('button', {name: 'Start compression'}));
  await waitFor(() => expect(screen.getByRole('button', {name: 'Download', exact: true})).toBeTruthy());
  expect(screen.getByText(/66\.7% saved/)).toBeTruthy();
  expect(container.querySelector('[data-thumbnail-kind="output"]')).not.toBeNull();
  fireEvent.click(screen.getByRole('button', {name: 'Download', exact: true})); expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', {name: 'Adjust quality', exact: true}));
  expect(screen.queryByRole('button', {name: 'Download', exact: true})).toBeNull();
  expect(container.querySelector('[data-thumbnail-kind="output"]')).toBeNull();
});

it('offers original, actual output and side-by-side comparison using the shared dialog', async () => {
  await mount('zh');
  fireEvent.click(screen.getByRole('button', {name: '开始压缩'}));
  await waitFor(() => expect(screen.getByRole('button', {name: '下载', exact: true})).toBeTruthy());
  fireEvent.click(screen.getByRole('button', {name: '预览', exact: true}));
  fireEvent.click(screen.getByRole('button', {name: '对比', exact: true}));
  expect(document.querySelector('[data-image-comparison="compare"]')).not.toBeNull();
  expect(screen.getByRole('region', {name: '原图'})).toBeTruthy(); expect(screen.getByRole('region', {name: '结果'})).toBeTruthy();
});
