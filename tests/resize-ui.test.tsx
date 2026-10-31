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
  renderCrop: encode,
}));
vi.mock('../src/tools/image/browser-codec', () => ({
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
describe('single image UI wiring (mocked codecs; not layout/browser evidence)', () => {
  it('keeps incomplete input out of processing state until a valid explicit submission', async () => {
    const { user } = await mount();
    const width = screen.getByRole('textbox', { name: 'Width (pixels)' });
    await user.clear(width);
    await user.type(width, '-');
    expect(
      screen
        .getByRole('button', { name: 'Export image' })
        .hasAttribute('disabled'),
    ).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Apply dimensions' }));
    expect(screen.getByRole('alert').textContent).toContain('positive integer');
    expect(encode).not.toHaveBeenCalled();
    await user.clear(width);
    await user.type(width, '600');
    await user.click(screen.getByRole('button', { name: 'Apply dimensions' }));
    expect(
      (
        screen.getByRole('textbox', {
          name: 'Height (pixels)',
        }) as HTMLInputElement
      ).value,
    ).toBe('400');
    await user.click(screen.getByRole('button', { name: 'Export image' }));
    await waitFor(() => expect(encode).toHaveBeenCalledOnce());
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
    await user.click(screen.getByRole('button', { name: 'Clear image' }));
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'Clear image',
      }),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole('textbox', { name: 'Width (pixels)' }),
      ).toBeNull(),
    );
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Choose one image or drop it here' }),
    );
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-1');
    unmount();
  });
  it('exposes keyboard handles, keeps state on responsive signals and explains AVIF output choices', async () => {
    const { user, container } = await mount('source.avif');
    expect(
      screen.getByText(/This AVIF image can be exported as PNG/),
    ).toBeDefined();
    expect(
      screen.getByRole('button', { name: 'Bottom-right handle' }),
    ).toBeDefined();
    const width = screen.getByRole('textbox', { name: 'Width (pixels)' });
    await user.clear(width);
    await user.type(width, '500');
    await user.click(screen.getByRole('button', { name: 'Apply dimensions' }));
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    expect((width as HTMLInputElement).value).toBe('500');
    expect(load).toHaveBeenCalledOnce();
    expect(container.querySelector('[data-workbench="form"]')).not.toBeNull();
    expect(container.querySelector('[data-canvas-viewport]')).toBeNull();
    fireEvent.change(
      screen.getByRole('textbox', { name: 'Filename label (optional)' }),
      { target: { value: 'renamed' } },
    );
    expect(encode).not.toHaveBeenCalled();
  });
});
