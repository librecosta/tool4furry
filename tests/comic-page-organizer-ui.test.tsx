import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ComicPageOrganizer from '../src/tools/comic-page-organizer/ComicPageOrganizer';
import { inspectComic as acceptImage } from '../src/tools/comic-page-organizer/source';
import { setViewport } from './setup';
import userEvent from '@testing-library/user-event';

vi.mock('../src/tools/comic-page-organizer/source', () => ({inspectComic: vi.fn(), comicThumbnail: vi.fn(async source => source.blob), verifyComic: vi.fn(async () => {})}));
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
  await waitFor(() => expect(screen.getByRole('button', {name: 'Package & download'}).hasAttribute('disabled')).toBe(false));
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
  expect([...pages()[0].querySelectorAll('button')].map(button => button.getAttribute('aria-label'))).toEqual(['Select page 1','Read page 1','Remove page 1']);
  expect(screen.getByRole('radio', {name: 'ZIP'}).getAttribute('aria-checked')).toBe('true');
  fireEvent.click(screen.getByRole('radio', {name: 'PDF'})); expect(screen.getByRole('button', {name: 'Export PDF'})).not.toBeNull();
  fireEvent.keyDown(screen.getByRole('radio', {name: 'PDF'}), {key: 'ArrowLeft'}); expect(screen.getByRole('radio', {name: 'CBZ'}).getAttribute('aria-checked')).toBe('true');
  expect(screen.getByRole('button', {name: 'Package & download'})).not.toBeNull();
});

it('validates prefix drafts, preserves mode settings and ignores archive parameters for PDF', async () => {
  await load(); const user=userEvent.setup();
  expect((screen.getByLabelText('Page name prefix') as HTMLInputElement).value).toBe('page');
  expect(screen.getByRole('combobox',{name:'Image format'}).textContent).toContain('Keep original format');
  fireEvent.change(screen.getByLabelText('Page name prefix'),{target:{value:'../bad'}});
  expect(screen.getByRole('button',{name:'Package & download'}).hasAttribute('disabled')).toBe(true);
  expect(screen.getByRole('alert').textContent).toContain('safe filename prefix');
  fireEvent.change(screen.getByLabelText('Page name prefix'),{target:{value:'漫画'}});
  await user.click(screen.getByRole('combobox',{name:'Image format'}));
  await user.click(await screen.findByRole('option',{name:'JPEG'}));
  expect(screen.getByRole('button',{name:'Balanced'}).getAttribute('aria-pressed')).toBe('true');
  fireEvent.click(screen.getByRole('button',{name:'Stronger'}));
  fireEvent.click(screen.getByRole('button',{name:'Advanced'}));
  expect(screen.getByRole('slider',{name:'Image quality'}).getAttribute('aria-valuenow')).toBe('70');
  fireEvent.change(screen.getByLabelText('JPEG background'),{target:{value:'#112233'}});
  fireEvent.click(screen.getByRole('button',{name:'Restore recommended quality'}));
  fireEvent.click(screen.getByRole('button',{name:'Quick'}));
  expect(screen.getByRole('button',{name:'Balanced'}).getAttribute('aria-pressed')).toBe('true');
  fireEvent.click(screen.getByRole('button',{name:'Advanced'}));
  expect((screen.getByLabelText('JPEG background') as HTMLInputElement).value).toBe('#112233');
  fireEvent.change(screen.getByLabelText('JPEG background'),{target:{value:'#12'}});
  fireEvent.click(screen.getByRole('button',{name:'Quick'}));
  expect(screen.getByRole('alert').textContent).toContain('six-digit HEX');
  expect(screen.getByRole('button',{name:'Package & download'}).hasAttribute('disabled')).toBe(true);
  fireEvent.click(screen.getByRole('button',{name:'Advanced'}));
  fireEvent.change(screen.getByLabelText('JPEG background'),{target:{value:'#112233'}});
  fireEvent.change(screen.getByLabelText('Page name prefix'),{target:{value:'../bad'}});
  fireEvent.click(screen.getByRole('radio',{name:'PDF'}));
  expect(screen.queryByLabelText('Page name prefix')).toBeNull(); expect(screen.getByRole('button',{name:'Export PDF'}).hasAttribute('disabled')).toBe(false);
  fireEvent.click(screen.getByRole('radio',{name:'ZIP'}));
  expect(screen.getByRole('button',{name:'Advanced'}).getAttribute('aria-pressed')).toBe('true'); expect(names()).toEqual(['1.png','2.png','10.png']);
});

it('hides lossy quality for PNG and shows CBZ reader compatibility only when applicable', async () => {
  await load(); const user=userEvent.setup();
  await user.click(screen.getByRole('combobox',{name:'Image format'})); await user.click(await screen.findByRole('option',{name:'PNG'}));
  fireEvent.click(screen.getByRole('button',{name:'Advanced'})); expect(screen.queryByRole('slider')).toBeNull(); expect(screen.queryByLabelText('JPEG background')).toBeNull();
  await user.click(screen.getByRole('combobox',{name:'Image format'})); await user.click(await screen.findByRole('option',{name:'WEBP'}));
  expect(screen.queryByText('Some comic readers cannot display WebP or AVIF pages.')).toBeNull();
  fireEvent.click(screen.getByRole('radio',{name:'CBZ'})); expect(screen.getByText('Some comic readers cannot display WebP or AVIF pages.')).not.toBeNull();
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
  await waitFor(() => expect(screen.getByRole('button', {name: 'Package & download'}).hasAttribute('disabled')).toBe(false));
  expect(names()).toEqual(['broken.png', 'valid.png', 'page3.png', 'page20.png']);
  expect(screen.getByText(/^Keep original format preserves source bytes and metadata/).closest('details')?.hasAttribute('open')).toBe(false);
  expect(document.querySelectorAll('select')).toHaveLength(0); const created = vi.mocked(URL.createObjectURL).mock.calls.length;
  unmount(); expect(URL.revokeObjectURL).toHaveBeenCalledTimes(created);
});

async function loadLarge() {
  render(<ComicPageOrganizer locale="en" region="global"/>);
  const files = Array.from({length:10},(_,i)=>{const f=file(`${i}.png`); Object.defineProperty(f,'size',{value:10*1024**2}); return f;});
  fireEvent.change(screen.getByLabelText('Choose images or drop them here',{selector:'input'}),{target:{files}});
  await waitFor(()=>expect(screen.getByRole('button',{name:'Read page 10'}).hasAttribute('disabled')).toBe(false));
}
it('clearly disables over-limit Blob exports when direct file saving is unavailable', async () => {
  await loadLarge();
  expect(screen.getByRole('button',{name:'Package & download'}).hasAttribute('disabled')).toBe(true);
  expect(screen.getByRole('alert').textContent).toContain('exceeds this browser’s download limit');
});
it('opens a save picker only from the large export click and discards a cancelled late selection', async () => {
  let choose!: (value: {createWritable: ReturnType<typeof vi.fn>}) => void;
  const picker=vi.fn((_options: unknown)=>new Promise(resolve=>{choose=resolve;})), createWritable=vi.fn();
  vi.stubGlobal('isSecureContext',true); vi.stubGlobal('showSaveFilePicker',picker);
  await loadLarge(); expect(picker).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Package & download'}));
  expect(picker).toHaveBeenCalledOnce(); expect(picker.mock.calls[0][0]).toMatchObject({suggestedName:expect.stringMatching(/\.zip$/)});
  expect(screen.getByRole('button',{name:'Package & download'}).getAttribute('aria-busy')).toBe('true');
  fireEvent.click(screen.getByRole('button',{name:'Cancel'}));
  await act(async()=>{choose({createWritable});});
  await waitFor(()=>expect(screen.getByText('Export cancelled.')).not.toBeNull());
  expect(createWritable).not.toHaveBeenCalled();
});
