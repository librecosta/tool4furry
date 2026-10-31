import { defaultLocale } from '../src/i18n/locale';
import type { ReactElement } from 'react';
import { UiProvider } from '../src/ui/UiProvider';
import { messages } from '../src/i18n/messages';
import {
  act,
  fireEvent,
  render as renderUi,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setViewport } from './setup';
import ImageConverter from '../src/tools/image-converter/ImageConverter';
import { ImageFailure } from '../src/tools/image/types';
import { converterMessages } from '../src/tools/image-converter/messages';
import { getAvailableTools, getPublishedTools } from '../src/tools/registry';
import { toolPageContents } from '../src/site/tool-content';
import { ConverterSession } from '../src/tools/image-converter/session';
const render = (ui: ReactElement) =>
  renderUi(<UiProvider labels={messages.en}>{ui}</UiProvider>);
const { encode, capabilities, quick } = vi.hoisted(() => ({
  quick: vi.fn(),
  capabilities: vi.fn(),
  encode: vi.fn(
    async () => new Blob(['unit-test-output'], { type: 'image/webp' }),
  ),
}));
vi.mock('../src/tools/image/browser-codec', () => ({
  detectCapabilities: capabilities,
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
  prepareQuickOutput: quick,
}));
beforeEach(() => {
  setViewport(true);
  encode.mockClear();
  quick.mockReset().mockImplementation(async (source) => ({ blob: source.blob, info: source.info, changed: false, kind: 'passthrough', metadataPolicy: 'privacy-v1' }));
  capabilities.mockReset().mockResolvedValue({
    webp: { supported: true },
    avif: { supported: false },
    png: { supported: true },
    jpeg: { supported: true },
  });
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
  it('shows four formats and keeps AVIF-only chroma and quality preferences across modes', async () => {
    capabilities.mockResolvedValue({ webp: { supported: true }, jpeg: { supported: true }, png: { supported: true }, avif: { supported: true } });
    const user = userEvent.setup();
    render(<ImageConverter region="global" locale="en" />);
    const avif = screen.getByRole('radio', { name: /AVIF/ });
    await waitFor(() => expect(avif.hasAttribute('disabled')).toBe(false));
    expect(screen.getAllByRole('radio')).toHaveLength(4);
    await user.click(avif);
    expect(screen.queryByRole('checkbox', { name: 'Preserve colored edges' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Advanced' }));
    expect((screen.getByRole('textbox', { name: 'Exact quality (1–100)' }) as HTMLInputElement).value).toBe('55');
    const chroma = screen.getByRole('checkbox', { name: 'Preserve colored edges' });
    expect(screen.getByRole('checkbox', { name: 'Preserve author and copyright information' }).getAttribute('aria-disabled')).toBe('true');
    await user.click(chroma);
    expect(chroma.getAttribute('aria-checked')).toBe('true');
    await user.click(screen.getByRole('button', { name: 'Quick' }));
    await user.click(screen.getByRole('button', { name: 'Advanced' }));
    expect(screen.getByRole('checkbox', { name: 'Preserve colored edges' }).getAttribute('aria-checked')).toBe('true');
    await user.click(screen.getByRole('radio', { name: /PNG/ }));
    expect(screen.queryByRole('checkbox', { name: 'Preserve colored edges' })).toBeNull();
    const authorship = screen.getByRole('checkbox', { name: 'Preserve author and copyright information' });
    expect(authorship.getAttribute('aria-checked')).toBe('false');
    expect(authorship.getAttribute('aria-disabled')).not.toBe('true');
    await user.click(authorship);
    expect(authorship.getAttribute('aria-checked')).toBe('true');
    await user.click(screen.getByRole('button', { name: 'Quick' }));
    expect(screen.queryByRole('checkbox', { name: 'Preserve author and copyright information' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Advanced' }));
    expect(screen.getByRole('checkbox', { name: 'Preserve author and copyright information' }).getAttribute('aria-checked')).toBe('true');
    await user.click(screen.getByRole('button', { name: 'Restore this format’s defaults' }));
    expect(screen.getByRole('checkbox', { name: 'Preserve author and copyright information' }).getAttribute('aria-checked')).toBe('false');
    expect(encode).not.toHaveBeenCalled();
  });
  it('labels cleaned downloads accurately and releases their distinct output URL on removal', async () => {
    quick.mockImplementation(async (source) => ({ blob: new Blob(['clean']), info: source.info, changed: true, kind: 'cleaned', metadataPolicy: 'privacy-v1' }));
    const user = userEvent.setup();
    const { container } = render(<ImageConverter region="global" locale="en" />);
    await waitFor(() => expect(screen.getByRole('radio', { name: /PNG/ }).hasAttribute('disabled')).toBe(false));
    await user.click(screen.getByRole('radio', { name: /PNG/ }));
    fireEvent.change(container.querySelector('input[type=file]')!, { target: { files: [new File(['private'], 'private.png', { type: 'image/png' })] } });
    const download = await screen.findByRole('link', { name: 'Download cleaned result' });
    expect(screen.queryByRole('link', { name: 'Download original' })).toBeNull();
    const href = download.getAttribute('href');
    await user.click(screen.getByRole('button', { name: 'Remove image' }));
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith(href));
  });
  it('switches stack/split layouts without resetting settings or a ready result', async () => {
    const resize = setViewport(false), user = userEvent.setup();
    const { container } = render(<ImageConverter region="global" locale="en" />);
    const layout = container.querySelector('[data-image-converter]')!;
    const source = container.querySelector('input[type=file]')!;
    const settings = container.querySelector('[data-converter-part="settings"]');
    await waitFor(() => expect(screen.getByRole('radio', { name: /WEBP/ }).hasAttribute('disabled')).toBe(false));
    expect(layout.getAttribute('data-form-layout')).toBe('stack');
    await user.click(screen.getByRole('button', { name: 'Advanced' }));
    const quality = screen.getByRole('textbox', { name: 'Exact quality (1–100)' });
    await user.clear(quality); await user.type(quality, '77');
    fireEvent.change(source, { target: { files: [new File(['png'], 'layout.png')] } });
    await waitFor(() => expect(layout.getAttribute('data-form-layout')).toBe('split'));
    expect(encode).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Convert all' }));
    const result = await screen.findByRole('link', { name: 'Download result' });
    const href = result.getAttribute('href');
    act(() => resize(true)); act(() => resize(false));
    expect(screen.getByRole('link', { name: 'Download result' })).toBe(result);
    expect(result.getAttribute('href')).toBe(href);
    expect(encode).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Clear list' }));
    await user.click(await screen.findByRole('button', { name: 'Clear' }));
    await waitFor(() => expect(layout.getAttribute('data-form-layout')).toBe('stack'));
    expect(container.querySelector('input[type=file]')).toBe(source);
    expect(container.querySelector('[data-converter-part="settings"]')).toBe(settings);
    expect(screen.getByRole('textbox', { name: 'Exact quality (1–100)' })).toBe(quality);
    expect((quality as HTMLInputElement).value).toBe('77');
    expect(screen.queryByRole('link', { name: 'Download result' })).toBeNull();
    expect(encode).toHaveBeenCalledTimes(1);
  });

  it('shows desktop limits from the session and keeps them when only the viewport changes', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Windows NT');
    const changeViewport = setViewport(false);
    const { container } = render(<ImageConverter region="global" locale="en" />);
    await waitFor(() =>
      expect(container.textContent).toContain(
        'Up to 100 images, 100 MiB total',
      ),
    );
    expect(container.textContent).toContain(
      '50 MiB, 40 million pixels and 10000px',
    );
    act(() => changeViewport(true));
    expect(container.textContent).toContain('Up to 100 images, 100 MiB total');
    expect(capabilities).toHaveBeenCalledOnce();
  });
  it('keeps normal capability initialization out of flow and gives compact unsupported reasons', async () => {
    let finish!: (value: unknown) => void;
    capabilities.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const { container } = render(<ImageConverter region="global" locale="en" />);
    const panel = container.querySelector('[data-converter-part="settings"]')!;
    const structure = panel.innerHTML.replace(/class="[^"]*"/g, '');
    expect(
      screen
        .getAllByRole('radio')
        .every((input) => input.hasAttribute('disabled')),
    ).toBe(true);
    expect(panel.textContent).not.toContain('Checking browser');
    expect(
      screen.queryByRole('button', { name: 'Check export support again' }),
    ).toBeNull();
    await act(async () =>
      finish({
        webp: { supported: false },
        avif: { supported: false },
        png: { supported: true },
        jpeg: { supported: true },
      }),
    );
    expect(
      screen.getByRole('radio', { name: 'PNG' }).hasAttribute('disabled'),
    ).toBe(false);
    const unavailable = screen.getByRole('radio', { name: 'WEBP' });
    expect(unavailable.hasAttribute('disabled')).toBe(true);
    expect(unavailable.getAttribute('aria-description')).toContain(
      'could not verify',
    );
    expect(panel.querySelectorAll('small')).toHaveLength(0);
    expect(panel.children.length).toBe(2);
    expect(structure).toContain('Output format');
  });
  it.each(['timeout', 'empty'])(
    'explains %s capability checks and permits retry without permanent disablement',
    async (kind) => {
      if (kind === 'timeout')
        capabilities.mockRejectedValueOnce(new ImageFailure('timeout'));
      else
        capabilities.mockResolvedValueOnce({
          webp: { supported: false },
          avif: { supported: false },
          png: { supported: false },
          jpeg: { supported: false },
        });
      render(<ImageConverter region="global" locale="en" />);
      expect(await screen.findByRole('alert')).toBeTruthy();
      await userEvent.click(
        screen.getByRole('button', { name: 'Check export support again' }),
      );
      await waitFor(() =>
        expect(
          screen.getByRole('radio', { name: 'WEBP' }).hasAttribute('disabled'),
        ).toBe(false),
      );
      expect(screen.queryByRole('alert')).toBeNull();
    },
  );
  it('reveals a compact task, with lazy preview and no duplicate result/download region', async () => {
    let finish!: (blob: Blob) => void;
    encode.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const { container } = render(<ImageConverter region="global" locale="en" />);
    const settings = screen.getByRole('region', {
      name: 'Conversion settings',
    });
    const input = container.querySelector('input[type=file]')!;
    await waitFor(() =>
      expect(
        screen.getByRole('radio', { name: /WEBP/ }).hasAttribute('disabled'),
      ).toBe(false),
    );
    expect(screen.getAllByRole('radio')).toHaveLength(4);
    expect(screen.queryByRole('region', { name: 'Image preview' })).toBeNull();
    expect(
      screen.queryByRole('region', { name: 'Result and download' }),
    ).toBeNull();
    expect(screen.queryByRole('link', { name: 'View result' })).toBeNull();
    expect(container.querySelector('button button')).toBeNull();

    fireEvent.change(input, {
      target: { files: [new File(['png'], 'art.png')] },
    });
    await waitFor(() => expect(encode).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('list', { name: 'File tasks' })).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
    await waitFor(() =>
      expect(
        container.querySelector('[data-image-thumbnail] img'),
      ).toBeTruthy(),
    );
    const thumbnail = container.querySelector('[data-image-thumbnail] img')!;
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    const thumbnailUrl = thumbnail.getAttribute('src');
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Image preview' }));
    expect(await screen.findByRole('img', { name: 'Original' })).toBeTruthy();
    expect(screen.queryByRole('img', { name: 'Output' })).toBeNull();
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    expect(
      container
        .querySelector('[data-image-thumbnail] img')
        ?.getAttribute('src'),
    ).toBe(thumbnailUrl);
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: 'Image preview' }),
      ),
    );
    expect(
      screen
        .getByRole('button', { name: 'Download result' })
        .hasAttribute('disabled'),
    ).toBe(true);
    expect(screen.getByRole('region', { name: 'Conversion settings' })).toBe(
      settings,
    );
    expect(container.querySelector('input[type=file]')).toBe(input);

    await act(async () => finish(new Blob(['output'], { type: 'image/webp' })));
    await screen.findByRole('link', { name: 'Download result' });
    expect(screen.queryByRole('img')).toBeNull();
    expect(
      screen.getAllByRole('link', { name: 'Download result' }),
    ).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Image preview' }));
    expect(await screen.findByRole('img', { name: 'Original' })).toBeTruthy();
    expect(screen.queryByRole('img', { name: 'Output' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Output' }));
    expect(await screen.findByRole('img', { name: 'Output' })).toBeTruthy();
    expect(screen.queryByRole('img', { name: 'Original' })).toBeNull();
    expect(URL.createObjectURL).toHaveBeenCalledTimes(2);
    expect(container.querySelectorAll('[data-thumbnail-kind="output"] img')).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Compare' }));
    expect(screen.getByRole('img', { name: 'Original' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Output' })).toBeTruthy();
    await user.click(
      screen.getByRole('button', { name: 'Close image preview' }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    expect(screen.getByRole('region', { name: 'Conversion settings' })).toBe(
      settings,
    );
    expect(container.querySelector('button button')).toBeNull();
  });
  it('keeps one settings tree, mobile DOM order, filename-independent ready output and releases URLs', async () => {
    const user = userEvent.setup(),
      { container, unmount } = render(<ImageConverter region="global" locale="en" />);
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
    const sourceUrl = container
      .querySelector('[data-image-thumbnail] img')
      ?.getAttribute('src');
    await user.click(screen.getByRole('button', { name: 'Advanced' }));
    await user.type(
      screen.getByRole('textbox', { name: 'Filename label (optional)' }),
      'renamed',
    );
    expect(
      screen
        .getByRole('link', { name: 'Download result' })
        .getAttribute('download'),
    ).toMatch(/^t4f-\d{8}-\d{9}-0001-renamed-art\.webp$/);
    expect(encode).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Quick' }));
    await user.click(screen.getByRole('button', { name: 'Advanced' }));
    expect(
      screen.getAllByRole('textbox', { name: 'Exact quality (1–100)' }),
    ).toHaveLength(1);
    expect(encode).toHaveBeenCalledTimes(1);
    await user.clear(
      screen.getByRole('textbox', { name: 'Exact quality (1–100)' }),
    );
    expect(screen.queryByRole('link', { name: 'Download result' })).toBeNull();
    expect(screen.getByText('Enter an integer from 1 to 100.')).toBeTruthy();
    expect(container.querySelector('[data-thumbnail-kind="output"]')).toBeNull();
    expect(
      container
        .querySelector('[data-image-thumbnail] img')
        ?.getAttribute('src'),
    ).toBe(sourceUrl);
    const created = vi.mocked(URL.createObjectURL).mock.calls.length;
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(created);
  });
  it('appends invalid and valid tasks without disturbing an existing download; removing a row restores the add entry', async () => {
    const user = userEvent.setup();
    const { container } = render(<ImageConverter region="cn" locale="zh" />);
    await waitFor(() =>
      expect(
        screen.getByRole('radio', { name: /WEBP/ }).hasAttribute('disabled'),
      ).toBe(false),
    );
    const input = container.querySelector('#converter-source')!;
    fireEvent.change(input, { target: { files: [new File(['a'], 'a.png')] } });
    const old = await screen.findByRole('link', { name: '下载结果' });
    const row = screen.getByRole('listitem', { name: 'a.png' });
    fireEvent.change(input, {
      target: { files: [new File(['bad'], 'broken.png')] },
    });
    await screen.findByText(converterMessages.zh.errors.corrupt);
    expect(within(row).getByRole('link', { name: '下载结果' })).toBe(old);
    const huge = new File(['x'], 'huge.png');
    Object.defineProperty(huge, 'size', { value: 21 * 1024 * 1024 });
    fireEvent.change(input, { target: { files: [huge] } });
    expect(
      screen.getByRole('list', { name: '文件任务' }).querySelectorAll('li'),
    ).toHaveLength(2);
    expect(within(row).getByRole('link', { name: '下载结果' })).toBe(old);
    await user.click(screen.getByRole('button', { name: '高级' }));
    fireEvent.change(input, {
      target: { files: [new File(['next'], 'appended.png')] },
    });
    const appended = await screen.findByRole('listitem', {
      name: 'appended.png',
    });
    await waitFor(() =>
      expect(within(appended).getByRole('status').textContent).toBe(
        converterMessages.zh.taskStatus.queued,
      ),
    );
    expect(within(row).getByRole('link', { name: '下载结果' })).toBe(old);
    await user.click(
      within(appended).getByRole('button', { name: '移除图片' }),
    );
    expect(screen.queryByRole('listitem', { name: 'appended.png' })).toBeNull();
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: '添加图片' }),
      ),
    );
  });
  it('keeps invalid quality drafts out of the session and synchronizes valid edits with the slider', async () => {
    const user = userEvent.setup();
    const { container } = render(<ImageConverter region="global" locale="en" />);
    await waitFor(() =>
      expect(
        screen.getByRole('radio', { name: /WEBP/ }).hasAttribute('disabled'),
      ).toBe(false),
    );
    fireEvent.change(container.querySelector('input[type=file]')!, {
      target: { files: [new File(['png'], 'art.png')] },
    });
    await screen.findByRole('link', { name: 'Download result' });
    await user.click(screen.getByRole('button', { name: 'Advanced' }));
    const input = screen.getByRole('textbox', {
      name: 'Exact quality (1–100)',
    }) as HTMLInputElement;
    expect(input.value).toBe('85');
    const update = vi.spyOn(ConverterSession.prototype, 'settings');
    try {
      for (const value of ['', '0', '101', '85.5', 'abc']) {
        fireEvent.change(input, { target: { value } });
        expect(input.value).toBe(value);
        expect(input.getAttribute('aria-invalid')).toBe('true');
        expect(screen.getByRole('slider').getAttribute('aria-valuenow')).toBe(
          '85',
        );
        expect(
          screen.queryByRole('link', { name: 'Download result' }),
        ).toBeNull();
        expect(
          screen
            .getByRole('button', { name: 'Convert all' })
            .hasAttribute('disabled'),
        ).toBe(true);
      }
      expect(update).not.toHaveBeenCalled();
      fireEvent.change(input, { target: { value: '86' } });
      expect(update).toHaveBeenLastCalledWith(
        expect.objectContaining({ quality: 86 }),
      );
      expect(input.hasAttribute('aria-invalid')).toBe(false);
      const slider = screen.getByRole('slider');
      expect(slider.getAttribute('aria-valuenow')).toBe('86');
      act(() => slider.focus());
      await user.keyboard('{ArrowRight}');
      expect(input.value).toBe('87');
      expect(update).toHaveBeenLastCalledWith(
        expect.objectContaining({ quality: 87 }),
      );
      expect(encode).toHaveBeenCalledTimes(1);
      expect(
        screen.queryByRole('link', { name: 'Download result' }),
      ).toBeNull();
      await user.click(screen.getByRole('button', { name: 'Convert all' }));
      const download = await screen.findByRole('link', {
        name: 'Download result',
      });
      const href = download.getAttribute('href');
      expect(encode).toHaveBeenCalledTimes(2);
      await user.click(screen.getByRole('button', { name: 'Quick' }));
      await user.click(screen.getByRole('button', { name: 'Advanced' }));
      expect(
        (
          screen.getByRole('textbox', {
            name: 'Exact quality (1–100)',
          }) as HTMLInputElement
        ).value,
      ).toBe('87');
      expect(
        screen
          .getByRole('link', { name: 'Download result' })
          .getAttribute('href'),
      ).toBe(href);
      expect(encode).toHaveBeenCalledTimes(2);
      await user.click(screen.getByRole('radio', { name: 'JPEG' }));
      expect(
        (
          screen.getByRole('textbox', {
            name: 'Exact quality (1–100)',
          }) as HTMLInputElement
        ).value,
      ).toBe('88');
      await user.click(screen.getByRole('radio', { name: 'PNG' }));
      expect(screen.queryByRole('slider')).toBeNull();
      expect(
        screen.queryByRole('textbox', { name: 'Exact quality (1–100)' }),
      ).toBeNull();
      await user.click(screen.getByRole('radio', { name: 'WEBP' }));
      expect(
        (
          screen.getByRole('textbox', {
            name: 'Exact quality (1–100)',
          }) as HTMLInputElement
        ).value,
      ).toBe('87');
      expect(encode).toHaveBeenCalledTimes(2);
    } finally {
      update.mockRestore();
    }
  });
  it.each(['cn', 'global'] as const)(
    'synchronizes JPEG hex and the native picker in %s while retaining invalid text and filename behavior',
    async (region) => {
      const user = userEvent.setup();
      const t = converterMessages[defaultLocale(region)];
      const { container } = render(<ImageConverter region={region} locale={defaultLocale(region)} />);
      await waitFor(() =>
        expect(
          screen.getByRole('radio', { name: /WEBP/ }).hasAttribute('disabled'),
        ).toBe(false),
      );
      await user.click(screen.getByRole('button', { name: t.advanced }));
      await user.click(screen.getByRole('radio', { name: 'JPEG' }));
      const hex = screen.getByRole('textbox', {
        name: t.background,
      }) as HTMLInputElement;
      const picker = screen.getByLabelText(
        t.pickBackground,
      ) as HTMLInputElement;
      expect(picker.type).toBe('color');
      expect(picker.value).toBe('#ffffff');
      fireEvent.change(hex, { target: { value: '#12AB34' } });
      expect(picker.value).toBe('#12ab34');
      fireEvent.change(container.querySelector('input[type=file]')!, {
        target: { files: [new File(['png'], 'art.png')] },
      });
      await waitFor(() =>
        expect(
          screen
            .getByRole('button', { name: t.generateAll })
            .hasAttribute('disabled'),
        ).toBe(false),
      );
      for (const value of ['#12', 'invalid', '']) {
        fireEvent.change(hex, { target: { value } });
        expect(hex.value).toBe(value);
        expect(hex.getAttribute('aria-invalid')).toBe('true');
        expect(screen.getByRole('alert').textContent).toBe(t.backgroundError);
        expect(picker.value).toBe('#12ab34');
        await user.click(screen.getByRole('button', { name: t.generateAll }));
        expect(encode).not.toHaveBeenCalled();
      }
      fireEvent.change(picker, { target: { value: '#456789' } });
      expect(hex.value).toBe('#456789');
      expect(hex.hasAttribute('aria-invalid')).toBe(false);
      await user.click(screen.getByRole('button', { name: t.generateAll }));
      const download = await screen.findByRole('link', { name: t.download });
      const href = download.getAttribute('href');
      expect(encode).toHaveBeenLastCalledWith(
        expect.anything(),
        expect.objectContaining({ jpegBackground: '#456789' }),
        expect.anything(),
        expect.objectContaining({ files: 50, bytes: 20 * 1024 ** 2 }),
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
      const filename = screen.getByRole('textbox', { name: t.filename });
      expect(
        document.getElementById(filename.getAttribute('aria-describedby')!)
          ?.textContent,
      ).toContain(t.filenameExample);
      const defaultName = download.getAttribute('download');
      await user.type(filename, 'renamed');
      expect(
        screen.getByRole('link', { name: t.download }).getAttribute('href'),
      ).toBe(href);
      expect(
        screen.getByRole('link', { name: t.download }).getAttribute('download'),
      ).toMatch(/^t4f-\d{8}-\d{9}-0001-renamed-art\.jpg$/);
      await user.clear(filename);
      expect(
        screen.getByRole('link', { name: t.download }).getAttribute('download'),
      ).toBe(defaultName);
      await user.type(filename, 'bad/name');
      expect(screen.getByText(t.filenameError)).toBeTruthy();
      expect(screen.queryByRole('link', { name: t.download })).toBeNull();
      expect(encode).toHaveBeenCalledTimes(1);
      expect(
        container.querySelector('[data-converter-part=settings] details'),
      ).toBeNull();
      await user.click(screen.getByRole('button', { name: t.restore }));
      expect(hex.value).toBe('#FFFFFF');
      expect(picker.value).toBe('#ffffff');
    },
  );
  it('keeps a stale result out of the dialog and download; preview errors also block download', async () => {
    const user = userEvent.setup();
    const { container, unmount } = render(<ImageConverter region="global" locale="en" />);
    await waitFor(() =>
      expect(
        screen.getByRole('radio', { name: /WEBP/ }).hasAttribute('disabled'),
      ).toBe(false),
    );
    fireEvent.change(container.querySelector('input[type=file]')!, {
      target: { files: [new File(['png'], 'art.png')] },
    });
    await screen.findByRole('link', { name: 'Download result' });
    await user.click(screen.getByRole('button', { name: 'Advanced' }));
    fireEvent.change(
      screen.getByRole('textbox', { name: 'Exact quality (1–100)' }),
      { target: { value: '90' } },
    );
    expect(screen.queryByRole('link', { name: 'Download result' })).toBeNull();
    expect(
      screen
        .getByRole('list', { name: 'File tasks' })
        .querySelector('[data-task-status]')
        ?.getAttribute('data-task-status'),
    ).toBe('stale');
    await user.click(screen.getByRole('button', { name: 'Image preview' }));
    expect(await screen.findByRole('img', { name: 'Original' })).toBeTruthy();
    expect(screen.queryByRole('img', { name: 'Output' })).toBeNull();
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'Convert all' }));
    await screen.findByRole('link', { name: 'Download result' });
    await user.click(screen.getByRole('button', { name: 'Image preview' }));
    await user.click(screen.getByRole('button', { name: 'Output' }));
    fireEvent.error(await screen.findByRole('img', { name: 'Output' }));
    expect(
      within(screen.getByRole('dialog')).getByRole('alert').textContent,
    ).toBe(converterMessages.en.viewer.error);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('link', { name: 'Download result' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Image preview' }));
    await user.click(screen.getByRole('button', { name: 'Output' }));
    fireEvent.load(await screen.findByRole('img', { name: 'Output' }));
    await user.keyboard('{Escape}');
    expect(screen.getByRole('link', { name: 'Download result' })).toBeTruthy();
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(
      vi.mocked(URL.createObjectURL).mock.calls.length,
    );
  });
  it('recovers via a row retry and ignores a conversion completed after removal', async () => {
    const user = userEvent.setup();
    const { container } = render(<ImageConverter region="global" locale="en" />);
    await waitFor(() =>
      expect(
        screen.getByRole('radio', { name: /WEBP/ }).hasAttribute('disabled'),
      ).toBe(false),
    );
    encode.mockRejectedValueOnce(new ImageFailure('encode'));
    fireEvent.change(container.querySelector('input[type=file]')!, {
      target: { files: [new File(['png'], 'art.png')] },
    });
    await screen.findByText(converterMessages.en.errors.encode);
    const row = screen.getByRole('listitem', { name: 'art.png' });
    expect(within(row).getByRole('status').textContent).toBe('Failed');
    let finish!: (blob: Blob) => void;
    encode.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    await user.click(
      within(row).getByRole('button', { name: 'Retry current settings' }),
    );
    expect(within(row).getByRole('status').textContent).toBe('Processing');
    await user.click(within(row).getByRole('button', { name: 'Remove image' }));
    await act(async () =>
      finish(new Blob(['obsolete'], { type: 'image/webp' })),
    );
    expect(screen.queryByRole('list', { name: 'File tasks' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Download result' })).toBeNull();
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
  });
  it('keeps Quick same-format bytes and shares the download URL in its on-demand preview', async () => {
    const user = userEvent.setup();
    const { container, unmount } = render(<ImageConverter region="global" locale="en" />);
    await waitFor(() =>
      expect(
        screen.getByRole('radio', { name: /WEBP/ }).hasAttribute('disabled'),
      ).toBe(false),
    );
    await user.click(screen.getByRole('radio', { name: 'PNG' }));
    const file = new File(['original bytes'], 'art.png', { type: 'image/png' });
    fireEvent.change(container.querySelector('input[type=file]')!, {
      target: { files: [file] },
    });
    const download = await screen.findByRole('link', {
      name: 'Download original',
    });
    expect(encode).not.toHaveBeenCalled();
    expect(URL.createObjectURL).toHaveBeenCalledWith(file);
    await user.click(screen.getByRole('button', { name: 'Image preview' }));
    expect(
      (await screen.findByRole('img', { name: 'Original' })).getAttribute(
        'src',
      ),
    ).toBe(download.getAttribute('href'));
    await user.click(screen.getByRole('button', { name: 'Output' }));
    expect(
      screen.getByRole('img', { name: 'Output' }).getAttribute('src'),
    ).toBe(download.getAttribute('href'));
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
  });
  it('imports a recursive folder in path order, skips unsupported files and permits repeated names', async () => {
    const user = userEvent.setup();
    const { container } = render(<ImageConverter region="global" locale="en" />);
    await waitFor(() =>
      expect(
        screen.getByRole('radio', { name: /WEBP/ }).hasAttribute('disabled'),
      ).toBe(false),
    );
    await user.click(screen.getByRole('button', { name: 'Advanced' }));
    expect(
      container.querySelector('#converter-source')?.hasAttribute('multiple'),
    ).toBe(true);
    const folder = container.querySelector('#converter-folder')!;
    expect(folder.hasAttribute('webkitdirectory')).toBe(true);
    const nested = (name: string, path: string) => {
      const value = new File(['image'], name);
      Object.defineProperty(value, 'webkitRelativePath', { value: path });
      return value;
    };
    fireEvent.change(folder, {
      target: {
        files: [
          nested('z.png', 'root/z.png'),
          nested('same.png', 'root/b/same.png'),
          nested('notes.txt', 'root/notes.txt'),
          nested('same.png', 'root/a/same.png'),
        ],
      },
    });
    const list = await screen.findByRole('list', { name: 'File tasks' });
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((row) => row.getAttribute('aria-labelledby'))
        .every(Boolean),
    ).toBe(true);
    const rows = within(list).getAllByRole('listitem');
    expect(
      rows.map((row) => row.querySelector('[title]')?.getAttribute('title')),
    ).toEqual(['same.png', 'same.png', 'z.png']);
    await waitFor(() =>
      expect(
        within(list)
          .getAllByRole('status')
          .every((status) => status.textContent === 'Queued'),
      ).toBe(true),
    );
    expect(encode).not.toHaveBeenCalled();
    expect(screen.getByText(/unsupported type × 1/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Convert all' }));
    await waitFor(() =>
      expect(
        within(list).getAllByRole('link', { name: 'Download result' }),
      ).toHaveLength(3),
    );
    rows.forEach((row, index) =>
      expect(within(row).getByRole('link').getAttribute('download')).toContain(
        `-000${index + 1}-`,
      ),
    );
    fireEvent.change(container.querySelector('#converter-source')!, {
      target: { files: [new File(['next'], 'same.png')] },
    });
    await waitFor(() =>
      expect(within(list).getAllByRole('listitem')).toHaveLength(4),
    );
    expect(
      within(list).getAllByRole('link', { name: 'Download result' }),
    ).toHaveLength(3);
    expect(encode).toHaveBeenCalledTimes(3);
    expect(
      screen.queryByRole('button', { name: 'Clear filename label' }),
    ).toBeNull();
    expect(screen.queryByText(/Recommended settings/)).toBeNull();
  });
  it('leaves other downloads enabled during append/processing/removal and rejects late removed output', async () => {
    const user = userEvent.setup();
    const { container, unmount } = render(<ImageConverter region="global" locale="en" />);
    await waitFor(() =>
      expect(
        screen.getByRole('radio', { name: /WEBP/ }).hasAttribute('disabled'),
      ).toBe(false),
    );
    const input = container.querySelector('#converter-source')!;
    fireEvent.change(input, {
      target: { files: [new File(['first'], 'first.png')] },
    });
    const first = await screen.findByRole('link', { name: 'Download result' });
    const href = first.getAttribute('href');
    let finish!: (blob: Blob) => void;
    encode.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    fireEvent.change(input, {
      target: { files: [new File(['second'], 'second.png')] },
    });
    const row = await screen.findByRole('listitem', { name: 'second.png' });
    await waitFor(() =>
      expect(within(row).getByRole('status').textContent).toBe('Processing'),
    );
    expect(first.getAttribute('href')).toBe(href);
    expect(first.isConnected).toBe(true);
    await user.click(within(row).getByRole('button', { name: 'Remove image' }));
    await act(async () => finish(new Blob(['late'], { type: 'image/webp' })));
    expect(screen.queryByRole('listitem', { name: 'second.png' })).toBeNull();
    expect(
      screen
        .getByRole('link', { name: 'Download result' })
        .getAttribute('href'),
    ).toBe(href);
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(
      vi.mocked(URL.createObjectURL).mock.calls.length,
    );
  });
  it('retries only the failed row while another completed download remains valid', async () => {
    const user = userEvent.setup();
    encode.mockRejectedValueOnce(new ImageFailure('encode'));
    const { container } = render(<ImageConverter region="global" locale="en" />);
    await waitFor(() =>
      expect(
        screen.getByRole('radio', { name: /WEBP/ }).hasAttribute('disabled'),
      ).toBe(false),
    );
    fireEvent.change(container.querySelector('#converter-source')!, {
      target: { files: [new File(['a'], 'a.png'), new File(['b'], 'b.png')] },
    });
    const failed = await screen.findByRole('listitem', { name: 'a.png' });
    const ready = screen.getByRole('listitem', { name: 'b.png' });
    const download = await within(ready).findByRole('link', {
      name: 'Download result',
    });
    const href = download.getAttribute('href');
    await user.click(
      within(failed).getByRole('button', { name: 'Retry current settings' }),
    );
    await within(failed).findByRole('link', { name: 'Download result' });
    expect(within(ready).getByRole('link').getAttribute('href')).toBe(href);
    expect(encode).toHaveBeenCalledTimes(3);
  });
  it('previews the selected task and restores focus to its row or the add entry when removed', async () => {
    const user = userEvent.setup();
    const added = vi.spyOn(ConverterSession.prototype, 'add');
    try {
      const { container, unmount } = render(<ImageConverter region="global" locale="en" />);
      await waitFor(() =>
        expect(
          screen.getByRole('radio', { name: /WEBP/ }).hasAttribute('disabled'),
        ).toBe(false),
      );
      fireEvent.change(container.querySelector('#converter-source')!, {
        target: { files: [new File(['a'], 'a.png'), new File(['b'], 'b.png')] },
      });
      await waitFor(() =>
        expect(
          screen.getAllByRole('link', { name: 'Download result' }),
        ).toHaveLength(2),
      );
      const row = screen.getByRole('listitem', { name: 'b.png' });
      const original = row
        .querySelector('[data-image-thumbnail] img')
        ?.getAttribute('src');
      const output = within(row).getByRole('link').getAttribute('href');
      const trigger = within(row).getByRole('button', {
        name: 'Image preview',
      });
      await user.click(trigger);
      expect(
        screen.getByRole('img', { name: 'Original' }).getAttribute('src'),
      ).toBe(original);
      await user.click(screen.getByRole('button', { name: 'Output' }));
      expect(
        screen.getByRole('img', { name: 'Output' }).getAttribute('src'),
      ).toBe(output);
      await user.keyboard('{Escape}');
      await waitFor(() => expect(document.activeElement).toBe(trigger));
      await user.click(trigger);
      const session = added.mock.contexts[0] as ConverterSession;
      act(() => session.remove(session.snapshot.tasks[1].id));
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
      await waitFor(() =>
        expect(document.activeElement).toBe(
          screen.getByRole('button', { name: 'Add images' }),
        ),
      );
      expect(screen.getByRole('listitem', { name: 'a.png' })).toBeTruthy();
      unmount();
      expect(URL.revokeObjectURL).toHaveBeenCalledTimes(
        vi.mocked(URL.createObjectURL).mock.calls.length,
      );
    } finally {
      added.mockRestore();
    }
  });
  it('confirms clearing, releases every row URL and starts the next intake with a new batch and sequence 0001', async () => {
    const user = userEvent.setup();
    const { container } = render(<ImageConverter region="global" locale="en" />);
    await waitFor(() =>
      expect(
        screen.getByRole('radio', { name: /WEBP/ }).hasAttribute('disabled'),
      ).toBe(false),
    );
    const input = container.querySelector('#converter-source')!;
    fireEvent.change(input, {
      target: { files: [new File(['a'], 'a.png'), new File(['b'], 'b.png')] },
    });
    await waitFor(() =>
      expect(
        screen.getAllByRole('link', { name: 'Download result' }),
      ).toHaveLength(2),
    );
    const oldId = screen
      .getByRole('listitem', { name: 'a.png' })
      .getAttribute('data-task-id');
    await user.click(screen.getByRole('button', { name: 'Clear list' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(
      screen.getAllByRole('link', { name: 'Download result' }),
    ).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Clear list' }));
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.queryByRole('list', { name: 'File tasks' })).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(
      vi.mocked(URL.createObjectURL).mock.calls.length,
    );
    fireEvent.change(input, { target: { files: [new File(['a'], 'a.png')] } });
    const download = await screen.findByRole('link', {
      name: 'Download result',
    });
    expect(download.getAttribute('download')).toMatch(/-0001-a\.webp$/);
    expect(
      screen
        .getByRole('listitem', { name: 'a.png' })
        .getAttribute('data-task-id'),
    ).not.toBe(oldId);
  });
  it('only exposes ownership diagnostics for an explicit development debug URL', async () => {
    const original = window.location.href;
    try {
      window.history.replaceState({}, '', '/tools/image-converter/');
      const normal = render(<ImageConverter region="global" locale="en" />);
      await waitFor(() =>
        expect(
          screen.getByRole('radio', { name: /WEBP/ }).hasAttribute('disabled'),
        ).toBe(false),
      );
      expect(
        normal.container.querySelector('[data-converter-diagnostics]'),
      ).toBeNull();
      normal.unmount();
      window.history.replaceState({}, '', '?debug=1');
      const debug = render(<ImageConverter region="global" locale="en" />);
      await waitFor(() =>
        expect(
          debug.container.querySelector('[data-converter-diagnostics]'),
        ).toBeTruthy(),
      );
      debug.unmount();
      vi.stubEnv('DEV', false);
      const production = render(<ImageConverter region="global" locale="en" />);
      await waitFor(() =>
        expect(
          screen.getByRole('radio', { name: /WEBP/ }).hasAttribute('disabled'),
        ).toBe(false),
      );
      expect(
        production.container.querySelector('[data-converter-diagnostics]'),
      ).toBeNull();
    } finally {
      vi.unstubAllEnvs();
      window.history.replaceState({}, '', original);
    }
  });
  it('uses the accepted content and tool route in both regional builds and DEV', () => {
    for (const region of ['cn', 'global'] as const) {
      expect(getAvailableTools(region, false)).toEqual(getAvailableTools(region, true).filter(tool => tool.status === 'published'));
      expect(getAvailableTools(region, true).map((tool) => tool.slug)).toEqual([
        'image-converter', 'image-resize-crop', 'palette-extractor',
      ]);
      expect(getPublishedTools(region).map(tool => tool.id)).toEqual(['image-converter', 'image-resize-crop']);
      const content = toolPageContents['image-converter'][defaultLocale(region)]!;
      expect(content.h1).toBeTruthy();
      expect(content.steps?.length).toBe(4);
      expect(content.faq?.length).toBe(6);
      expect(content.title.match(/Tool4Furry/g)).toHaveLength(1);
    }
  });
});
