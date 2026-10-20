import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setViewport } from './setup';
import ImageConverter from '../src/tools/image-converter/ImageConverter';
import { ImageFailure } from '../src/tools/image/types';
import { converterMessages } from '../src/tools/image-converter/messages';
import { getToolPreviewPaths } from '../src/tools/preview-paths';
import { getPublishedTools } from '../src/tools/registry';
import { toolPageContents } from '../src/site/tool-content';
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
  it('progressively reveals source and result without remounting settings or the file picker', async () => {
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
    expect(screen.getByRole('region', { name: 'Image preview' })).toBeTruthy();
    expect(screen.getAllByRole('figure')).toHaveLength(1);
    expect(await screen.findByRole('img', { name: 'Original' })).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Download result' }).hasAttribute('disabled'),
    ).toBe(true);
    expect(screen.getByRole('region', { name: 'Conversion settings' })).toBe(settings);
    expect(container.querySelector('input[type=file]')).toBe(input);

    await act(async () => finish(new Blob(['output'], { type: 'image/webp' })));
    await screen.findByRole('link', { name: 'Download result' });
    expect(screen.getAllByRole('figure')).toHaveLength(2);
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
    ).toEqual(['file', 'settings', 'preview', 'result']);
    const file = new File(['png'], 'art.png', { type: 'image/png' });
    fireEvent.change(container.querySelector('input[type=file]')!, {
      target: { files: [file] },
    });
    await screen.findByRole('link', { name: 'Download result' });
    expect(encode).toHaveBeenCalledTimes(1);
    await user.click(
      screen.getByRole('button', { name: 'Advanced' }),
    );
    await user.type(
      screen.getByRole('textbox', { name: 'Download filename stem' }),
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
      within(screen.getByRole('region', { name: '结果与下载' }))
        .getByRole('status').textContent,
    ).toBe(converterMessages.cn.sourceReady));
    expect(screen.queryByText(converterMessages.cn.stale)).toBeNull();
    expect(screen.getAllByRole('figure')).toHaveLength(1);
    expect(screen.queryByRole('link', { name: '下载结果' })).toBeNull();
    await user.click(screen.getByRole('button', { name: '移除图片' }));
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: '选择图片或拖放到这里' }),
      ),
    );
    expect(screen.queryByRole('link', { name: '下载结果' })).toBeNull();
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
