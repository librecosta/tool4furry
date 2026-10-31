import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ImageResizeCrop from '../src/tools/image-resize-crop/ImageResizeCrop';
import { setViewport } from './setup';
import { UiProvider } from '../src/ui/UiProvider';
import { messages } from '../src/i18n/messages';
const { load, encode } = vi.hoisted(() => ({ load: vi.fn(), encode: vi.fn() }));
vi.mock('../src/tools/image-resize-crop/render', () => ({
  loadSource: load,
  previewSource: async () => new Blob(['preview']),
  renderCrop: encode,
}));
vi.mock('../src/tools/image/browser-codec', () => ({
  acceptImage: async (file: File) => (await load(file)).source,
  detectCapabilities: async () => ({
    png: { supported: true },
    jpeg: { supported: true },
    webp: { supported: true },
    avif: { supported: false },
  }),
}));
beforeEach(() => {
  setViewport(false);
  load.mockReset().mockImplementation(async (file: File) => ({
    source: {
      file,
      blob: file,
      width: 1200,
      height: 800,
      info: {
        format: file.name.endsWith('avif') ? 'avif' : 'png',
        width: 1200,
        height: 800,
        orientation: 1,
      },
    },
    preview: new Blob(['preview']),
  }));
  encode
    .mockReset()
    .mockResolvedValue(new Blob(['output'], { type: 'image/png' }));
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  let n = 0;
  vi.stubGlobal(
    'URL',
    class extends URL {
      static createObjectURL = vi.fn(() => `blob:test-${++n}`);
      static revokeObjectURL = vi.fn();
    },
  );
});
async function mount(name = 'source.png') {
  const user = userEvent.setup();
  const mounted = render(
    <UiProvider labels={messages.en}>
      <ImageResizeCrop region="global" locale="en" />
    </UiProvider>,
  );
  const input = mounted.container.querySelector(
    'input[type="file"]',
  ) as HTMLInputElement;
  await waitFor(() => expect(input.disabled).toBe(false));
  await user.upload(
    input,
    new File(['source'], name, {
      type: name.endsWith('avif') ? 'image/avif' : 'image/png',
    }),
  );
  await screen.findByRole('textbox', { name: 'Width (pixels)' });
  return { user, ...mounted };
}
async function selectFile(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
) {
  await user.click(screen.getByRole('combobox', { name: 'Current image' }));
  await user.click(await screen.findByRole('option', { name }));
}
describe('single image UI wiring (mocked codecs; not layout/browser evidence)', () => {
  it('keeps disclosures closed and legal notice distributed without a visible license link', async () => {
    const { container } = await mount();
    expect(
      screen.getByText('Supported formats and limits').closest('details')!.open,
    ).toBe(false);
    expect(
      screen.getByText('Show composition preview').closest('details')!.open,
    ).toBe(false);
    expect(container.querySelector('a[href*="crop.NOTICE"]')).toBeNull();
    expect(
      document.querySelector('link[rel="license"]')?.getAttribute('href'),
    ).toContain('crop.NOTICE.txt');
    expect(screen.queryByRole('textbox', { name: 'Scale (%)' })).toBeNull();
    expect(
      screen.getAllByRole('button', { name: 'Replace image' }),
    ).toHaveLength(1);
    expect(
      screen.getAllByRole('button', { name: 'Remove image' }),
    ).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Export image' })).toBeNull();
  });
  it('preserves advanced export settings and verified results through quick/advanced changes and renaming', async () => {
    const { user } = await mount();
    await user.click(screen.getByRole('radio', { name: 'JPEG' }));
    await user.click(screen.getByRole('button', { name: 'Advanced' }));
    const background = screen.getByRole('textbox', { name: 'JPEG background' });
    await user.clear(background);
    await user.type(background, '#123456{Enter}');
    await user.click(screen.getByRole('button', { name: 'Quick' }));
    expect(
      screen.getByText('Using your adjusted export settings'),
    ).toBeDefined();
    await user.click(screen.getByRole('button', { name: 'Download image' }));
    await screen.findByText('Downloaded');
    expect(encode.mock.calls[0]?.[2]).toMatchObject({
      format: 'jpeg',
      background: '#123456',
      quality: 85,
    });
    await user.click(screen.getByRole('button', { name: 'Advanced' }));
    expect(
      (
        screen.getByRole('textbox', {
          name: 'JPEG background',
        }) as HTMLInputElement
      ).value,
    ).toBe('#123456');
    await user.type(
      screen.getByRole('textbox', { name: 'Filename label (optional)' }),
      'renamed',
    );
    await user.click(screen.getByRole('button', { name: 'Quick' }));
    expect(screen.getByText('Downloaded')).toBeDefined();
    await user.click(screen.getByRole('button', { name: 'Download image' }));
    expect(encode).toHaveBeenCalledOnce();
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(2);
  });
  it('commits both unlocked dimensions together when focus leaves the group', async () => {
    const { user } = await mount();
    await user.click(screen.getByRole('button', { name: 'Advanced' }));
    await user.click(
      screen.getByRole('checkbox', { name: 'Keep aspect ratio' }),
    );
    const width = screen.getByRole('textbox', { name: 'Width (pixels)' });
    const height = screen.getByRole('textbox', { name: 'Height (pixels)' });
    await user.clear(width);
    await user.type(width, '300');
    await user.clear(height);
    await user.type(height, '200');
    expect(
      screen.getAllByText(/1200 × 800/, { selector: 'span' }),
    ).toHaveLength(3);
    await user.click(screen.getByRole('button', { name: 'Download image' }));
    await screen.findByText('Downloaded');
    expect(encode.mock.calls[0]?.[2]).toMatchObject({
      width: 300,
      height: 200,
    });
  });
  it('explains hidden invalid advanced input in quick mode', async () => {
    const { user } = await mount();
    await user.click(screen.getByRole('button', { name: 'Advanced' }));
    await user.type(
      screen.getByRole('textbox', { name: 'Filename label (optional)' }),
      '/',
    );
    await user.click(screen.getByRole('button', { name: 'Quick' }));
    expect(screen.getByRole('alert').textContent).toContain('Advanced');
    expect(
      screen
        .getByRole('button', { name: 'Download image' })
        .hasAttribute('disabled'),
    ).toBe(true);
  });
  it('retains a temporary JPEG color without blocking a PNG download', async () => {
    const { user } = await mount();
    await user.click(screen.getByRole('radio', { name: 'JPEG' }));
    await user.click(screen.getByRole('button', { name: 'Advanced' }));
    const background = screen.getByRole('textbox', { name: 'JPEG background' });
    await user.clear(background);
    await user.type(background, '#12');
    await user.click(screen.getByRole('radio', { name: 'PNG' }));
    await user.click(screen.getByRole('button', { name: 'Quick' }));
    expect(screen.queryByRole('alert')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Download image' }));
    await screen.findByText('Downloaded');
    expect(encode.mock.calls[0]?.[2]).toMatchObject({
      format: 'png',
      background: '#FFFFFF',
    });
    await user.click(screen.getByRole('button', { name: 'Advanced' }));
    await user.click(screen.getByRole('radio', { name: 'JPEG' }));
    expect(
      (
        screen.getByRole('textbox', {
          name: 'JPEG background',
        }) as HTMLInputElement
      ).value,
    ).toBe('#12');
    expect(screen.getByRole('alert').textContent).toContain('#RRGGBB');
  });
  it.each(['edit', 'workflow', 'unmount'] as const)(
    'does not auto-download a late result after %s',
    async (action) => {
      let resolve!: (blob: Blob) => void;
      encode.mockImplementationOnce(
        () =>
          new Promise<Blob>((done) => {
            resolve = done;
          }),
      );
      const { user, unmount } = await mount();
      await user.click(screen.getByRole('button', { name: 'Download image' }));
      await waitFor(() => expect(encode).toHaveBeenCalledOnce());
      if (action === 'edit') {
        const width = screen.getByRole('textbox', { name: 'Width (pixels)' });
        await user.clear(width);
        await user.type(width, '400{Enter}');
      }
      if (action === 'workflow')
        await user.click(screen.getByRole('button', { name: 'Batch resize' }));
      if (action === 'unmount') unmount();
      await act(async () => {
        resolve(new Blob(['late'], { type: 'image/png' }));
      });
      expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled();
    },
  );
  it('shows encoding failure and retries through the same download action', async () => {
    encode.mockRejectedValueOnce(new Error('encode'));
    const { user } = await mount();
    await user.click(screen.getByRole('button', { name: 'Download image' }));
    await screen.findByRole('alert');
    expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Retry download' }));
    await screen.findByText('Downloaded');
    expect(encode).toHaveBeenCalledTimes(2);
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledOnce();
  });
  it('imports multiple files into batch, runs explicitly, and preserves single drafts through mode/selection changes', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <UiProvider labels={messages.en}>
        <ImageResizeCrop region="global" locale="en" />
      </UiProvider>,
    );
    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    await waitFor(() => expect(input.disabled).toBe(false));
    await user.upload(input, [
      new File(['a'], 'a.png', { type: 'image/png' }),
      new File(['b'], 'b.png', { type: 'image/png' }),
    ]);
    const batch = await screen.findByRole('region', { name: 'Batch resize' });
    expect(encode).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Download ZIP' })).toBeNull();
    await user.click(screen.getByRole('radio', { name: 'JPEG' }));
    await user.click(screen.getByRole('button', { name: 'Advanced' }));
    const background = screen.getByRole('textbox', { name: 'JPEG background' });
    await user.clear(background);
    await user.type(background, '#abcdef{Enter}');
    await user.click(screen.getByRole('button', { name: 'Quick' }));
    const target = screen.getByRole('textbox', { name: 'Target pixels' });
    await user.clear(target);
    await user.type(target, '600');
    await waitFor(() =>
      expect(
        within(batch)
          .getByRole('button', { name: 'Start processing' })
          .hasAttribute('disabled'),
      ).toBe(false),
    );
    await user.click(
      within(batch).getByRole('button', { name: 'Start processing' }),
    );
    await waitFor(() => expect(encode).toHaveBeenCalledTimes(2));
    for (const call of encode.mock.calls)
      expect(call[2]).toMatchObject({
        width: 600,
        height: 400,
        format: 'jpeg',
        background: '#abcdef',
      });
    await user.click(screen.getByRole('button', { name: 'Advanced' }));
    expect(
      (
        screen.getByRole('textbox', {
          name: 'JPEG background',
        }) as HTMLInputElement
      ).value,
    ).toBe('#abcdef');
    expect(
      within(batch)
        .getAllByRole('button', { name: /^Download image:/ })
        .every((button) => !button.hasAttribute('disabled')),
    ).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Single image' }));
    const width = await screen.findByRole('textbox', {
      name: 'Width (pixels)',
    });
    await user.clear(width);
    await user.type(width, '400');
    await user.keyboard('{Enter}');
    await selectFile(user, 'b.png');
    expect(
      (
        screen.getByRole('textbox', {
          name: 'Width (pixels)',
        }) as HTMLInputElement
      ).value,
    ).toBe('1200');
    await user.click(screen.getByRole('button', { name: 'Batch resize' }));
    expect(
      screen
        .getByRole('button', { name: 'Advanced' })
        .getAttribute('aria-pressed'),
    ).toBe('true');
    expect(
      screen
        .getByRole('button', { name: 'Download ZIP' })
        .hasAttribute('disabled'),
    ).toBe(false);
    await user.click(screen.getByRole('button', { name: 'Single image' }));
    await selectFile(user, 'a.png');
    expect(
      (
        screen.getByRole('textbox', {
          name: 'Width (pixels)',
        }) as HTMLInputElement
      ).value,
    ).toBe('400');
    await user.upload(input, new File(['c'], 'c.png', { type: 'image/png' }));
    expect(screen.queryByRole('region', { name: 'Batch resize' })).toBeNull();
    expect(
      screen.getByRole('combobox', { name: 'Current image' }).textContent,
    ).toContain('a.png');
  });
  it('keeps incomplete input out of processing state until a valid explicit submission', async () => {
    const { user } = await mount();
    const width = screen.getByRole('textbox', { name: 'Width (pixels)' });
    await user.clear(width);
    await user.type(width, '-');
    await user.keyboard('{Enter}');
    expect(screen.getByRole('alert').textContent).toContain('whole numbers');
    await user.click(screen.getByRole('button', { name: 'Download image' }));
    expect(encode).not.toHaveBeenCalled();
    await user.clear(width);
    await user.type(width, '600');
    await user.keyboard('{Enter}');
    expect(
      (
        screen.getByRole('textbox', {
          name: 'Height (pixels)',
        }) as HTMLInputElement
      ).value,
    ).toBe('400');
    await user.click(screen.getByRole('button', { name: 'Download image' }));
    await screen.findByText('Downloaded');
    expect(encode).toHaveBeenCalledOnce();
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledOnce();
    expect(encode.mock.calls[0]?.[2]).toMatchObject({
      width: 600,
      height: 400,
    });
  });
  it('protects the active draft on replacement cancellation and releases preview URLs on clear/unmount', async () => {
    const { user, unmount } = await mount();
    await user.click(screen.getByRole('button', { name: 'Replace image' }));
    const dialog = screen.getByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(load).toHaveBeenCalledOnce();
    await user.click(screen.getByRole('button', { name: 'Remove image' }));
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'Remove image',
      }),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole('textbox', { name: 'Width (pixels)' }),
      ).toBeNull(),
    );
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Choose images or drop them here' }),
    );
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-1');
    unmount();
  });
  it('exposes keyboard handles, keeps state on responsive signals and explains AVIF output choices', async () => {
    const { user, container } = await mount('source.avif');
    expect(screen.getByText('Save AVIF as PNG, JPEG or WebP.')).toBeDefined();
    expect(
      screen.getByRole('button', { name: 'Bottom-right handle' }),
    ).toBeDefined();
    const width = screen.getByRole('textbox', { name: 'Width (pixels)' });
    await user.clear(width);
    await user.type(width, '500');
    await user.keyboard('{Enter}');
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    expect((width as HTMLInputElement).value).toBe('500');
    expect(load).toHaveBeenCalledOnce();
    expect(container.querySelector('[data-workbench="form"]')).not.toBeNull();
    expect(container.querySelector('[data-canvas-viewport]')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Advanced' }));
    fireEvent.change(
      screen.getByRole('textbox', { name: 'Filename label (optional)' }),
      { target: { value: 'renamed' } },
    );
    expect(encode).not.toHaveBeenCalled();
  });
});
