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
import PaletteExtractor, { AddColor, ColorRow, PaletteParameters } from '../src/tools/palette-extractor/PaletteExtractor';
import { UiProvider } from '../src/ui/UiProvider';
import { messages as uiMessages } from '../src/i18n/messages';
import { ShareDialog } from '../src/tools/palette-extractor/ShareDialog';
import { ShareCanvas } from '../src/tools/palette-extractor/ShareCanvas';
import { shareDefaults, shareLayout } from '../src/tools/palette-extractor/render';
import { messages } from '../src/tools/palette-extractor/messages';
import type {
  PaletteSession,
  PaletteView,
} from '../src/tools/palette-extractor/session';
import { setViewport } from './setup';

vi.mock('../src/tools/palette-extractor/render', async importOriginal => ({
  ...await importOriginal<typeof import('../src/tools/palette-extractor/render')>(),
  loadShareAssets: vi.fn(async () => ({})),
  drawShare: vi.fn(),
}));

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
    setTransform: vi.fn(),
  } as never);
});

it('previews hover/marker colors without committing, then cancels or discards a replaced source', () => {
  const pixels = { width: 2, height: 1, data: new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255]) } as ImageData;
  const onPick = vi.fn(), onPreview = vi.fn();
  const props = { pixels, url: 'blob:source', target: 'one', colors: [{ id: 'one', hex: '#FF0000', point: { x: 0, y: 0 } }], onPick, onPreview, cancel: vi.fn(), t: messages.en };
  const mount = render(<ImageSampler {...props}/>);
  const stage = mount.container.querySelector<HTMLElement>('[data-palette-sampler]')!;
  vi.spyOn(stage, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 200, height: 200 } as DOMRect);
  fireEvent(window, new Event('resize'));
  fireEvent.pointerMove(stage, { clientX: 150, clientY: 100, pointerId: 1, pointerType: 'mouse' });
  expect(onPreview).toHaveBeenLastCalledWith({ id: 'one', hex: '#00FF00', point: { x: 1, y: 0 }, url: 'blob:source' });
  expect(onPick).not.toHaveBeenCalled();
  expect(mount.container.querySelector<HTMLElement>('[data-color-marker] span')!.style.backgroundColor).toBe('rgb(0, 255, 0)');
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(onPreview).toHaveBeenLastCalledWith(undefined);
  expect(onPick).not.toHaveBeenCalled();
  const marker = mount.container.querySelector('[data-color-marker]')!;
  fireEvent.pointerDown(marker, { clientX: 50, clientY: 100, pointerId: 2, button: 0, pointerType: 'touch' });
  fireEvent.pointerMove(stage, { clientX: 150, clientY: 100, pointerId: 2, pointerType: 'touch' });
  expect(onPreview.mock.calls.at(-1)?.[0]?.hex).toBe('#00FF00');
  fireEvent.pointerCancel(stage, { pointerId: 2 });
  expect(onPreview).toHaveBeenLastCalledWith(undefined);
  fireEvent.pointerDown(marker, { clientX: 50, clientY: 100, pointerId: 3, button: 0 });
  fireEvent.pointerMove(stage, { clientX: 150, clientY: 100, pointerId: 3 });
  expect(stage.hasAttribute('data-pointer-focus')).toBe(true);
  fireEvent.keyDown(stage, { key: '+' });
  expect(stage.hasAttribute('data-pointer-focus')).toBe(false);
  fireEvent.pointerUp(stage, { clientX: 150, clientY: 100, pointerId: 3 });
  expect(onPick).toHaveBeenCalledExactlyOnceWith('one', '#00FF00', { x: 1, y: 0 });
  mount.rerender(<ImageSampler {...props} url="blob:new" target={undefined} colors={[]}/>);
  expect(onPreview).toHaveBeenLastCalledWith(undefined);
  expect(mount.container.querySelector('[data-color-marker]')).toBeNull();
});

it('uses one live sample for focused swatches, markers and the parent, and cancels on target/delete/close', async () => {
  const user = userEvent.setup(), onPick = vi.fn(), onPreview = vi.fn();
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({left: 0, top: 0, width: 200, height: 200} as DOMRect);
  const pixels = {width: 2, height: 1, data: new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255])} as ImageData;
  const colors = [{id: 'one', hex: '#FF0000', point: {x: 0, y: 0}}, {id: 'two', hex: '#0000FF', point: {x: 0, y: 0}}];
  const props = {pixels, url: 'blob:focus', colors, target: 'one', onTarget: vi.fn(), onPick, onPreview, cancel: vi.fn(), t: messages.en};
  const mount = render(<ImageSampler {...props}/>);
  await user.click(screen.getByRole('button', {name: messages.en.focus}));
  await screen.findByRole('dialog');
  const stage = () => document.querySelector('[data-palette-sampler]')!;
  const color = (selector: string) => document.querySelector<HTMLElement>(selector)!.style.backgroundColor;
  fireEvent.pointerMove(stage(), {clientX: 150, clientY: 100, pointerId: 1});
  expect(color('[data-focus-swatch="one"]')).toBe('rgb(0, 255, 0)');
  expect(color('[data-color-marker="one"] span')).toBe('rgb(0, 255, 0)');
  expect(color('[data-focus-swatch="two"]')).toBe('rgb(0, 0, 255)');
  expect(onPreview).toHaveBeenLastCalledWith({id: 'one', hex: '#00FF00', point: {x: 1, y: 0}, url: props.url});
  expect(onPick).not.toHaveBeenCalled();
  fireEvent.keyDown(window, {key: 'Escape'});
  expect(color('[data-focus-swatch="one"]')).toBe('rgb(255, 0, 0)');
  fireEvent.pointerDown(document.querySelector('[data-color-marker="one"]')!, {clientX: 50, clientY: 100, pointerId: 2, button: 0});
  fireEvent.pointerMove(stage(), {clientX: 150, clientY: 100, pointerId: 2});
  expect(color('[data-focus-swatch="one"]')).toBe('rgb(0, 255, 0)');
  fireEvent.pointerCancel(stage(), {pointerId: 2});
  expect(color('[data-focus-swatch="one"]')).toBe('rgb(255, 0, 0)');
  fireEvent.pointerMove(stage(), {clientX: 150, clientY: 100, pointerId: 1});
  mount.rerender(<ImageSampler {...props} target="two"/>);
  expect(color('[data-focus-swatch="one"]')).toBe('rgb(255, 0, 0)');
  expect(onPreview).toHaveBeenLastCalledWith(undefined);
  fireEvent.pointerMove(stage(), {clientX: 150, clientY: 100, pointerId: 1});
  mount.rerender(<ImageSampler {...props} target="two" colors={[colors[0]]}/>);
  expect(document.querySelector('[data-focus-swatch="two"]')).toBeNull();
  expect(onPreview).toHaveBeenLastCalledWith(undefined);
  mount.rerender(<ImageSampler {...props}/>);
  fireEvent.pointerDown(document.querySelector('[data-color-marker="one"]')!, {clientX: 50, clientY: 100, pointerId: 3, button: 0});
  fireEvent.pointerMove(stage(), {clientX: 150, clientY: 100, pointerId: 3});
  await user.click(screen.getByRole('button', {name: messages.en.close}));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(onPick).not.toHaveBeenCalled();
  expect(onPreview).toHaveBeenLastCalledWith(undefined);
});

it('keeps a HEX draft separate from temporary sampling and restores the committed color on cancel', async () => {
  const user = userEvent.setup(), edit = vi.fn(() => false);
  const color = { id: 'one', hex: '#112233' }, session = { edit } as unknown as PaletteSession;
  const props = { color, index: 0, length: 1, session, pick: vi.fn(), copy: vi.fn(), selected: true, t: messages.en };
  const preview = { id: 'one', hex: '#FF0000', point: {x: 0, y: 0}, url: 'blob:a' };
  const mount = render(<ol><ColorRow {...props}/></ol>);
  mount.rerender(<ol><ColorRow {...props} preview={preview}/></ol>);
  const input = screen.getByRole('textbox', {name: 'HEX color 1'}) as HTMLInputElement;
  expect(input.value).toBe('#FF0000');
  expect(edit).not.toHaveBeenCalled();
  mount.rerender(<ol><ColorRow {...props}/></ol>);
  expect(input.value).toBe('#112233');
  await user.clear(input); await user.type(input, '#12');
  mount.rerender(<ol><ColorRow {...props} preview={preview}/></ol>);
  expect(input.value).toBe('#12');
  await user.tab();
  expect(input.value).toBe('#12');
  expect(input.getAttribute('aria-invalid')).toBe('true');
});

it('previews only the dragged marker when a different eyedropper target is active', () => {
  const pixels = { width: 2, height: 1, data: new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255]) } as ImageData;
  const onPreview = vi.fn(), onPick = vi.fn();
  const mount = render(<ImageSampler pixels={pixels} url="blob:source" target="one" colors={[
    { id: 'one', hex: '#FF0000', point: {x: 0, y: 0} },
    { id: 'two', hex: '#0000FF', point: {x: 0, y: 0} },
  ]} onPreview={onPreview} onPick={onPick} cancel={vi.fn()} t={messages.en}/>);
  const stage = mount.container.querySelector<HTMLElement>('[data-palette-sampler]')!;
  vi.spyOn(stage, 'getBoundingClientRect').mockReturnValue({left: 0, top: 0, width: 200, height: 200} as DOMRect);
  fireEvent(window, new Event('resize'));
  fireEvent.pointerMove(stage, {clientX: 150, clientY: 100, pointerId: 1, pointerType: 'mouse'});
  fireEvent.pointerDown(mount.container.querySelector('[data-color-marker="two"]')!, {clientX: 50, clientY: 100, pointerId: 1, button: 0});
  expect(onPreview).toHaveBeenLastCalledWith(undefined);
  fireEvent.pointerMove(stage, {clientX: 150, clientY: 100, pointerId: 1});
  expect(onPreview.mock.calls.at(-1)?.[0]?.id).toBe('two');
  expect(mount.container.querySelector<HTMLElement>('[data-color-marker="one"] span')!.style.backgroundColor).toBe('rgb(255, 0, 0)');
  expect(mount.container.querySelector<HTMLElement>('[data-color-marker="two"] span')!.style.backgroundColor).toBe('rgb(0, 255, 0)');
  expect(onPick).not.toHaveBeenCalled();
  fireEvent.pointerUp(stage, {clientX: 150, clientY: 100, pointerId: 1});
  expect(onPick).toHaveBeenCalledExactlyOnceWith('two', '#00FF00', {x: 1, y: 0});
});

it('adds a color only after valid Popover submission, cancels safely and returns focus', async () => {
  const user = userEvent.setup(), add = vi.fn(() => true);
  render(<><AddColor disabled={false} add={add} t={messages.en}/><button>Outside</button></>);
  const trigger = screen.getByRole('button', {name: 'Add color'});
  await user.click(trigger);
  const input = await screen.findByRole('textbox', {name: 'HEX color'});
  expect(document.activeElement).toBe(input);
  expect(screen.queryByText('HEX color')).toBeNull();
  const picker = screen.getByRole('group', {name: 'Choose color'});
  expect(picker.querySelector('input[type=color]')).toBeNull();
  fireEvent.change(input, {target: {value: '#123456'}});
  const hue = screen.getByRole('slider', {name: 'Hue'});
  const previousHue = hue.getAttribute('aria-valuenow');
  await user.clear(input); await user.type(input, '#12');
  expect((input as HTMLInputElement).value).toBe('#12');
  expect(hue.getAttribute('aria-valuenow')).toBe(previousHue);
  fireEvent.keyDown(hue, {key: 'ArrowRight', keyCode: 39});
  expect((input as HTMLInputElement).value).toMatch(/^#[A-F0-9]{6}$/);
  expect(hue.getAttribute('aria-valuenow')).not.toBe(previousHue);
  expect(add).not.toHaveBeenCalled();
  await user.clear(input); await user.type(input, '#12'); await user.keyboard('{Enter}');
  expect(add).not.toHaveBeenCalled();
  expect(input.getAttribute('aria-invalid')).toBe('true');
  expect(screen.getByText(messages.en.invalid)).toBeTruthy();
  await user.keyboard('{Escape}');
  await waitFor(() => expect(screen.queryByRole('textbox')).toBeNull());
  expect(document.activeElement).toBe(trigger);
  await user.click(trigger); await user.clear(screen.getByRole('textbox')); await user.type(screen.getByRole('textbox'), '#abcdef'); await user.keyboard('{Enter}');
  expect(add).toHaveBeenCalledExactlyOnceWith('#abcdef');
  await waitFor(() => expect(screen.queryByRole('textbox')).toBeNull());
  await user.click(trigger); await user.click(screen.getByRole('button', {name: 'Outside'}));
  await waitFor(() => expect(screen.queryByRole('textbox')).toBeNull());
  expect(add).toHaveBeenCalledTimes(1);
});

it('samples only while active, rejects contain/transparent space, follows the target and cancels with Escape', () => {
  const pixels = {
    width: 2,
    height: 1,
    data: new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 0]),
  } as ImageData;
  const onPick = vi.fn(),
    cancel = vi.fn();
  const props = { pixels, colors: ['one', 'two'].map(id => ({id, hex: '#FF0000'})), url: 'blob:preview', onPick, cancel, t: messages.en };
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
  const props = { pixels, colors: ['red', 'green', 'new'].map(id => ({id, hex: '#00FF00'})), url: 'blob:one', onPick, cancel, t: messages.en };
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
  // Open by keyboard: jsdom cannot reproduce the select's pointer geometry and
  // mouse-release timing. Await the portalled option before interacting with it.
  await user.tab();
  expect(document.activeElement).toBe(screen.getByRole('combobox', { name: 'Color direction' }));
  await user.keyboard('{ArrowDown}');
  await user.click(await screen.findByRole('option', { name: 'Bright' }));
  expect(extract).toHaveBeenLastCalledWith('bright', 6);
  await user.click(screen.getByRole('radio', { name: '10' }));
  expect(extract).toHaveBeenLastCalledWith('balanced', 10);
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
  await user.click(screen.getByRole('button', { name: 'Image Sampling' }));
  expect(await screen.findByRole('dialog', { name: 'Image Sampling' })).toBeTruthy();
  expect(document.querySelectorAll('[data-palette-sampler]')).toHaveLength(1);
  expect(document.querySelector<HTMLElement>('[data-palette-plane]')!.style.width).toBe(before);
  await user.click(screen.getByRole('button', { name: 'Close' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Image Sampling' })));
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

it('invalidates an old share PNG immediately and releases the closed preview', async () => {
  const user = userEvent.setup(),
    { view, owner, session } = shareFixture();
  const mount = render(<ShareDialog {...{ session, view }} t={messages.en} />);
  await user.click(screen.getByRole('button', { name: 'Create share image' }));
  const canvas = await screen.findByRole('img', { name: messages.en.composition }) as HTMLCanvasElement;
  await waitFor(() => expect((screen.getByRole('button', {name: 'Download PNG'}) as HTMLButtonElement).disabled).toBe(false));
  const download = screen.getByRole('button', {name: 'Download PNG'});
  expect(screen.getByRole('complementary', {name: messages.en.composerSettings}).contains(download)).toBe(true);
  expect(screen.getByRole('dialog').querySelector('footer')).toBeNull();
  expect(screen.queryByText('PNG ready')).toBeNull();
  expect(screen.queryByText('The full image joins the color strip without cropping.')).toBeNull();
  let resolve!: (blob: Blob) => void;
  owner.export.mockImplementationOnce(
    () =>
      new Promise<Blob>((r) => {
        resolve = r;
      }),
  );
  await user.click(screen.getByRole('radio', {name: messages.en.left}));
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
  // The live preview owns one canvas, not a succession of PNG object URLs.
  expect(owner.resources.url).not.toHaveBeenCalled();
  expect(canvas.width).toBe(0);
});

it('downloads only verified PNGs with distinct names and keeps failures next to the action', async () => {
  const user = userEvent.setup(), {view, session, owner} = shareFixture();
  render(<ShareDialog {...{session, view}} t={messages.en}/>);
  await user.click(screen.getByRole('button', {name: 'Create share image'}));
  const download = screen.getByRole('button', {name: 'Download PNG'}) as HTMLButtonElement;
  expect(download.disabled).toBe(true);
  expect(download.getAttribute('aria-busy')).toBe('true');
  await waitFor(() => expect(download.disabled).toBe(false));
  await user.click(download); await user.click(download);
  const names = owner.download.mock.calls.map(call => (call as unknown as [Blob, string])[1]);
  expect(new Set(names).size).toBe(2);
  expect(owner.download.mock.calls.every(call => (call as unknown as [Blob])[0].type === 'image/png')).toBe(true);
  owner.export.mockRejectedValueOnce(new Error('decode'));
  await user.click(screen.getByRole('radio', {name: messages.en.bottom}));
  expect(download.disabled).toBe(true);
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', messages.en.exportError);
  expect(download.disabled).toBe(true);
  expect(download.getAttribute('aria-busy')).toBeNull();
  expect(owner.download).toHaveBeenCalledTimes(2);
  const close = screen.getByRole('button', {name: 'Close'});
  expect(close.textContent).toBe('');
  await user.click(close);
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(document.activeElement).toBe(screen.getByRole('button', {name: 'Create share image'}));
});

it('invalidates exports while dragging and prepares only the settled fixed-ratio composition', async () => {
  const user = userEvent.setup(), {view, session, owner} = shareFixture();
  view.source!.canvas.width = 1600; view.source!.canvas.height = 900;
  render(<ShareDialog {...{session, view}} t={messages.en}/>);
  await user.click(screen.getByRole('button', {name: 'Create share image'}));
  const download = screen.getByRole('button', {name: 'Download PNG'}) as HTMLButtonElement;
  await waitFor(() => expect(download.disabled).toBe(false));
  await user.click(screen.getByRole('combobox', {name: messages.en.outputRatio}));
  await user.click(await screen.findByRole('option', {name: '4:5 · 1080 × 1350'}));
  await waitFor(() => expect(download.disabled).toBe(false));
  const canvas = document.querySelector<HTMLCanvasElement>('[data-share-canvas]')!;
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({left: 0, top: 0, width: 108, height: 135} as DOMRect);
  const hit = document.querySelector('[data-share-image]')!;
  const before = owner.export.mock.calls.length;
  fireEvent.pointerDown(hit, {clientX: 50, clientY: 20, pointerId: 1, button: 0});
  fireEvent.pointerMove(hit, {clientX: 60, clientY: 20, pointerId: 1});
  expect(download.disabled).toBe(true);
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 220)); });
  expect(owner.export).toHaveBeenCalledTimes(before);
  fireEvent.pointerUp(hit, {clientX: 60, clientY: 20, pointerId: 1});
  await waitFor(() => expect(download.disabled).toBe(false));
  const settled = (owner.export.mock.calls.at(-1) as unknown as [ReturnType<typeof shareDefaults>])[0];
  expect(settled.frame.x).toBeGreaterThan(0);
  await user.click(screen.getByRole('radio', {name: messages.en.left}));
  await waitFor(() => expect(download.disabled).toBe(false));
  expect((owner.export.mock.calls.at(-1) as unknown as [ReturnType<typeof shareDefaults>])[0].frame.x).toBe(0);
  expect(document.querySelector('select')).toBeNull();
});

it('cancels a composer gesture with Escape and discards an old-source drag without changing palette state', () => {
  const image = document.createElement('canvas'); image.width = 1600; image.height = 900;
  const onFrame = vi.fn(), onInteraction = vi.fn(), options = {...shareDefaults(), ratio: '4:5' as const};
  const props = {image, colors: ['#112233'], options, layout: shareLayout(image, 1, options), onFrame, onInteraction, onError: vi.fn(), t: messages.en};
  const mount = render(<ShareCanvas {...props}/>);
  const canvas = document.querySelector<HTMLCanvasElement>('[data-share-canvas]')!;
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({left: 0, top: 0, width: 108, height: 135} as DOMRect);
  const hit = document.querySelector('[data-share-image]')!;
  fireEvent.pointerDown(hit, {clientX: 50, clientY: 20, pointerId: 1, button: 0});
  fireEvent.pointerMove(hit, {clientX: 60, clientY: 20, pointerId: 1});
  expect(onFrame.mock.calls.at(-1)?.[0].x).toBeGreaterThan(0);
  fireEvent.keyDown(window, {key: 'Escape'});
  expect(onFrame).toHaveBeenLastCalledWith(options.frame);
  expect(onInteraction).toHaveBeenLastCalledWith(false);
  fireEvent.pointerDown(hit, {clientX: 50, clientY: 20, pointerId: 2, button: 0});
  const calls = onFrame.mock.calls.length;
  const replacement = document.createElement('canvas'); replacement.width = 500; replacement.height = 500;
  mount.rerender(<ShareCanvas {...props} image={replacement} layout={shareLayout(replacement, 1, options)}/>);
  fireEvent.pointerUp(hit, {clientX: 60, clientY: 20, pointerId: 2});
  expect(onFrame).toHaveBeenCalledTimes(calls);
  fireEvent.keyDown(canvas, {key: '+'});
  expect(onFrame.mock.calls.at(-1)?.[0].zoom).toBeGreaterThan(1);
});

it('keeps only compact controls and discards a late PNG after the source is replaced', async () => {
  const user = userEvent.setup(), {view, session, owner} = shareFixture();
  const mount = render(<ShareDialog {...{session, view}} t={messages.en}/>);
  await user.click(screen.getByRole('button', {name: 'Create share image'}));
  const download = () => screen.getByRole('button', {name: 'Download PNG'}) as HTMLButtonElement;
  await waitFor(() => expect(download().disabled).toBe(false));
  expect(screen.getAllByRole('combobox')).toHaveLength(2);
  expect(screen.queryByRole('textbox')).toBeNull();
  expect(screen.queryByRole('checkbox')).toBeNull();
  expect(document.querySelector('[data-share-image]')).toBeNull();
  let resolve!: (blob: Blob) => void;
  owner.export.mockImplementationOnce(() => new Promise<Blob>(done => {resolve = done;}));
  await user.click(screen.getByRole('radio', {name: messages.en.bottom}));
  expect(download().disabled).toBe(true);
  await waitFor(() => expect(resolve).toBeTypeOf('function'));
  view.source = {...view.source!, url: 'blob:replacement'}; view.version++;
  mount.rerender(<ShareDialog {...{session, view}} t={messages.en}/>);
  await act(async () => resolve(new Blob(['late'], {type: 'image/png'})));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(owner.download).not.toHaveBeenCalled();
});

it('rejects unreadable extreme original shapes without allocating/exporting and allows a fixed ratio instead', async () => {
  const user = userEvent.setup(), {view, session, owner} = shareFixture();
  view.source!.canvas.width = 1; view.source!.canvas.height = 1600;
  render(<ShareDialog {...{session, view}} t={messages.en}/>);
  await user.click(screen.getByRole('button', {name: 'Create share image'}));
  expect(screen.getByRole('alert').textContent).toContain(messages.en.layoutError);
  expect((screen.getByRole('button', {name: 'Download PNG'}) as HTMLButtonElement).disabled).toBe(true);
  expect(owner.export).not.toHaveBeenCalled();
  expect(document.querySelector('[data-share-canvas]')).toBeNull();
  await user.click(screen.getByRole('combobox', {name: messages.en.outputRatio}));
  await user.click(await screen.findByRole('option', {name: '1:1 · 1200 × 1200'}));
  await waitFor(() => expect((screen.getByRole('button', {name: 'Download PNG'}) as HTMLButtonElement).disabled).toBe(false));
  expect(document.querySelector('[data-share-canvas]')).toBeTruthy();
});
