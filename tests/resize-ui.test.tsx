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
  const preview = mounted.container.querySelector<HTMLImageElement>('[data-crop-workspace] > img[hidden]');
  if (preview) {
    Object.defineProperties(preview, {naturalWidth: {value: 1200}, naturalHeight: {value: 800}});
    fireEvent.load(preview);
  }
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
  it('imports nested folder files in stable order, reports invalid files and appends without losing a single draft', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'webkitdirectory');
    Object.defineProperty(HTMLInputElement.prototype, 'webkitdirectory', {configurable: true, value: false});
    try {
      const user = userEvent.setup();
      const {container} = render(
        <UiProvider labels={messages.en}>
          <ImageResizeCrop region="global" locale="en" />
        </UiProvider>,
      );
      const folder = container.querySelector<HTMLInputElement>('#resize-folder')!;
      const addFolder = screen.getByRole('button', {name: 'Add folder'});
      await waitFor(() => expect(addFolder.hasAttribute('disabled')).toBe(false));
      expect(folder.hasAttribute('webkitdirectory')).toBe(true);
      expect(folder.multiple).toBe(true);
      const folderFile = (path: string, type = 'image/png') => {
        const file = new File(['source'], path.split('/').at(-1)!, {type});
        Object.defineProperty(file, 'webkitRelativePath', {value: path});
        return file;
      };
      fireEvent.change(folder, {target: {files: [
        folderFile('images/z.png'),
        folderFile('images/b/same.png'),
        folderFile('images/notes.txt', 'text/plain'),
        folderFile('images/a/same.png'),
      ]}});
      await screen.findByRole('region', {name: 'Batch resize'});
      await waitFor(() => expect(load).toHaveBeenCalledTimes(3));
      expect(load.mock.calls.map(([file]) => file.webkitRelativePath)).toEqual([
        'images/a/same.png', 'images/b/same.png', 'images/z.png',
      ]);
      expect(screen.getAllByRole('listitem', {name: 'same.png'})).toHaveLength(2);
      expect(screen.getByRole('alert').textContent).toContain('Unsupported format × 1');
      expect(encode).not.toHaveBeenCalled();
      expect(folder.value).toBe('');
      await user.click(screen.getByRole('button', {name: 'Single image'}));
      const width = await screen.findByRole('textbox', {name: 'Width (pixels)'});
      await user.clear(width);
      await user.type(width, '400{Enter}');
      fireEvent.change(folder, {target: {files: [folderFile('more/first.png'), folderFile('more/second.png')]}});
      await waitFor(() => expect(load).toHaveBeenCalledTimes(5));
      expect(screen.queryByRole('region', {name: 'Batch resize'})).toBeNull();
      expect((width as HTMLInputElement).value).toBe('400');
      expect(screen.getByRole('combobox', {name: 'Current image'}).textContent).toContain('same.png');
      expect(folder.value).toBe('');
    } finally {
      if (descriptor) Object.defineProperty(HTMLInputElement.prototype, 'webkitdirectory', descriptor);
      else Reflect.deleteProperty(HTMLInputElement.prototype, 'webkitdirectory');
    }
  });
  it('disables folder intake with an accessible fallback in an unsupported browser', async () => {
    render(<UiProvider labels={messages.en}><ImageResizeCrop region="global" locale="en" /></UiProvider>);
    const folder = screen.getByRole('button', {name: 'Add folder'});
    await waitFor(() => expect(folder.hasAttribute('disabled')).toBe(true));
    expect(document.getElementById(folder.getAttribute('aria-describedby')!)?.textContent).toContain('Use Add images instead.');
    expect(screen.getByRole('button', {name: 'Choose images or drop them here'}).hasAttribute('disabled')).toBe(false);
  });
  it('exposes aspect and batch rules as separate keyboard-operable radio groups', async () => {
    const { user } = await mount();
    const aspects = screen.getByRole('group', {name: 'Crop aspect ratio'});
    expect(within(aspects).getAllByRole('radio')).toHaveLength(6);
    expect(screen.queryByRole('combobox', {name: 'Crop aspect ratio'})).toBeNull();
    await user.click(within(aspects).getByRole('radio', {name: '1:1'}));
    expect((screen.getByRole('textbox', {name: 'Width (pixels)'}) as HTMLInputElement).value).toBe('800');
    expect((screen.getByRole('textbox', {name: 'Height (pixels)'}) as HTMLInputElement).value).toBe('800');
    await user.keyboard('{ArrowRight}');
    expect((within(aspects).getByRole('radio', {name: '4:3'}) as HTMLInputElement).checked).toBe(true);
    await user.click(screen.getByRole('button', {name: 'Advanced'}));
    expect((within(aspects).getByRole('radio', {name: '4:3'}) as HTMLInputElement).checked).toBe(true);
    await user.click(screen.getByRole('button', {name: 'Batch resize'}));
    const rules = screen.getByRole('group', {name: 'Resize method'});
    expect(within(rules).getAllByRole('radio')).toHaveLength(4);
    expect(screen.queryByRole('combobox', {name: 'Resize method'})).toBeNull();
    expect((within(rules).getByRole('radio', {name: 'Longest edge'}) as HTMLInputElement).checked).toBe(true);
    await user.click(within(rules).getByRole('radio', {name: 'Percentage'}));
    const percent = screen.getByRole('textbox', {name: 'Scale (%)'});
    await user.clear(percent);
    await user.type(percent, '50{Enter}');
    await user.click(screen.getByRole('button', {name: 'Start processing'}));
    await waitFor(() => expect(encode).toHaveBeenCalledOnce());
    expect(encode.mock.calls[0]?.[1]).toEqual({x: 0, y: 0, width: 1200, height: 800});
    expect(encode.mock.calls[0]?.[2]).toMatchObject({width: 600, height: 400});
  });
  it('starts in crop view and shows composition in the same workspace on request', async () => {
    const { user, container } = await mount();
    expect(
      screen.getByText('Supported formats and limits').closest('details')!.open,
    ).toBe(false);
    expect(screen.getByRole('button', {name: 'Crop'}).getAttribute('aria-pressed')).toBe('true');
    expect(screen.queryByRole('img', { name: 'Composition' })).toBeNull();
    await user.click(screen.getByRole('button', {name: 'Preview'}));
    expect(screen.getByRole('img', { name: 'Composition' }).tagName).toBe('CANVAS');
    expect(screen.getByText('Composition preview, not the final encoded output.').closest('details')).toBeNull();
    expect(container.querySelectorAll('[data-crop-viewport]')).toHaveLength(1);
    await user.click(screen.getByRole('button', {name: 'Crop'}));
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
  it('previews source and composition before export, actual output after export, and releases invalid results', async () => {
    const { user, unmount } = await mount();
    const trigger = screen.getByRole('button', { name: 'Image preview' });
    await user.click(trigger);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('img', { name: 'Original' })).toBeDefined();
    expect(within(dialog).getByRole('button', { name: 'Compare' }).hasAttribute('disabled')).toBe(true);
    await user.click(within(dialog).getByRole('button', { name: 'Composition' }));
    expect(within(dialog).getByText('Composition preview, not the final encoded output.')).toBeDefined();
    expect(encode).not.toHaveBeenCalled();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    await user.click(screen.getByRole('button', { name: 'Download image' }));
    await screen.findByText('Downloaded');
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Compare' }));
    const output = screen.getByRole('img', { name: 'Output' }).getAttribute('src');
    expect(screen.getByRole('img', { name: 'Original' })).toBeDefined();
    await user.keyboard('{Escape}');
    const width = screen.getByRole('textbox', { name: 'Width (pixels)' });
    fireEvent.change(width, { target: {value: '400'} });
    await user.type(width, '{Enter}');
    await user.click(trigger);
    expect(screen.queryByRole('img', { name: 'Output' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Compare' }).hasAttribute('disabled')).toBe(true);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(output);
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(vi.mocked(URL.createObjectURL).mock.calls.length);
  });
  it('shows per-file original/result thumbnails, previews the right batch file, and clears invalid output URLs', async () => {
    const { user, container, unmount } = await mount('a.png');
    await user.upload(container.querySelector('input[type=file]')!, new File(['b'], 'b.png', {type: 'image/png'}));
    await user.click(screen.getByRole('button', {name: 'Batch resize'}));
    const row = screen.getByRole('listitem', {name: 'b.png'});
    await waitFor(() => expect(row.querySelector('[data-thumbnail-kind="source"] img')).not.toBeNull());
    expect(row.querySelector('[data-thumbnail-kind="output"]')).toBeNull();
    expect(screen.getByRole('checkbox', {name: "Don't upscale images"}).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByText('Keep the original pixel dimensions when the target is larger.')).toBeDefined();
    const trigger = within(row).getByRole('button', {name: 'Image preview: b.png'});
    await user.click(trigger);
    expect(within(screen.getByRole('dialog')).getByText('b.png')).toBeDefined();
    expect(screen.getByRole('button', {name: 'Output'}).hasAttribute('disabled')).toBe(true);
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', {name: 'Start processing'}));
    await waitFor(() => expect(row.querySelector('[data-thumbnail-kind="output"] img')).not.toBeNull());
    const outputURL = row.querySelector('[data-thumbnail-kind="output"] img')!.getAttribute('src');
    await user.click(trigger);
    await user.click(screen.getByRole('button', {name: 'Compare'}));
    expect(screen.getByRole('img', {name: 'Output'}).getAttribute('src')).toBe(outputURL);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    fireEvent.change(screen.getByRole('textbox', {name: 'Target pixels'}), {target: {value: '600'}});
    await user.type(screen.getByRole('textbox', {name: 'Target pixels'}), '{Enter}');
    expect(row.querySelector('[data-thumbnail-kind="output"]')).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(outputURL);
    await user.click(within(row).getByRole('button', {name: 'Remove image: b.png'}));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', {name: 'Remove image'}));
    expect(screen.queryByRole('listitem', {name: 'b.png'})).toBeNull();
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(vi.mocked(URL.createObjectURL).mock.calls.length);
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
  it('retains a verified result through workspace cameras, inline preview and focused editing', async () => {
    const { user } = await mount();
    await user.click(screen.getByRole('button', {name: 'Download image'}));
    await screen.findByText('Downloaded');
    await user.click(screen.getByRole('button', {name: 'Zoom in'}));
    await user.click(screen.getByRole('button', {name: 'Pan mode'}));
    await user.click(screen.getByRole('button', {name: 'Preview'}));
    await user.click(screen.getByRole('button', {name: 'Focus editor'}));
    await user.click(screen.getByRole('button', {name: 'Done editing'}));
    expect(screen.getByText('Downloaded')).toBeDefined();
    expect((screen.getByRole('textbox', {name: 'Width (pixels)'}) as HTMLInputElement).value).toBe('1200');
    await user.click(screen.getByRole('button', {name: 'Download image'}));
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
