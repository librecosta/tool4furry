import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { ImageSampler } from '../src/tools/palette-extractor/ImageSampler';
import PaletteExtractor, { ColorRow, PaletteParameters } from '../src/tools/palette-extractor/PaletteExtractor';
import { UiProvider } from '../src/ui/UiProvider';
import { messages as uiMessages } from '../src/i18n/messages';
import { ShareDialog } from '../src/tools/palette-extractor/ShareDialog';
import { messages } from '../src/tools/palette-extractor/messages';
import type {
  PaletteSession,
  PaletteView,
} from '../src/tools/palette-extractor/session';
import { setViewport } from './setup';

beforeEach(() => {
  setViewport(false);
  class Pointer extends MouseEvent {
    pointerId: number;
    pointerType: string;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 1;
      this.pointerType = init.pointerType ?? 'mouse';
    }
  }
  vi.stubGlobal('PointerEvent', Pointer);
  Object.defineProperties(HTMLElement.prototype, {
    setPointerCapture: { configurable: true, value: vi.fn() },
    hasPointerCapture: { configurable: true, value: () => true },
    releasePointerCapture: { configurable: true, value: vi.fn() },
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    clearRect: vi.fn(),
    putImageData: vi.fn(),
  } as never);
});

it('samples only while active, rejects contain/transparent space, follows the target and cancels with Escape', () => {
  const pixels = {
    width: 2,
    height: 1,
    data: new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 0]),
  } as ImageData;
  const onPick = vi.fn(),
    cancel = vi.fn();
  const props = { pixels, url: 'blob:preview', onPick, cancel, t: messages.en };
  const mount = render(<ImageSampler {...props} />);
  const stage = mount.container.querySelector('[data-palette-sampler]')!;
  vi.spyOn(stage, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    width: 200,
    height: 200,
    right: 200,
    bottom: 200,
    toJSON() {},
  });
  fireEvent(window, new Event('resize'));
  const click = (x: number, y: number, pointerType = 'mouse') => {
    fireEvent.pointerDown(stage, {
      clientX: x,
      clientY: y,
      pointerId: 1,
      pointerType,
      button: 0,
    });
    fireEvent.pointerUp(stage, {
      clientX: x,
      clientY: y,
      pointerId: 1,
      pointerType,
      button: 0,
    });
  };
  click(25, 75);
  expect(onPick).not.toHaveBeenCalled();
  mount.rerender(<ImageSampler {...props} target="one" />);
  click(25, 10);
  click(150, 75);
  expect(onPick).not.toHaveBeenCalled();
  click(25, 75);
  expect(onPick).toHaveBeenLastCalledWith('one', '#FF0000', { x: 0, y: 0 });
  mount.rerender(<ImageSampler {...props} target="two" />);
  fireEvent.pointerDown(stage, {
    clientX: 150,
    clientY: 75,
    pointerId: 1,
    pointerType: 'touch',
    button: 0,
  });
  fireEvent.pointerMove(stage, {
    clientX: 25,
    clientY: 75,
    pointerId: 1,
    pointerType: 'touch',
  });
  expect(stage.querySelector('canvas')).toBeTruthy();
  fireEvent.pointerUp(stage, {
    clientX: 25,
    clientY: 75,
    pointerId: 1,
    pointerType: 'touch',
    button: 0,
  });
  expect(onPick).toHaveBeenLastCalledWith('two', '#FF0000', { x: 0, y: 0 });
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(cancel).toHaveBeenCalledOnce();
  // This verifies pointer wiring in jsdom, not a physical touch device.
});

it('maps zoomed and panned coordinates, keeps pan separate, and drops an old-source gesture', async () => {
  const user = userEvent.setup();
  const pixels = { width: 400, height: 100, data: new Uint8ClampedArray(400 * 100 * 4) } as ImageData;
  for (let i = 0; i < 400 * 100; i++) {
    pixels.data.set(i % 400 < 200 ? [255, 0, 0, 255] : [0, 255, 0, 255], i * 4);
  }
  const onPick = vi.fn(), cancel = vi.fn();
  const props = { pixels, url: 'blob:one', onPick, cancel, t: messages.en };
  const mount = render(<ImageSampler {...props}/>);
  const stage = mount.container.querySelector('[data-palette-sampler]')!;
  vi.spyOn(stage, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 200, height: 200 } as DOMRect);
  fireEvent(window, new Event('resize'));
  await user.click(screen.getByRole('button', { name: 'Zoom in' }));
  const pointer = (type: string, x: number, y = 100) => fireEvent(stage, new PointerEvent(type, { clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse', button: 0, bubbles: true }));
  pointer('pointerdown', 100); pointer('pointermove', 120); pointer('pointerup', 120);
  expect(onPick).not.toHaveBeenCalled();
  mount.rerender(<ImageSampler {...props} target="red"/>);
  pointer('pointerdown', 100); pointer('pointerup', 100);
  expect(onPick).toHaveBeenLastCalledWith('red', '#FF0000', expect.objectContaining({ y: 50 }));
  mount.rerender(<ImageSampler {...props} target="green"/>);
  pointer('pointerdown', 180); pointer('pointerup', 180);
  expect(onPick).toHaveBeenLastCalledWith('green', '#00FF00', expect.objectContaining({ y: 50 }));
  await user.click(screen.getByRole('button', { name: 'Preview bitmap at 100%' }));
  pointer('pointerdown', 180); pointer('pointerup', 180);
  expect(onPick).toHaveBeenLastCalledWith('green', '#00FF00', expect.objectContaining({ y: 50 }));
  const calls = onPick.mock.calls.length;
  pointer('pointerdown', 100);
  mount.rerender(<ImageSampler {...props} url="blob:replacement" target="new"/>);
  pointer('pointerup', 100);
  expect(onPick).toHaveBeenCalledTimes(calls);
});

it('uses the shared selector and a keyboard-operable 3–10 target group without native selects', async () => {
  const user = userEvent.setup(), extract = vi.fn();
  const mount = render(<PaletteParameters mode="balanced" count={6} disabled={false} extract={extract} t={messages.en}/>);
  expect(mount.container.querySelector('select')).toBeNull();
  expect(screen.getAllByRole('radio')).toHaveLength(8);
  await user.click(screen.getByRole('radio', { name: '10' }));
  expect(extract).toHaveBeenLastCalledWith('balanced', 10);
  await user.click(screen.getByRole('combobox', { name: 'Color direction' }));
  await user.click(screen.getByRole('option', { name: 'Bright' }));
  expect(extract).toHaveBeenLastCalledWith('bright', 6);
  await user.click(screen.getByRole('radio', { name: '6' }));
  await user.keyboard('{ArrowRight}');
  expect(extract).toHaveBeenLastCalledWith('balanced', 7);
});

it('collapses format and device limits by default and removes file-manager/technical chrome', () => {
  const mount = render(<UiProvider labels={uiMessages.en}><PaletteExtractor region="global" locale="en"/></UiProvider>);
  const summary = screen.getByText('Supported formats & limits');
  expect(summary.closest('details')?.open).toBe(false);
  expect(summary.closest('details')?.textContent).toContain('One image at a time');
  expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();
  expect(mount.container.textContent).not.toContain('Sampling uses the oriented preview');
});

it('selects markers without sampling, drags only that stable ID, follows camera geometry and cancels safely', async () => {
  const user = userEvent.setup(), onPick = vi.fn(), onSelect = vi.fn();
  const pixels = { width: 400, height: 100, data: new Uint8ClampedArray(160000) } as ImageData;
  for (let i = 0; i < 40000; i++) pixels.data.set(i % 400 < 200 ? [255, 0, 0, 255] : [0, 255, 0, 255], i * 4);
  const colors = [{ id: 'red', hex: '#FF0000', point: { x: 100, y: 50 } }, { id: 'green', hex: '#00FF00', point: { x: 300, y: 50 } }];
  const props = { pixels, url: 'blob:markers', colors, onPick, onSelect, cancel: vi.fn(), t: messages.en };
  const mount = render(<ImageSampler {...props}/>);
  const stage = mount.container.querySelector('[data-palette-sampler]')!;
  vi.spyOn(stage, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 200, height: 200 } as DOMRect);
  fireEvent(window, new Event('resize'));
  const marker = () => mount.container.querySelector<HTMLElement>('[data-color-marker="red"]')!;
  expect(parseFloat(marker().style.left)).toBeCloseTo(50.25);
  await user.click(screen.getByRole('button', { name: 'Preview bitmap at 100%' }));
  expect(parseFloat(marker().style.left)).toBeCloseTo(0.5);
  await user.click(screen.getByRole('button', { name: 'Fit image' }));
  fireEvent.pointerDown(marker(), { pointerId: 1, button: 0, clientX: 50, clientY: 100 });
  fireEvent.pointerUp(stage, { pointerId: 1, button: 0, clientX: 50, clientY: 100 });
  expect(onSelect).toHaveBeenCalledWith('red');
  expect(onPick).not.toHaveBeenCalled();
  fireEvent.pointerDown(marker(), { pointerId: 1, button: 0, clientX: 50, clientY: 100 });
  fireEvent.pointerMove(stage, { pointerId: 1, clientX: 150, clientY: 100 });
  expect(stage.querySelector('canvas')).toBeTruthy();
  fireEvent.pointerUp(stage, { pointerId: 1, button: 0, clientX: 150, clientY: 100 });
  expect(onPick).toHaveBeenLastCalledWith('red', '#00FF00', { x: 300, y: 50 });
  onPick.mockClear();
  fireEvent.pointerDown(marker(), { pointerId: 2, button: 0, clientX: 50, clientY: 100, pointerType: 'touch' });
  fireEvent.pointerMove(stage, { pointerId: 2, clientX: 150, clientY: 100, pointerType: 'touch' });
  fireEvent.keyDown(window, { key: 'Escape' });
  fireEvent.pointerUp(stage, { pointerId: 2, button: 0, clientX: 150, clientY: 100, pointerType: 'touch' });
  expect(onPick).not.toHaveBeenCalled();
  fireEvent.pointerDown(marker(), { pointerId: 3, button: 0, clientX: 50, clientY: 100 });
  mount.rerender(<ImageSampler {...props} url="blob:replacement" colors={[]}/>);
  fireEvent.pointerUp(stage, { pointerId: 3, button: 0, clientX: 150, clientY: 100 });
  expect(onPick).not.toHaveBeenCalled();
  expect(mount.container.querySelector('[data-color-marker]')).toBeNull();
});

it('keeps row editing, copy, ordering and target indication on stable swatch IDs', async () => {
  const user = userEvent.setup(), pick = vi.fn(), copy = vi.fn();
  const edit = vi.fn((_: string, value: string) => /^#[0-9A-F]{6}$/.test(value)), move = vi.fn(), remove = vi.fn();
  const session = { edit, move, remove } as unknown as PaletteSession;
  render(<ol><ColorRow color={{id: 'stable', hex: '#112233'}} index={1} length={3} {...{session, pick, copy}} selected t={messages.en}/></ol>);
  expect(screen.getByRole('listitem').getAttribute('data-selected')).toBe('true');
  const input = screen.getByRole('textbox', { name: 'HEX color 2' });
  await user.clear(input); await user.type(input, '#12'); await user.tab();
  expect(input.getAttribute('aria-invalid')).toBe('true');
  await user.click(screen.getByRole('button', { name: 'Copy HEX 2' }));
  expect(copy).toHaveBeenLastCalledWith('#112233');
  await user.click(screen.getByRole('button', { name: 'Sample from image 2' }));
  expect(pick).toHaveBeenCalledWith('stable');
  await user.click(screen.getByRole('button', { name: 'Move earlier 2' }));
  expect(move).toHaveBeenCalledWith('stable', -1);
  await user.click(screen.getByRole('button', { name: 'Delete color 2' }));
  expect(remove).toHaveBeenCalledWith('stable');
});

it('mounts one sampler in the focus portal, retains the camera and restores focus after closing', async () => {
  const user = userEvent.setup();
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 200, height: 200 } as DOMRect);
  const pixels = { width: 400, height: 100, data: new Uint8ClampedArray(160000) } as ImageData;
  render(<ImageSampler pixels={pixels} url="blob:focus" onPick={vi.fn()} cancel={vi.fn()} t={messages.en}/>);
  await user.click(screen.getByRole('button', { name: 'Zoom in' }));
  const before = document.querySelector<HTMLElement>('[data-palette-plane]')!.style.width;
  await user.click(screen.getByRole('button', { name: 'Focused sampling workspace' }));
  expect(await screen.findByRole('dialog', { name: 'Focused sampling workspace' })).toBeTruthy();
  expect(document.querySelectorAll('[data-palette-sampler]')).toHaveLength(1);
  expect(document.querySelector<HTMLElement>('[data-palette-plane]')!.style.width).toBe(before);
  await user.click(screen.getByRole('button', { name: 'Close' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Focused sampling workspace' })));
  expect(document.querySelectorAll('[data-palette-sampler]')).toHaveLength(1);
});

function shareFixture() {
  const view: PaletteView = {
    source: {
      canvas: document.createElement('canvas'),
      pixels: {} as ImageData,
      url: 'blob:source',
      name: 'source.png',
      candidates: [],
    },
    colors: [{ id: 'one', hex: '#112233' }],
    mode: 'balanced',
    count: 6,
    dirty: false,
    busy: false,
    version: 1,
  };
  let url = 0, sequence = 0;
  const owner = {
    export: vi.fn(
      async () => new Blob(['validated PNG'], { type: 'image/png' }),
    ),
    download: vi.fn(),
    filename: (kind: string) => `t4f-20261101-010000000-${++sequence}-${kind}.png`,
    snapshot: () => view,
    resources: { url: vi.fn(() => `blob:result-${++url}`), revoke: vi.fn() },
  };
  return { view, owner, session: owner as unknown as PaletteSession };
}

it('invalidates an old share PNG immediately and hides unsupported system sharing', async () => {
  const user = userEvent.setup(),
    { view, owner, session } = shareFixture();
  vi.stubGlobal('navigator', { ...navigator, canShare: () => false });
  const mount = render(<ShareDialog {...{ session, view }} t={messages.en} />);
  await user.click(screen.getByRole('button', { name: 'Create share image' }));
  await screen.findByRole('img', { name: 'Your palette' });
  expect(screen.queryByRole('button', { name: 'Share image' })).toBeNull();
  let resolve!: (blob: Blob) => void;
  owner.export.mockImplementationOnce(
    () =>
      new Promise<Blob>((r) => {
        resolve = r;
      }),
  );
  fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), {
    target: { value: 'Changed 🐺' },
  });
  expect(
    (screen.getByRole('button', { name: 'Download PNG' }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  await waitFor(() => expect(resolve).toBeTypeOf('function'));
  mount.unmount();
  await act(async () => {
    resolve(new Blob(['late']));
  });
  expect(owner.download).not.toHaveBeenCalled();
  expect(owner.resources.url).toHaveBeenCalledTimes(1);
  expect(owner.resources.revoke).toHaveBeenCalledWith('blob:result-1');
});

it('prepares a file before system-share activation and treats cancellation as non-failure', async () => {
  const user = userEvent.setup(),
    { view, session, owner } = shareFixture();
  const share = vi
    .fn()
    .mockRejectedValueOnce(new DOMException('Cancelled', 'AbortError'))
    .mockRejectedValueOnce(new Error('Failed'));
  vi.stubGlobal('navigator', { ...navigator, canShare: () => true, share });
  render(<ShareDialog {...{ session, view }} t={messages.en} />);
  await user.click(screen.getByRole('button', { name: 'Create share image' }));
  const action = await screen.findByRole('button', { name: 'Share image' });
  await user.click(screen.getByRole('button', { name: 'Download PNG' }));
  await user.click(screen.getByRole('button', { name: 'Download PNG' }));
  const names = owner.download.mock.calls.map(call => (call as unknown as [Blob, string])[1]);
  expect(new Set(names).size).toBe(2);
  await user.click(action);
  expect(share.mock.calls[0][0].files[0]).toBeInstanceOf(File);
  expect(share.mock.calls[0][0].files[0].type).toBe('image/png');
  expect(share.mock.calls[0][0].files[0].name).toBe(names.at(-1));
  expect(screen.queryByRole('alert')).toBeNull();
  await user.click(action);
  expect(await screen.findByRole('alert')).toBeTruthy();
});
