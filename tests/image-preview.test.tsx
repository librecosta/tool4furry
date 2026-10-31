import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ImagePreviewViewport } from '../src/tools/image/ImagePreviewViewport';
import { ImageThumbnail } from '../src/tools/image/ImageThumbnail';
import { ImageComparisonDialog } from '../src/tools/image/ImageComparisonDialog';
import {
  constrain,
  fitScale,
  zoomAt,
} from '../src/tools/image/preview-geometry';
import { converterMessages } from '../src/tools/image-converter/messages';
import { UiProvider } from '../src/ui/UiProvider';
import { messages } from '../src/i18n/messages';

const labels = converterMessages.en.viewer;
let viewport = { width: 800, height: 600 };
let resize: () => void;
const disconnect = vi.fn();
beforeEach(() => {
  viewport = { width: 800, height: 600 };
  disconnect.mockClear();
  const original = HTMLElement.prototype.getBoundingClientRect;
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
    function (this: HTMLElement) {
      return this.hasAttribute('data-image-preview-viewport')
        ? new DOMRect(0, 0, viewport.width, viewport.height)
        : original.call(this);
    },
  );
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: () => void) {
        resize = callback;
      }
      observe() {}
      disconnect = disconnect;
    },
  );
  vi.stubGlobal(
    'PointerEvent',
    class extends MouseEvent {
      pointerId: number;
      constructor(type: string, options: PointerEventInit = {}) {
        super(type, options);
        this.pointerId = options.pointerId ?? 1;
      }
    },
  );
});
afterEach(() => vi.restoreAllMocks());
function viewer(src = 'blob:original') {
  return (
    <UiProvider labels={messages.en}>
      <ImagePreviewViewport
        src={src}
        width={1600}
        height={1200}
        alt="Picture"
        labels={labels}
        onError={() => {}}
      />
    </UiProvider>
  );
}
const transform = () =>
  screen.getByRole('img', { name: 'Picture' }).getAttribute('style')!;
const canvas = () => screen.getByRole('region', { name: labels.viewport });

describe('image preview geometry and interactions (simulated DOM, no codec)', () => {
  it('keeps an anchored image point stable and bounds panning without losing the image', () => {
    const before = { scale: 1, x: -50, y: 10 },
      point = { x: 100, y: -80 };
    const after = zoomAt(before, 2, point);
    expect((point.x - after.x) / after.scale).toBe(
      (point.x - before.x) / before.scale,
    );
    expect((point.y - after.y) / after.scale).toBe(
      (point.y - before.y) / before.scale,
    );
    const image = { width: 1600, height: 1200 };
    expect(fitScale(image, viewport)).toBe(0.5);
    expect(constrain({ scale: 1, x: 9999, y: -9999 }, image, viewport)).toEqual(
      { scale: 1, x: 400, y: -300 },
    );
    expect(constrain({ scale: 0.5, x: 20, y: 50 }, image, viewport)).toEqual({
      scale: 0.5,
      x: 0,
      y: 0,
    });
  });
  it('fits, shows actual CSS-pixel size, zooms and pans with the keyboard, and resets', async () => {
    const user = userEvent.setup();
    render(viewer());
    fireEvent.load(screen.getByRole('img', { name: 'Picture' }));
    expect(transform()).toContain('scale(0.5)');
    await user.click(screen.getByRole('button', { name: labels.actual }));
    expect(transform()).toContain('1600px');
    expect(transform()).toContain('scale(1)');
    act(() => canvas().focus());
    await user.keyboard('+{ArrowRight}');
    expect(transform()).toContain('scale(1.25)');
    expect(transform()).toContain('+ 40px');
    await user.click(screen.getByRole('button', { name: labels.reset }));
    expect(transform()).toContain('scale(0.5)');
    expect(transform()).toContain('+ 0px');
  });
  it('only intercepts wheel zoom on the canvas, anchors it and clamps mouse dragging', async () => {
    const user = userEvent.setup();
    render(viewer());
    fireEvent.load(screen.getByRole('img', { name: 'Picture' }));
    await user.click(screen.getByRole('button', { name: labels.actual }));
    const wheel = new WheelEvent('wheel', {
      deltaY: -100,
      clientX: 600,
      clientY: 300,
      bubbles: true,
      cancelable: true,
    });
    fireEvent(canvas(), wheel);
    expect(wheel.defaultPrevented).toBe(true);
    expect(transform()).toContain('+ -44.280');
    const outside = new WheelEvent('wheel', {
      deltaY: 100,
      bubbles: true,
      cancelable: true,
    });
    fireEvent(screen.getByRole('button', { name: labels.actual }), outside);
    expect(outside.defaultPrevented).toBe(false);
    await user.click(screen.getByRole('button', { name: labels.actual }));
    fireEvent.pointerDown(canvas(), {
      pointerId: 1,
      button: 0,
      clientX: 400,
      clientY: 300,
    });
    fireEvent.pointerMove(canvas(), {
      pointerId: 1,
      clientX: 9999,
      clientY: 9999,
    });
    expect(transform()).toContain('+ 400px');
    expect(transform()).toContain('+ 300px');
    fireEvent.pointerUp(canvas(), { pointerId: 1 });
  });
  it('pinches around the touch center, continues with one finger and cancels cleanly', () => {
    render(viewer());
    fireEvent.load(screen.getByRole('img', { name: 'Picture' }));
    fireEvent.pointerDown(canvas(), {
      pointerId: 1,
      button: 0,
      clientX: 300,
      clientY: 300,
    });
    fireEvent.pointerDown(canvas(), {
      pointerId: 2,
      button: 0,
      clientX: 500,
      clientY: 300,
    });
    fireEvent.pointerMove(canvas(), {
      pointerId: 2,
      clientX: 700,
      clientY: 300,
    });
    expect(transform()).toContain('scale(1)');
    expect(transform()).toContain('+ 100px');
    fireEvent.pointerUp(canvas(), { pointerId: 1 });
    fireEvent.pointerMove(canvas(), {
      pointerId: 2,
      clientX: 750,
      clientY: 300,
    });
    expect(transform()).toContain('+ 150px');
    fireEvent.pointerCancel(canvas(), { pointerId: 2 });
    const stopped = transform();
    fireEvent.pointerMove(canvas(), {
      pointerId: 2,
      clientX: 800,
      clientY: 300,
    });
    expect(transform()).toBe(stopped);
  });
  it('refits on resize/source change, removes broken images and cleans observers/listeners', async () => {
    const user = userEvent.setup();
    const { rerender, unmount } = render(viewer());
    fireEvent.load(screen.getByRole('img', { name: 'Picture' }));
    await user.click(screen.getByRole('button', { name: labels.actual }));
    viewport = { width: 400, height: 300 };
    act(() => resize());
    expect(transform()).toContain('scale(0.25)');
    rerender(viewer('blob:new'));
    expect(transform()).toContain('scale(0.25)');
    fireEvent.error(screen.getByRole('img', { name: 'Picture' }));
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByRole('alert').textContent).toBe(labels.error);
    expect(
      screen
        .getByRole('button', { name: labels.zoomIn })
        .hasAttribute('disabled'),
    ).toBe(true);
    const wheel = new WheelEvent('wheel', { deltaY: 100, cancelable: true });
    fireEvent(canvas(), wheel);
    expect(wheel.defaultPrevented).toBe(false);
    unmount();
    expect(disconnect).toHaveBeenCalledTimes(2);
  });
  it('falls back for loading/checking/broken thumbnails without owning a URL', () => {
    const { container, rerender } = render(<ImageThumbnail src="blob:one" />);
    expect(container.querySelector('svg')).toBeTruthy();
    expect(container.querySelector('img')?.getAttribute('loading')).toBe('lazy');
    fireEvent.load(container.querySelector('img')!);
    expect(container.querySelector('svg')).toBeNull();
    fireEvent.error(container.querySelector('img')!);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).toBeTruthy();
    rerender(<ImageThumbnail src="blob:two" checking />);
    expect(container.querySelector('img')).toBeNull();
    rerender(<ImageThumbnail src="blob:two" />);
    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      'blob:two',
    );
  });
  it('compares with independent viewport controls and immediately removes unavailable outputs', async () => {
    const user = userEvent.setup();
    const source = {url: 'blob:original', width: 1600, height: 1200, format: 'png', onError: vi.fn()};
    const output = {url: 'blob:output', width: 800, height: 600, format: 'webp', onError: vi.fn()};
    const dialog = (result = true) => <UiProvider labels={messages.en}><ImageComparisonDialog open onOpenChange={() => {}} name="art.png" source={source} output={result ? output : undefined} labels={converterMessages.en} finalFocus={() => null}/></UiProvider>;
    const {rerender} = render(dialog());
    await user.click(screen.getByRole('button', {name: 'Compare'}));
    const originalPanel = screen.getByRole('region', {name: 'Original'});
    const outputPanel = screen.getByRole('region', {name: 'Output'});
    fireEvent.load(within(originalPanel).getByRole('img'));
    fireEvent.load(within(outputPanel).getByRole('img'));
    const outputTransform = within(outputPanel).getByRole('img').getAttribute('style');
    await user.click(within(originalPanel).getByRole('button', {name: labels.actual}));
    expect(within(originalPanel).getByRole('img').getAttribute('style')).toContain('scale(1)');
    expect(within(outputPanel).getByRole('img').getAttribute('style')).toBe(outputTransform);
    fireEvent.error(within(outputPanel).getByRole('img'));
    expect(within(outputPanel).getByRole('alert').textContent).toBe(labels.error);
    expect(output.onError).toHaveBeenCalledOnce();
    rerender(dialog(false));
    expect(screen.queryByRole('img', {name: 'Output'})).toBeNull();
    expect(screen.getByRole('button', {name: 'Compare'}).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', {name: 'Original'}).getAttribute('aria-pressed')).toBe('true');
  });
});
