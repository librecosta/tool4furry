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
  expect(onPick).toHaveBeenLastCalledWith('one', '#FF0000');
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
  expect(onPick).toHaveBeenLastCalledWith('two', '#FF0000');
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(cancel).toHaveBeenCalledOnce();
  // This verifies pointer wiring in jsdom, not a physical touch device.
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
  let url = 0;
  const owner = {
    export: vi.fn(
      async () => new Blob(['validated PNG'], { type: 'image/png' }),
    ),
    download: vi.fn(),
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
    { view, session } = shareFixture();
  const share = vi
    .fn()
    .mockRejectedValueOnce(new DOMException('Cancelled', 'AbortError'))
    .mockRejectedValueOnce(new Error('Failed'));
  vi.stubGlobal('navigator', { ...navigator, canShare: () => true, share });
  render(<ShareDialog {...{ session, view }} t={messages.en} />);
  await user.click(screen.getByRole('button', { name: 'Create share image' }));
  const action = await screen.findByRole('button', { name: 'Share image' });
  await user.click(action);
  expect(share.mock.calls[0][0].files[0]).toBeInstanceOf(File);
  expect(share.mock.calls[0][0].files[0].type).toBe('image/png');
  expect(screen.queryByRole('alert')).toBeNull();
  await user.click(action);
  expect(await screen.findByRole('alert')).toBeTruthy();
});
