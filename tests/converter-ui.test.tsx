import type { ReactElement } from 'react';
import { UiProvider } from '../src/ui/UiProvider';
import { messages } from '../src/i18n/messages';
import { act, fireEvent, render as renderUi, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setViewport } from './setup';
import ImageConverter from '../src/tools/image-converter/ImageConverter';
import { ImageFailure } from '../src/tools/image/types';
import { converterMessages } from '../src/tools/image-converter/messages';
import { getToolPreviewPaths } from '../src/tools/preview-paths';
import { getPublishedTools } from '../src/tools/registry';
import { toolPageContents } from '../src/site/tool-content';
import { ConverterSession } from '../src/tools/image-converter/session';
const render = (ui: ReactElement) => renderUi(<UiProvider labels={messages.global}>{ui}</UiProvider>);
const { encode } = vi.hoisted(() => ({
  encode: vi.fn(
    async () => new Blob(['unit-test-output'], { type: 'image/webp' }),
  ),
}));
vi.mock('../src/tools/image/browser-codec', () => ({
  detectCapabilities: async () => ({
    webp: { supported: true },
    png: { supported: true },
    jpeg: { supported: true },
  }),
  acceptImage: async (file: File) => {
    if (file.name === 'broken.png') throw new ImageFailure('corrupt');
    return {
      file,
      blob: file,
      width: 80,
      height: 48,
      info: { format: 'png', width: 80, height: 48, orientation: 1 },
    };
  },
  encodeImage: encode,
}));
beforeEach(() => {
  setViewport(true);
  encode.mockClear();
  let sequence = 0;
  vi.stubGlobal(
    'URL',
    class extends URL {
      static createObjectURL = vi.fn(() => `blob:test-${++sequence}`);
      static revokeObjectURL = vi.fn();
    },
  );
});
describe('real workspace interaction contract (codec mocked; not browser evidence)', () => {
  it('reveals a compact task, with lazy preview and no duplicate result/download region', async () => {
    let finish!: (blob: Blob) => void;
    encode.mockImplementationOnce(() => new Promise((resolve) => {
      finish = resolve;
    }));
    const { container } = render(<ImageConverter region="global" />);
    const settings = screen.getByRole('region', { name: 'Conversion settings' });
    const input = container.querySelector('input[type=file]')!;
    await waitFor(() => expect(
      screen.getByRole('radio', { name: /WEBP/ }).hasAttribute('disabled'),
    ).toBe(false));
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.queryByRole('region', { name: 'Image preview' })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Result and download' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'View result' })).toBeNull();
    expect(container.querySelector('button button')).toBeNull();

    fireEvent.change(input, { target: { files: [new File(['png'], 'art.png')] } });
    await waitFor(() => expect(encode).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('list', { name: 'File tasks' })).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(container.querySelector('[data-image-thumbnail] img')).toBeTruthy());
    const thumbnail = container.querySelector('[data-image-thumbnail] img')!;
    const thumbnailUrl = thumbnail.getAttribute('src');
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Image preview' }));
    expect(await screen.findByRole('img', { name: 'Original' })).toBeTruthy();
    expect(screen.queryByRole('img', { name: 'Output' })).toBeNull();
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    expect(container.querySelector('[data-image-thumbnail] img')?.getAttribute('src')).toBe(thumbnailUrl);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Image preview' }));
    expect(
      screen.getByRole('button', { name: 'Download result' }).hasAttribute('disabled'),
    ).toBe(true);
    expect(screen.getByRole('region', { name: 'Conversion settings' })).toBe(settings);
    expect(container.querySelector('input[type=file]')).toBe(input);

    await act(async () => finish(new Blob(['output'], { type: 'image/webp' })));
    await screen.findByRole('link', { name: 'Download result' });
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getAllByRole('link', { name: 'Download result' })).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Image preview' }));
    expect(await screen.findByRole('img', { name: 'Original' })).toBeTruthy();
    expect(screen.queryByRole('img', { name: 'Output' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Output' }));
    expect(await screen.findByRole('img', { name: 'Output' })).toBeTruthy();
    expect(screen.queryByRole('img', { name: 'Original' })).toBeNull();
    expect(URL.createObjectURL).toHaveBeenCalledTimes(2);
    await user.click(screen.getByRole('button', { name: 'Close image preview' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    expect(screen.getByRole('region', { name: 'Conversion settings' })).toBe(settings);
    expect(container.querySelector('button button')).toBeNull();
  });
  it('keeps one settings tree, mobile DOM order, filename-independent ready output and releases URLs', async () => {
    const user = userEvent.setup(),
      { container, unmount } = render(<ImageConverter region="global" />);
    await waitFor(() =>
      expect(
        screen.getByRole('radio', { name: /WEBP/ }).hasAttribute('disabled'),
      ).toBe(false),
    );
    expect(
      [...container.querySelectorAll('[data-converter-part]')].map((el) =>
        el.getAttribute('data-converter-part'),
      ),
    ).toEqual(['file', 'settings', 'tasks']);
    const file = new File(['png'], 'art.png', { type: 'image/png' });
    fireEvent.change(container.querySelector('input[type=file]')!, {
      target: { files: [file] },
    });
    await screen.findByRole('link', { name: 'Download result' });
    expect(encode).toHaveBeenCalledTimes(1);
    const sourceUrl = container.querySelector('[data-image-thumbnail] img')?.getAttribute('src');
    await user.click(
      screen.getByRole('button', { name: 'Advanced' }),
    );
    await user.type(
      screen.getByRole('textbox', { name: 'Download filename stem (optional)' }),
      'renamed.png.webp',
    );
    expect(
      screen
        .getByRole('link', { name: 'Download result' })
        .getAttribute('download'),
    ).toBe('renamed.webp');
    expect(encode).toHaveBeenCalledTimes(1);
    await user.click(
      screen.getByRole('button', { name: 'Quick' }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Advanced' }),
    );
    expect(
      screen.getAllByRole('textbox', { name: 'Exact quality (1–100)' }),
    ).toHaveLength(1);
    expect(encode).toHaveBeenCalledTimes(1);
    await user.clear(
      screen.getByRole('textbox', { name: 'Exact quality (1–100)' }),
    );
    expect(screen.queryByRole('link', { name: 'Download result' })).toBeNull();
    expect(screen.getByText('Enter an integer from 1 to 100.')).toBeTruthy();
    expect(container.querySelector('[data-image-thumbnail] img')?.getAttribute('src')).toBe(sourceUrl);
    const created = vi.mocked(URL.createObjectURL).mock.calls.length;
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(created);
  });
  it('preserves an existing download after bad candidate, compact replacement, and restores focus on remove', async () => {
    const user = userEvent.setup(),
      { container } = render(<ImageConverter region="cn" />);
    await waitFor(() =>
      expect(
        screen.getByRole('radio', { name: /WEBP/ }).hasAttribute('disabled'),
      ).toBe(false),
    );
    const input = container.querySelector('input[type=file]')!;
    fireEvent.change(input, { target: { files: [new File(['a'], 'a.png')] } });
    const old = (
      await screen.findByRole('link', { name: '下载结果' })
    ).getAttribute('href');
    expect(screen.getByRole('button', { name: '替换图片' })).toBeTruthy();
    fireEvent.change(input, {
      target: { files: [new File(['bad'], 'broken.png')] },
    });
    await screen.findByText(converterMessages.cn.errors.corrupt);
    expect(
      screen.getByRole('link', { name: '下载结果' }).getAttribute('href'),
    ).toBe(old);
    const huge = new File(['x'], 'huge.png');
    Object.defineProperty(huge, 'size', { value: 21 * 1024 * 1024 });
    fireEvent.change(input, { target: { files: [huge] } });
    expect(
      screen.getByRole('link', { name: '下载结果' }).getAttribute('href'),
    ).toBe(old);
    await user.click(screen.getByRole('button', { name: '高级' }));
    fireEvent.change(input, {
      target: { files: [new File(['replacement'], 'replacement.png')] },
    });
    await screen.findByText('replacement.png');
    await waitFor(() => expect(
      within(screen.getByRole('list', { name: '文件任务' }))
        .getByRole('status').textContent,
    ).toBe(converterMessages.cn.taskStatus.queued));
    expect(screen.queryByText(converterMessages.cn.taskStatus.stale)).toBeNull();
    expect(screen.queryByRole('figure')).toBeNull();
    expect(screen.queryByRole('link', { name: '下载结果' })).toBeNull();
    await user.click(screen.getByRole('button', { name: '移除图片' }));
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: '选择图片或拖放到这里' }),
      ),
    );
    expect(screen.queryByRole('link', { name: '下载结果' })).toBeNull();
  });
  it('keeps invalid quality drafts out of the session and synchronizes valid edits with the slider', async () => {
    const user = userEvent.setup();
    const { container } = render(<ImageConverter region="global" />);
    await waitFor(() => expect(
      screen.getByRole('radio', { name: /WEBP/ }).hasAttribute('disabled'),
    ).toBe(false));
    fireEvent.change(container.querySelector('input[type=file]')!, {
      target: { files: [new File(['png'], 'art.png')] },
    });
    await screen.findByRole('link', { name: 'Download result' });
    await user.click(screen.getByRole('button', { name: 'Advanced' }));
    const input = screen.getByRole('textbox', { name: 'Exact quality (1–100)' }) as HTMLInputElement;
    expect(input.value).toBe('85');
    const update = vi.spyOn(ConverterSession.prototype, 'settings');
    try {
      for (const value of ['', '0', '101', '85.5', 'abc']) {
        fireEvent.change(input, { target: { value } });
        expect(input.value).toBe(value);
        expect(input.getAttribute('aria-invalid')).toBe('true');
        expect(screen.getByRole('slider').getAttribute('aria-valuenow')).toBe('85');
        expect(screen.queryByRole('link', { name: 'Download result' })).toBeNull();
        expect(screen.getByRole('button', { name: 'Generate result' }).hasAttribute('disabled')).toBe(true);
      }
      expect(update).not.toHaveBeenCalled();
      fireEvent.change(input, { target: { value: '86' } });
      expect(update).toHaveBeenLastCalledWith(expect.objectContaining({ quality: 86 }));
      expect(input.hasAttribute('aria-invalid')).toBe(false);
      const slider = screen.getByRole('slider');
      expect(slider.getAttribute('aria-valuenow')).toBe('86');
      act(() => slider.focus());
      await user.keyboard('{ArrowRight}');
      expect(input.value).toBe('87');
      expect(update).toHaveBeenLastCalledWith(expect.objectContaining({ quality: 87 }));
      expect(encode).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('link', { name: 'Download result' })).toBeNull();
      await user.click(screen.getByRole('button', { name: 'Generate result' }));
      const download = await screen.findByRole('link', { name: 'Download result' });
      const href = download.getAttribute('href');
      expect(encode).toHaveBeenCalledTimes(2);
      await user.click(screen.getByRole('button', { name: 'Quick' }));
      await user.click(screen.getByRole('button', { name: 'Advanced' }));
      expect((screen.getByRole('textbox', { name: 'Exact quality (1–100)' }) as HTMLInputElement).value).toBe('87');
      expect(screen.getByRole('link', { name: 'Download result' }).getAttribute('href')).toBe(href);
      expect(encode).toHaveBeenCalledTimes(2);
      await user.click(screen.getByRole('radio', { name: 'JPEG' }));
      expect((screen.getByRole('textbox', { name: 'Exact quality (1–100)' }) as HTMLInputElement).value).toBe('88');
      await user.click(screen.getByRole('radio', { name: 'PNG' }));
      expect(screen.queryByRole('slider')).toBeNull();
      expect(screen.queryByRole('textbox', { name: 'Exact quality (1–100)' })).toBeNull();
      await user.click(screen.getByRole('radio', { name: 'WEBP' }));
      expect((screen.getByRole('textbox', { name: 'Exact quality (1–100)' }) as HTMLInputElement).value).toBe('87');
      expect(encode).toHaveBeenCalledTimes(2);
    } finally {
      update.mockRestore();
    }
  });
  it.each(['cn', 'global'] as const)('synchronizes JPEG hex and the native picker in %s while retaining invalid text and filename behavior', async (region) => {
    const user = userEvent.setup();
    const t = converterMessages[region];
    const { container } = render(<ImageConverter region={region} />);
    await waitFor(() => expect(screen.getByRole('radio', { name: /WEBP/ }).hasAttribute('disabled')).toBe(false));
    await user.click(screen.getByRole('button', { name: t.advanced }));
    await user.click(screen.getByRole('radio', { name: 'JPEG' }));
    const hex = screen.getByRole('textbox', { name: t.background }) as HTMLInputElement;
    const picker = screen.getByLabelText(t.pickBackground) as HTMLInputElement;
    expect(picker.type).toBe('color');
    expect(picker.value).toBe('#ffffff');
    fireEvent.change(hex, { target: { value: '#12AB34' } });
    expect(picker.value).toBe('#12ab34');
    fireEvent.change(container.querySelector('input[type=file]')!, {
      target: { files: [new File(['png'], 'art.png')] },
    });
    await waitFor(() => expect(screen.getByRole('button', { name: t.generate }).hasAttribute('disabled')).toBe(false));
    for (const value of ['#12', 'invalid', '']) {
      fireEvent.change(hex, { target: { value } });
      expect(hex.value).toBe(value);
      expect(hex.getAttribute('aria-invalid')).toBe('true');
      expect(screen.getByRole('alert').textContent).toBe(t.backgroundError);
      expect(picker.value).toBe('#12ab34');
      await user.click(screen.getByRole('button', { name: t.generate }));
      expect(encode).not.toHaveBeenCalled();
    }
    fireEvent.change(picker, { target: { value: '#456789' } });
    expect(hex.value).toBe('#456789');
    expect(hex.hasAttribute('aria-invalid')).toBe(false);
    await user.click(screen.getByRole('button', { name: t.generate }));
    const download = await screen.findByRole('link', { name: t.download });
    const href = download.getAttribute('href');
    expect(encode).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ jpegBackground: '#456789' }), expect.anything());
    const filename = screen.getByRole('textbox', { name: t.filename });
    expect(filename.getAttribute('aria-describedby')).toBeNull();
    await user.type(filename, 'renamed');
    expect(screen.getByRole('link', { name: t.download }).getAttribute('href')).toBe(href);
    expect(screen.getByRole('link', { name: t.download }).getAttribute('download')).toBe('renamed.jpg');
    await user.clear(filename);
    expect(screen.getByRole('link', { name: t.download }).getAttribute('download')).toBe('art-converted.jpg');
    await user.type(filename, 'bad/name');
    expect(screen.getByText(t.filenameError)).toBeTruthy();
    expect(screen.queryByRole('link', { name: t.download })).toBeNull();
    expect(encode).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[data-converter-part=settings] details')).toBeNull();
    await user.click(screen.getByRole('button', { name: t.restore }));
    expect(hex.value).toBe('#FFFFFF');
    expect(picker.value).toBe('#ffffff');
  });
  it('keeps a stale result out of the dialog and download; preview errors also block download', async () => {
    const user = userEvent.setup();
    const { container, unmount } = render(<ImageConverter region="global" />);
    await waitFor(() => expect(screen.getByRole('radio', { name: /WEBP/ }).hasAttribute('disabled')).toBe(false));
    fireEvent.change(container.querySelector('input[type=file]')!, { target: { files: [new File(['png'], 'art.png')] } });
    await screen.findByRole('link', { name: 'Download result' });
    await user.click(screen.getByRole('button', { name: 'Advanced' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Exact quality (1–100)' }), { target: { value: '90' } });
    expect(screen.queryByRole('link', { name: 'Download result' })).toBeNull();
    expect(screen.getByRole('list', { name: 'File tasks' }).querySelector('[data-task-status]')?.getAttribute('data-task-status')).toBe('stale');
    await user.click(screen.getByRole('button', { name: 'Image preview' }));
    expect(await screen.findByRole('img', { name: 'Original' })).toBeTruthy();
    expect(screen.queryByRole('img', { name: 'Output' })).toBeNull();
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'Generate result' }));
    await screen.findByRole('link', { name: 'Download result' });
    await user.click(screen.getByRole('button', { name: 'Image preview' }));
    await user.click(screen.getByRole('button', { name: 'Output' }));
    fireEvent.error(await screen.findByRole('img', { name: 'Output' }));
    expect(within(screen.getByRole('dialog')).getByRole('alert').textContent).toBe(converterMessages.global.viewer.error);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('link', { name: 'Download result' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Image preview' }));
    await user.click(screen.getByRole('button', { name: 'Output' }));
    fireEvent.load(await screen.findByRole('img', { name: 'Output' }));
    await user.keyboard('{Escape}');
    expect(screen.getByRole('link', { name: 'Download result' })).toBeTruthy();
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(vi.mocked(URL.createObjectURL).mock.calls.length);
  });
  it('recovers via a row retry and ignores a conversion completed after removal', async () => {
    const user = userEvent.setup();
    const { container } = render(<ImageConverter region="global" />);
    await waitFor(() => expect(screen.getByRole('radio', { name: /WEBP/ }).hasAttribute('disabled')).toBe(false));
    encode.mockRejectedValueOnce(new ImageFailure('encode'));
    fireEvent.change(container.querySelector('input[type=file]')!, { target: { files: [new File(['png'], 'art.png')] } });
    await screen.findByText(converterMessages.global.errors.encode);
    const row = screen.getByRole('listitem', { name: 'art.png' });
    expect(within(row).getByRole('status').textContent).toBe('Failed');
    let finish!: (blob: Blob) => void;
    encode.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    await user.click(within(row).getByRole('button', { name: 'Retry current settings' }));
    expect(within(row).getByRole('status').textContent).toBe('Processing');
    await user.click(within(row).getByRole('button', { name: 'Remove image' }));
    await act(async () => finish(new Blob(['obsolete'], { type: 'image/webp' })));
    expect(screen.queryByRole('list', { name: 'File tasks' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Download result' })).toBeNull();
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
  });
  it('keeps Quick same-format bytes and shares the download URL in its on-demand preview', async () => {
    const user = userEvent.setup();
    const { container, unmount } = render(<ImageConverter region="global" />);
    await waitFor(() => expect(screen.getByRole('radio', { name: /WEBP/ }).hasAttribute('disabled')).toBe(false));
    await user.click(screen.getByRole('radio', { name: 'PNG' }));
    const file = new File(['original bytes'], 'art.png', { type: 'image/png' });
    fireEvent.change(container.querySelector('input[type=file]')!, { target: { files: [file] } });
    const download = await screen.findByRole('link', { name: 'Download original' });
    expect(encode).not.toHaveBeenCalled();
    expect(URL.createObjectURL).toHaveBeenCalledWith(file);
    await user.click(screen.getByRole('button', { name: 'Image preview' }));
    expect((await screen.findByRole('img', { name: 'Original' })).getAttribute('src')).toBe(download.getAttribute('href'));
    await user.click(screen.getByRole('button', { name: 'Output' }));
    expect(screen.getByRole('img', { name: 'Output' }).getAttribute('src')).toBe(download.getAttribute('href'));
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
  });
  it('only exposes ownership diagnostics for an explicit development debug URL', async () => {
    const original = window.location.href;
    try {
      window.history.replaceState({}, '', '/preview/image-converter/');
      const normal = render(<ImageConverter region="global" />);
      await waitFor(() => expect(screen.getByRole('radio', { name: /WEBP/ }).hasAttribute('disabled')).toBe(false));
      expect(normal.container.querySelector('[data-converter-diagnostics]')).toBeNull();
      normal.unmount();
      window.history.replaceState({}, '', '?debug=1');
      const debug = render(<ImageConverter region="global" />);
      await waitFor(() => expect(debug.container.querySelector('[data-converter-diagnostics]')).toBeTruthy());
      debug.unmount();
      vi.stubEnv('DEV', false);
      const production = render(<ImageConverter region="global" />);
      await waitFor(() => expect(screen.getByRole('radio', { name: /WEBP/ }).hasAttribute('disabled')).toBe(false));
      expect(production.container.querySelector('[data-converter-diagnostics]')).toBeNull();
    } finally {
      vi.unstubAllEnvs();
      window.history.replaceState({}, '', original);
    }
  });
  it('keeps draft preview separate from published routes in both regions', () => {
    for (const region of ['cn', 'global'] as const) {
      expect(getToolPreviewPaths(false, region)).toEqual([]);
      expect(
        getToolPreviewPaths(true, region).map((path) => path.params.slug),
      ).toEqual(['image-converter']);
      expect(getPublishedTools(region)).toEqual([]);
      const content = toolPageContents['image-converter'][region]!;
      expect(content.h1).toBeTruthy();
      expect(content.steps?.length).toBe(4);
      expect(content.faq?.length).toBe(4);
      expect(content.title.match(/Tool4Furry/g)).toHaveLength(1);
    }
  });
});
