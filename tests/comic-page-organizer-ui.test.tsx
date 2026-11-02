import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ComicPageOrganizer from '../src/tools/comic-page-organizer/ComicPageOrganizer';
import { acceptImage } from '../src/tools/image/browser-codec';
import { setViewport } from './setup';

vi.mock('../src/tools/image/browser-codec', () => ({acceptImage: vi.fn()}));
vi.mock('../src/tools/image/ImagePreviewViewport', () => ({ImagePreviewViewport: ({src, alt}: {src: string; alt: string}) => <img src={src} alt={alt}/>}));
const file = (name: string) => new File(['original'], name, {type: 'image/png'});
let resize: () => void;
beforeEach(() => {
  setViewport();
  vi.stubGlobal('ResizeObserver', class {constructor(callback: () => void) {resize = callback;} observe() {} disconnect() {}});
  vi.stubGlobal('PointerEvent', class extends MouseEvent {
    pointerId: number; pointerType: string; isPrimary: boolean;
    constructor(type: string, init: MouseEventInit & {pointerId?: number; pointerType?: string; isPrimary?: boolean}) {
      super(type, init); this.pointerId = init.pointerId ?? 1; this.pointerType = init.pointerType ?? 'mouse'; this.isPrimary = init.isPrimary ?? true;
    }
  });
  vi.mocked(acceptImage).mockImplementation(async f => {
    if (f.name === 'broken.png') throw new Error('decode');
    return {file: f, blob: f, width: 40, height: 60, info: {format: 'png', width: 40, height: 60, orientation: 1}};
  });
  vi.stubGlobal('URL', Object.assign(URL, {createObjectURL: vi.fn(() => `blob:${Math.random()}`), revokeObjectURL: vi.fn()}));
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function(this: HTMLElement) {
    if (this.matches('[data-page-id]')) return new DOMRect(parseFloat(this.style.left), parseFloat(this.style.top), parseFloat(this.style.width), parseFloat(this.style.height));
    return new DOMRect(0, 0, 640, 400);
  });
});
afterEach(() => {vi.useRealTimers(); vi.restoreAllMocks();});
async function load(names = ['10.png', '2.png', '1.png']) {
  const rendered = render(<ComicPageOrganizer locale="en" region="global"/>);
  fireEvent.change(screen.getByLabelText('Choose images or drop them here', {selector: 'input'}), {target: {files: names.map(file)}});
  await waitFor(() => expect(screen.getByRole('button', {name: 'Download CBZ'}).hasAttribute('disabled')).toBe(false));
  return rendered;
}
const pages = () => [...document.querySelectorAll<HTMLElement>('[data-page-id]')];
const names = () => pages().map(node => node.querySelector('[title]')?.textContent);

it('shows only image overlays, three actions and actual page numbers, with no cover or move buttons', async () => {
  await load(); expect(names()).toEqual(['1.png', '2.png', '10.png']);
  expect(pages().every(page => page.querySelectorAll('button').length === 3)).toBe(true);
  expect(pages().map(page => page.querySelector('[data-page-number]')?.textContent)).toEqual(['01', '02', '03']);
  expect(screen.getByText('3 images')).not.toBeNull();
  expect(screen.queryByRole('button', {name: /cover|Move earlier|Move later/i})).toBeNull();
  expect(pages().every(page => !page.draggable)).toBe(true);
  expect(screen.getAllByRole('checkbox')).toHaveLength(3);
});

it('reorders by image pointer gestures, preserves stable identity and resets order', async () => {
  await load(); const last = pages()[2], id = last.dataset.pageId;
  fireEvent.pointerDown(last, {clientX: 300, clientY: 80, button: 0});
  fireEvent.pointerMove(document, {clientX: 5, clientY: 80});
  expect(document.querySelector('[data-comic-drag-preview]')).not.toBeNull();
  expect(names()).toEqual(['1.png', '2.png', '10.png']);
  fireEvent.pointerUp(document, {clientX: 5, clientY: 80});
  expect(names()).toEqual(['10.png', '1.png', '2.png']); expect(pages()[0].dataset.pageId).toBe(id);
  expect(document.querySelector('[data-comic-drag-preview]')).toBeNull();
  fireEvent.click(screen.getByRole('button', {name: 'Reset Order'}));
  expect(names()).toEqual(['1.png', '2.png', '10.png']);
});

it('keeps keyboard reorder accessible without arrow buttons and ignores keys from overlay controls', async () => {
  await load(); const first = pages()[0];
  fireEvent.keyDown(first, {key: ' '}); fireEvent.keyDown(first, {key: 'End'});
  expect(names()).toEqual(['2.png', '10.png', '1.png']); expect(pages()[2]).toBe(first);
  fireEvent.keyDown(first, {key: 'Escape'}); expect(names()).toEqual(['1.png', '2.png', '10.png']);
  fireEvent.keyDown(screen.getByRole('checkbox', {name: 'Select page 1'}), {key: 'ArrowRight', altKey: true});
  expect(names()).toEqual(['1.png', '2.png', '10.png']);
  fireEvent.keyDown(first, {key: 'ArrowRight', altKey: true}); expect(names()).toEqual(['2.png', '1.png', '10.png']);
});

it('supports touch long-press sorting, native scroll before activation and multi-touch cancellation', async () => {
  await load(); vi.useFakeTimers();
  const point = (x: number, y = 80) => ({clientX: x, clientY: y, identifier: 1});
  fireEvent.touchStart(pages()[2], {touches: [point(300)]});
  const scrolling = new TouchEvent('touchmove', {bubbles: true, cancelable: true, touches: [point(300, 110) as Touch]});
  fireEvent(document, scrolling); expect(scrolling.defaultPrevented).toBe(false);
  await act(() => vi.advanceTimersByTimeAsync(240)); expect(document.querySelector('[data-comic-drag-preview]')).toBeNull();
  fireEvent.touchStart(pages()[2], {touches: [point(300)]}); await act(() => vi.advanceTimersByTimeAsync(225));
  const dragging = new TouchEvent('touchmove', {bubbles: true, cancelable: true, touches: [point(5) as Touch]});
  fireEvent(document, dragging); expect(dragging.defaultPrevented).toBe(true);
  fireEvent.touchEnd(document, {touches: [], changedTouches: [point(5)]}); expect(names()).toEqual(['10.png', '1.png', '2.png']);
  fireEvent.touchStart(pages()[0], {touches: [point(10)]}); await act(() => vi.advanceTimersByTimeAsync(225));
  fireEvent.touchMove(document, {touches: [point(50), {...point(100), identifier: 2}]});
  expect(document.querySelector('[data-comic-drag-preview]')).toBeNull(); expect(names()).toEqual(['10.png', '1.png', '2.png']);
});

it('does not initiate sorting from overlays and handles selection, batch removal and clear', async () => {
  await load();
  fireEvent.pointerDown(screen.getByRole('checkbox', {name: 'Select page 1'}), {clientX: 20, clientY: 10});
  fireEvent.pointerMove(document, {clientX: 200, clientY: 100}); expect(document.querySelector('[data-comic-drag-preview]')).toBeNull();
  fireEvent.click(screen.getByRole('checkbox', {name: 'Select page 1'}));
  expect(screen.getByRole('checkbox', {name: 'Deselect page 1'}).getAttribute('aria-checked')).toBe('true');
  fireEvent.click(screen.getByRole('checkbox', {name: 'Select page 3'}));
  fireEvent.click(screen.getByRole('button', {name: 'Remove selected (2)'})); expect(names()).toEqual(['2.png']);
  fireEvent.click(screen.getByRole('button', {name: 'Select all'})); expect(screen.getByRole('button', {name: 'Deselect all'})).not.toBeNull();
  fireEvent.click(screen.getByRole('button', {name: 'Deselect all'}));
  fireEvent.click(screen.getByRole('button', {name: 'Clear all'})); expect(pages()).toHaveLength(0);
});

it('reads the real sorted page order and returns focus to the preview control', async () => {
  await load(); fireEvent.keyDown(pages()[2], {key: 'Home', altKey: true});
  const trigger = screen.getByRole('button', {name: 'Read page 1'}); trigger.focus(); fireEvent.click(trigger);
  expect(await screen.findByRole('dialog')).not.toBeNull(); expect(screen.getByRole('heading', {name: '1/3 · 10.png'})).not.toBeNull();
  fireEvent.click(screen.getByRole('button', {name: 'Next page'})); expect(screen.getByRole('heading', {name: '2/3 · 1.png'})).not.toBeNull();
  fireEvent.click(screen.getByRole('button', {name: 'Previous page'})); expect(screen.getByRole('heading', {name: '1/3 · 10.png'})).not.toBeNull();
  fireEvent.click(screen.getByRole('button', {name: 'Close'})); await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  await waitFor(() => expect(document.activeElement).toBe(trigger));
  fireEvent.click(screen.getByRole('button', {name: 'Remove page 1'})); expect(names()).toEqual(['1.png', '2.png']);
});

it('changes layout without reordering or allocating URLs, and cancels active gestures on removal/unmount', async () => {
  const {unmount} = await load(); const urls = vi.mocked(URL.createObjectURL).mock.calls.length;
  Object.defineProperty(screen.getByRole('list', {name: 'Pages'}), 'clientWidth', {value: 390, configurable: true});
  act(() => resize()); expect(names()).toEqual(['1.png', '2.png', '10.png']); expect(URL.createObjectURL).toHaveBeenCalledTimes(urls);
  fireEvent.pointerDown(pages()[0], {clientX: 20, clientY: 80}); fireEvent.pointerMove(document, {clientX: 200, clientY: 80});
  fireEvent.click(screen.getByRole('button', {name: 'Remove page 1'})); expect(document.querySelector('[data-comic-drag-preview]')).toBeNull();
  unmount(); expect(URL.revokeObjectURL).toHaveBeenCalledTimes(urls);
  fireEvent.pointerUp(document, {clientX: 10, clientY: 80}); expect(document.querySelector('[data-comic-drag-preview]')).toBeNull();
});

it('keeps folder import and privacy disclosure; errors have no invented image and cannot preview', async () => {
  const {unmount} = await load(['valid.png', 'broken.png']); const broken = pages()[0];
  expect(within(broken).getAllByText('Could not read this image').length).toBeGreaterThan(0);
  expect(within(broken).getByRole('button', {name: 'Read page 1'}).hasAttribute('disabled')).toBe(true); expect(broken.querySelector('img')).toBeNull();
  const folder = screen.getByLabelText('Add folder'); expect(folder.getAttribute('webkitdirectory')).toBe('');
  fireEvent.change(folder, {target: {files: [file('page20.png'), file('page3.png')]}});
  await waitFor(() => expect(screen.getByRole('button', {name: 'Download ZIP'}).hasAttribute('disabled')).toBe(false));
  expect(names()).toEqual(['broken.png', 'valid.png', 'page3.png', 'page20.png']);
  expect(screen.getByText('Original image bytes are kept, including any source metadata. This tool does not clean private metadata.').closest('details')?.hasAttribute('open')).toBe(false);
  expect(document.querySelectorAll('select')).toHaveLength(0); const created = vi.mocked(URL.createObjectURL).mock.calls.length;
  unmount(); expect(URL.revokeObjectURL).toHaveBeenCalledTimes(created);
});
