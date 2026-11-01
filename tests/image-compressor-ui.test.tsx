import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImageCompressor from '../src/tools/image-compressor/ImageCompressor';
import { UiProvider } from '../src/ui/UiProvider';
import { messages } from '../src/i18n/messages';
import { setViewport } from './setup';
import { acceptImage } from '../src/tools/image/browser-codec';
import { compressImage } from '../src/tools/image-compressor/compress';
import { packZip } from '../src/tools/image-converter/zip';

vi.mock('../src/tools/image/browser-codec', () => ({acceptImage: vi.fn()}));
vi.mock('../src/tools/image-compressor/compress', async original => ({...await original<typeof import('../src/tools/image-compressor/compress')>(), compressImage: vi.fn()}));
vi.mock('../src/tools/image-converter/zip', () => ({packZip: vi.fn(async () => new Blob(['zip']))}));
beforeEach(() => {
  setViewport(false);
  vi.stubGlobal('Worker', class {});
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome');
  Object.defineProperty(HTMLInputElement.prototype, 'webkitdirectory', {configurable: true, value: false});
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} unobserve() {} });
  let n = 0;
  vi.stubGlobal('URL', class extends URL { static createObjectURL = vi.fn(() => `blob:test-${++n}`); static revokeObjectURL = vi.fn(); });
  vi.mocked(acceptImage).mockImplementation(async file => ({file, blob: file, width: 100, height: 50, info: {format: 'png', width: 100, height: 50, orientation: 1}}));
  vi.mocked(compressImage).mockImplementation(async (_source, settings) => ({blob: new Blob([new Uint8Array(1000)], {type: `image/${settings.format}`}), width: 100, height: 50, format: settings.format, quality: settings.quality, saved: 2000, targetMet: true, attempts: 1}));
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});
afterEach(() => { delete (HTMLInputElement.prototype as {webkitdirectory?: boolean}).webkitdirectory; });
const file = (name = 'source.png') => new File([new Uint8Array(3000)], name, {type: 'image/png'});
async function mount(locale: 'en' | 'zh' = 'en', files: File[] = [file()]) {
  const mounted = render(<UiProvider labels={messages[locale]}><ImageCompressor region="global" locale={locale}/></UiProvider>);
  const input = mounted.container.querySelector('#compressor-source') as HTMLInputElement;
  await waitFor(() => expect(input.disabled).toBe(false));
  if (files.length) {
    fireEvent.change(input, {target: {files}});
    await waitFor(() => expect(screen.getByRole('button', {name: /^(Compress image|Compress all \d+ images|压缩图片|压缩全部 \d+ 张)$/}).hasAttribute('disabled')).toBe(false));
  }
  return {...mounted, input, user: userEvent.setup()};
}
async function format(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(screen.getByRole('combobox', {name: 'Output format'}));
  await user.click(await screen.findByRole('option', {name}));
}
it('keeps the empty workspace focused on upload and exposes file/folder append after import', async () => {
  const {container, input} = await mount('en', []);
  expect(screen.queryByRole('region', {name: 'Compression settings'})).toBeNull();
  expect(screen.getByRole('button', {name: 'Add folder'}).hasAttribute('disabled')).toBe(false);
  fireEvent.change(input, {target: {files: [file()]}});
  await screen.findByRole('button', {name: 'Compress image'});
  expect(container.querySelector('select')).toBeNull();
  expect(container.querySelector('[data-compressor-workspace]')?.firstElementChild?.getAttribute('aria-label')).toBe('Image list');
  expect(screen.getByRole('button', {name: 'Add images'})).toBeTruthy();
  fireEvent.change(container.querySelector('[webkitdirectory]')!, {target: {files: [file('folder.png')]}});
  await screen.findByRole('button', {name: 'Compress all 2 images'});
  expect((container.querySelector('[webkitdirectory]') as HTMLInputElement).value).toBe('');
});
it('validates incomplete advanced drafts atomically before encoding', async () => {
  await mount();
  fireEvent.click(screen.getByRole('button', {name: 'Advanced'}));
  fireEvent.click(screen.getByRole('button', {name: 'Target size'}));
  const input = screen.getByRole('textbox', {name: 'Target size per image'});
  for (const bad of ['-', '0.9999', 'NaN']) {
    fireEvent.change(input, {target: {value: bad}}); fireEvent.click(screen.getByRole('button', {name: 'Compress image'}));
    expect(compressImage).not.toHaveBeenCalled(); expect(screen.getByRole('alert').textContent).toContain('Enter a valid number');
  }
  fireEvent.change(input, {target: {value: '12.5'}});
  fireEvent.click(screen.getByRole('button', {name: 'Compress image'}));
  await waitFor(() => expect(compressImage).toHaveBeenCalledOnce());
  expect(vi.mocked(compressImage).mock.calls[0][1]).toMatchObject({mode: 'target', targetBytes: 12800});
});
it('preserves presentation-only mode switches and invalidates actual quality changes', async () => {
  const {container} = await mount();
  fireEvent.click(screen.getByRole('button', {name: 'Compress image'}));
  await screen.findByRole('button', {name: 'Download'});
  expect(screen.getByText(/66\.7% saved/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', {name: 'Advanced'}));
  expect(screen.getByRole('button', {name: 'Download'})).toBeTruthy();
  fireEvent.click(screen.getByRole('button', {name: 'Quick'}));
  fireEvent.click(screen.getByRole('button', {name: 'Strong'}));
  expect(screen.queryByRole('button', {name: 'Download'})).toBeNull();
  expect(container.querySelector('[data-thumbnail-kind="output"]')).toBeNull();
  fireEvent.click(screen.getByRole('button', {name: 'Compress image'}));
  await screen.findByRole('button', {name: 'Download'});
  expect(vi.mocked(compressImage).mock.calls.at(-1)![1].quality).toBe(65);
});
it('restores independent quick/advanced drafts without applying hidden resize settings', async () => {
  await mount();
  fireEvent.click(screen.getByRole('button', {name: 'Advanced'}));
  fireEvent.change(screen.getByRole('textbox', {name: 'Longest side (pixels, optional)'}), {target: {value: '40'}});
  fireEvent.blur(screen.getByRole('textbox', {name: 'Longest side (pixels, optional)'}));
  fireEvent.click(screen.getByRole('button', {name: 'Quick'}));
  fireEvent.click(screen.getByRole('button', {name: 'Compress image'})); await screen.findByRole('button', {name: 'Download'});
  expect(vi.mocked(compressImage).mock.calls.at(-1)![1].longestEdge).toBeUndefined();
  fireEvent.click(screen.getByRole('button', {name: 'Advanced'}));
  expect((screen.getByRole('textbox', {name: 'Longest side (pixels, optional)'}) as HTMLInputElement).value).toBe('40');
  fireEvent.click(screen.getByRole('button', {name: 'Compress image'})); await screen.findByRole('button', {name: 'Download'});
  expect(vi.mocked(compressImage).mock.calls.at(-1)![1].longestEdge).toBe(40);
});
it('hides PNG quality and explicitly disables AVIF target search', async () => {
  const {user} = await mount(); await format(user, 'PNG');
  expect(screen.queryByRole('button', {name: 'Balanced'})).toBeNull();
  await user.click(screen.getByRole('button', {name: 'Advanced'}));
  await format(user, 'PNG');
  expect(screen.queryByRole('slider')).toBeNull();
  await format(user, 'AVIF');
  expect(screen.getByRole('button', {name: 'Target size'}).hasAttribute('disabled')).toBe(true);
  expect(screen.getByRole('slider', {name: 'Image quality'})).toBeTruthy();
  expect(screen.getByText(/AVIF supports quality adjustment/)).toBeTruthy();
});
it('disables AVIF on conservative mobile profiles without replacing the selected format', async () => {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 Android Mobile');
  const {user} = await mount();
  await user.click(screen.getByRole('combobox', {name: 'Output format'}));
  expect((await screen.findByRole('option', {name: 'AVIF'})).getAttribute('aria-disabled')).toBe('true');
  expect(screen.getByRole('combobox', {name: 'Output format'}).textContent).toBe('WEBP');
  expect(screen.getByText(/AVIF output requires a supported desktop device/)).toBeTruthy();
});
it('shows sequential batch status, isolates failure, retries and delivers only valid current results', async () => {
  await mount('en', [file('a.png'), file('b.png')]);
  let fail!: (reason: Error) => void;
  vi.mocked(compressImage).mockImplementationOnce(() => new Promise((_resolve, reject) => {fail = reject;}));
  fireEvent.click(screen.getByRole('button', {name: 'Compress all 2 images'}));
  await waitFor(() => expect(screen.getByRole('listitem', {name: 'a.png'}).getAttribute('data-task-status')).toBe('processing'));
  expect(screen.getByRole('listitem', {name: 'b.png'}).getAttribute('data-task-status')).toBe('queued');
  fail(new Error('failure'));
  await screen.findByRole('button', {name: 'Retry'});
  await screen.findByRole('button', {name: 'Download'});
  fireEvent.click(screen.getByRole('button', {name: 'Download'})); expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', {name: 'Retry'}));
  await waitFor(() => expect(screen.getAllByRole('button', {name: 'Download'})).toHaveLength(2));
  fireEvent.click(screen.getByRole('button', {name: 'Download all ZIP'}));
  await waitFor(() => expect(packZip).toHaveBeenCalledOnce());
  expect(vi.mocked(packZip).mock.calls[0][0]).toHaveLength(2);
  fireEvent.click(screen.getAllByRole('button', {name: 'Remove'})[0]);
  expect(screen.getAllByRole('listitem')).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', {name: 'Clear list'}));
  expect(screen.queryByRole('list', {name: 'Image list'})).toBeNull();
});
it('blocks output delivery while an advanced draft is incomplete and keeps the shared comparison dialog', async () => {
  await mount('zh'); fireEvent.click(screen.getByRole('button', {name: '压缩图片'})); await screen.findByRole('button', {name: '下载'});
  fireEvent.click(screen.getByRole('button', {name: '预览'})); fireEvent.click(screen.getByRole('button', {name: '对比'}));
  expect(document.querySelector('[data-image-comparison="compare"]')).not.toBeNull();
  expect(screen.getByRole('region', {name: '原图'})).toBeTruthy(); expect(screen.getByRole('region', {name: '结果'})).toBeTruthy();
  fireEvent.click(screen.getByRole('button', {name: '关闭预览'}));
  await waitFor(() => expect(screen.queryByRole('button', {name: '关闭预览'})).toBeNull());
  fireEvent.click(screen.getByRole('button', {name: '高级'}));
  fireEvent.change(screen.getByRole('textbox', {name: '最长边（像素，可选）'}), {target: {value: '-'}});
  expect(screen.getByRole('button', {name: '下载'}).hasAttribute('disabled')).toBe(true);
  expect(screen.getByRole('button', {name: '下载全部 ZIP'}).hasAttribute('disabled')).toBe(true);
});
