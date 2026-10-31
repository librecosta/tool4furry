import { useState } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { CropEditor } from '../src/tools/image-resize-crop/CropEditor';
import { initialView, type ResizeView } from '../src/tools/image-resize-crop/session';
import { resizeMessages } from '../src/tools/image-resize-crop/messages';
import { UiProvider } from '../src/ui/UiProvider';
import { messages } from '../src/i18n/messages';
import { setViewport } from './setup';

let viewport = {width: 640, height: 420};
const changed = vi.fn();
const disconnect = vi.fn();
const observed = vi.fn();
beforeEach(() => {
  setViewport();
  changed.mockClear();
  disconnect.mockClear();
  observed.mockClear();
  viewport = {width: 640, height: 420};
  vi.stubGlobal('PointerEvent', class extends MouseEvent {
    pointerId: number;
    pointerType: string;
    constructor(type: string, options: PointerEventInit = {}) {
      super(type, options);
      this.pointerId = options.pointerId ?? 1;
      this.pointerType = options.pointerType ?? 'mouse';
    }
  });
  vi.stubGlobal('ResizeObserver', class { constructor() { observed(); } observe() {} disconnect = disconnect; });
  const original = HTMLElement.prototype.getBoundingClientRect;
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    if (this.hasAttribute('data-crop-viewport')) return new DOMRect(100, 200, viewport.width, viewport.height);
    // Simulate layout, not a transform: ReactCrop reads this actual media box.
    const plane = this.closest<HTMLElement>('[data-crop-plane]');
    if (plane) {
      const width = parseFloat(plane.style.width), height = parseFloat(plane.style.height);
      return new DOMRect(100 + viewport.width / 2 - width / 2 + Number.parseFloat(plane.style.marginLeft || '0'), 200 + viewport.height / 2 - height / 2 + Number.parseFloat(plane.style.marginTop || '0'), width, height);
    }
    return original.call(this);
  });
});
const t = resizeMessages.en;
const initial = (): ResizeView => ({
  ...initialView(), status: 'ready',
  source: {file: new File(['source'], 'large.png'), blob: new Blob(['source']), width: 4000, height: 2000, info: {format: 'png', width: 4000, height: 2000, orientation: 1}},
  crop: {x: 1000, y: 500, width: 1000, height: 500},
  output: {width: 1000, height: 500, format: 'png', quality: 85, background: '#FFFFFF'},
});
function Example({start = initial}: {start?: () => ResizeView}) {
  const [view, setView] = useState(start);
  return <UiProvider labels={messages.en}>
    <CropEditor view={view} url="blob:bounded" t={t} onReset={() => {}} onCrop={crop => {
      changed(crop);
      setView(current => ({...current, crop}));
    }}/>
  </UiProvider>;
}
function loaded(width = 1600, height = 800) {
  // Preview bitmap dimensions are measured independently of source pixels.
  const image = document.querySelector<HTMLImageElement>('[data-crop-workspace] > img[hidden]')!;
  Object.defineProperties(image, {naturalWidth: {value: width}, naturalHeight: {value: height}});
  fireEvent.load(image);
}
const canvas = () => screen.getByRole('region', {name: t.cropCanvas});
const plane = () => document.querySelector<HTMLElement>('[data-crop-plane]')!;
const cropSelection = () => screen.getByRole('group', {name: t.handles.cropArea});
function drag(target: Element, dx: number, dy: number) {
  const box = plane().getBoundingClientRect();
  const x = box.x + box.width * 0.375, y = box.y + box.height * 0.375;
  fireEvent.pointerDown(target, {button: 0, clientX: x, clientY: y});
  fireEvent.pointerMove(canvas(), {clientX: x + dx, clientY: y + dy});
  fireEvent.pointerUp(canvas(), {clientX: x + dx, clientY: y + dy});
}

it.each([1, 1.25, 0.8])('maps a crop drag through actual DOM width at preview scale %s', async scale => {
  const user = userEvent.setup();
  render(<Example/>);
  loaded();
  await user.click(screen.getByRole('button', {name: t.bitmapActual}));
  if (scale > 1) await user.click(screen.getByRole('button', {name: t.preview.viewer.zoomIn}));
  if (scale < 1) await user.click(screen.getByRole('button', {name: t.preview.viewer.zoomOut}));
  expect(plane().style.width).toBe(`${1600 * scale}px`);
  expect(changed).not.toHaveBeenCalled();
  drag(cropSelection(), 40, 20);
  expect(changed).toHaveBeenLastCalledWith({x: 1000 + Math.round(100 / scale), y: 500 + Math.round(50 / scale), width: 1000, height: 500});
});

it('pans without a crop write, then resizes a translated corner accurately', async () => {
  const user = userEvent.setup();
  render(<Example/>);
  loaded();
  await user.click(screen.getByRole('button', {name: t.bitmapActual}));
  await user.click(screen.getByRole('button', {name: t.handMode}));
  drag(canvas(), 100, 50);
  expect(plane().style.marginLeft).toBe('100px');
  expect(changed).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', {name: t.handMode}));
  const box = plane().getBoundingClientRect();
  const x = box.x + box.width * 0.5, y = box.y + box.height * 0.5;
  fireEvent.pointerDown(screen.getByRole('button', {name: t.handles.seDragHandle}), {button: 0, clientX: x, clientY: y});
  fireEvent.pointerMove(canvas(), {clientX: x + 80, clientY: y + 40});
  fireEvent.pointerUp(canvas());
  expect(changed).toHaveBeenLastCalledWith({x: 1000, y: 500, width: 1200, height: 600});
  expect(plane().style.marginLeft).toBe('100px');
});

it('projects a fixed source aspect through a rounded preview bitmap aspect', async () => {
  const user = userEvent.setup();
  const start = (): ResizeView => {
    const view = initial();
    return {
      ...view,
      source: {...view.source!, width: 6000, height: 4000, info: {...view.source!.info, width: 6000, height: 4000}},
      aspect: '3:2', crop: {x: 600, y: 400, width: 4800, height: 3200},
      output: {...view.output, width: 4800, height: 3200},
    };
  };
  render(<Example start={start}/>);
  loaded(1600, 1067);
  await user.click(screen.getByRole('button', {name: t.bitmapActual}));
  const box = plane().getBoundingClientRect();
  const x = box.x + box.width * 0.9, y = box.y + box.height * 0.9;
  fireEvent.pointerDown(screen.getByRole('button', {name: t.handles.seDragHandle}), {button: 0, clientX: x, clientY: y});
  fireEvent.pointerMove(canvas(), {clientX: x + 80, clientY: y + 40});
  fireEvent.pointerUp(canvas());
  const crop = changed.mock.calls.at(-1)![0];
  expect(crop).toEqual({x: 600, y: 400, width: 5100, height: 3400});
});

it('keeps page wheel scrolling, handles modifier zoom, and preserves the camera across inline preview', async () => {
  const user = userEvent.setup();
  render(<Example/>);
  loaded();
  const ordinary = new WheelEvent('wheel', {deltaY: 100, bubbles: true, cancelable: true});
  fireEvent(canvas(), ordinary);
  expect(ordinary.defaultPrevented).toBe(false);
  const modified = new WheelEvent('wheel', {deltaY: -100, ctrlKey: true, bubbles: true, cancelable: true, clientX: 400, clientY: 400});
  fireEvent(canvas(), modified);
  expect(modified.defaultPrevented).toBe(true);
  const before = plane().getAttribute('style');
  await user.click(screen.getByRole('button', {name: t.previewView}));
  expect(document.querySelectorAll('.ReactCrop')).toHaveLength(0);
  expect(screen.getByRole('img', {name: t.composition})).toBeDefined();
  await user.click(screen.getByRole('button', {name: t.cropView}));
  expect(plane().getAttribute('style')).toBe(before);
  expect(changed).not.toHaveBeenCalled();
});

it('shares one crop adapter through repeated focus dialogs and fits on resize without a crop write', async () => {
  const user = userEvent.setup();
  const {unmount} = render(<Example/>);
  loaded();
  for (let i = 0; i < 2; i++) {
    await user.click(screen.getByRole('button', {name: t.focusEdit}));
    const dialog = screen.getByRole('dialog', {name: t.focusEdit});
    expect(document.querySelectorAll('.ReactCrop')).toHaveLength(1);
    loaded();
    expect(within(dialog).getByText('4000 × 2000', {exact: false})).toBeDefined();
    const wheel = new WheelEvent('wheel', {deltaY: -80, bubbles: true, cancelable: true});
    fireEvent(canvas(), wheel);
    expect(wheel.defaultPrevented).toBe(true);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', {name: t.focusEdit})));
    loaded();
  }
  viewport = {width: 360, height: 280};
  act(() => window.dispatchEvent(new Event('resize')));
  expect(plane().style.width).toBe('312px');
  expect(changed).not.toHaveBeenCalled();
  unmount();
  expect(disconnect).toHaveBeenCalledTimes(observed.mock.calls.length);
});

it('cancels multi-pointer crop drags and only pinches in pan mode', async () => {
  const user = userEvent.setup();
  render(<Example/>);
  loaded();
  const oldSelection = cropSelection();
  fireEvent.pointerDown(oldSelection, {pointerId: 1, pointerType: 'touch', button: 0, clientX: 300, clientY: 300});
  fireEvent.pointerDown(canvas(), {pointerId: 2, pointerType: 'touch', button: 0, clientX: 400, clientY: 300});
  fireEvent.pointerMove(canvas(), {pointerId: 2, pointerType: 'touch', clientX: 450, clientY: 300});
  fireEvent.pointerMove(canvas(), {pointerId: 1, pointerType: 'touch', clientX: 250, clientY: 300});
  fireEvent.pointerUp(canvas(), {pointerId: 1});
  fireEvent.pointerUp(canvas(), {pointerId: 2});
  expect(changed).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', {name: t.handMode}));
  const before = parseFloat(plane().style.width);
  fireEvent.pointerDown(canvas(), {pointerId: 1, pointerType: 'touch', button: 0, clientX: 300, clientY: 300});
  fireEvent.pointerDown(canvas(), {pointerId: 2, pointerType: 'touch', button: 0, clientX: 400, clientY: 300});
  fireEvent.pointerMove(canvas(), {pointerId: 2, pointerType: 'touch', clientX: 500, clientY: 300});
  expect(parseFloat(plane().style.width)).toBeCloseTo(before * 2);
  fireEvent.pointerCancel(canvas(), {pointerId: 1});
  fireEvent.pointerCancel(canvas(), {pointerId: 2});
  expect(changed).not.toHaveBeenCalled();
});

it('cancels a crop before a foreign document pointer can reach the library listener', () => {
  render(<Example/>);
  loaded();
  fireEvent.pointerDown(cropSelection(), {pointerId: 1, button: 0, clientX: 300, clientY: 300});
  fireEvent.pointerDown(document.body, {pointerId: 2, pointerType: 'touch', button: 0});
  fireEvent.pointerMove(document.body, {pointerId: 2, clientX: 700, clientY: 600});
  fireEvent.pointerMove(canvas(), {pointerId: 1, clientX: 500, clientY: 500});
  fireEvent.pointerUp(canvas(), {pointerId: 1});
  expect(changed).not.toHaveBeenCalled();
  expect(cropSelection().getAttribute('style')).toContain('left: 25%');
});

it('clamps a zoomed selection at source bounds and keeps keyboard pan out of crop handles', async () => {
  const user = userEvent.setup();
  render(<Example/>);
  loaded();
  await user.click(screen.getByRole('button', {name: t.bitmapActual}));
  drag(cropSelection(), 4000, 2000);
  expect(changed).toHaveBeenLastCalledWith({x: 3000, y: 1500, width: 1000, height: 500});
  changed.mockClear();
  await user.click(screen.getByRole('button', {name: t.handMode}));
  expect(plane().hasAttribute('inert')).toBe(true);
  fireEvent.keyDown(canvas(), {key: 'ArrowLeft'});
  expect(plane().style.marginLeft).toBe('-40px');
  expect(changed).not.toHaveBeenCalled();
});
