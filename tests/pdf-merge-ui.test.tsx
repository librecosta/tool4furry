import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { Tooltip } from '@base-ui/react/tooltip';
import PdfMerge from '../src/tools/pdf-merge/PdfMerge';
import { readPdf, mergePdfs } from '../src/tools/general/pdf';
import { saveBlob } from '../src/tools/general/ui';
import { setViewport } from './setup';

vi.mock('../src/tools/general/pdf', () => ({ readPdf: vi.fn(), mergePdfs: vi.fn() }));
vi.mock('../src/tools/general/ui', async original => ({ ...await original<typeof import('../src/tools/general/ui')>(), saveBlob: vi.fn() }));
const file = (name: string) => new File([`original ${name}`], name, { type: 'application/pdf' });
const names = () => [...document.querySelectorAll('[data-pdf-file-name]')].map(node => node.textContent);
const rows = () => [...document.querySelectorAll<HTMLElement>('[data-pdf-file-id]')];
const download = () => screen.getByRole('button', { name: 'Download' }) as HTMLButtonElement;
const output = () => new Blob(['%PDF-validated'], { type: 'application/pdf' });
beforeEach(() => {
  setViewport();
  // jsdom has no Web Animations timeline. Movement itself is verified in Chromium.
  Object.defineProperty(document, 'getAnimations', { configurable: true, value: () => [] });
  Object.defineProperty(Element.prototype, 'getAnimations', { configurable: true, value: () => [] });
  Object.defineProperty(Element.prototype, 'animate', { configurable: true,
    value: () => ({ finished: Promise.resolve(), cancel() {}, finish() {} }) });
  vi.mocked(readPdf).mockImplementation(async f => ({ getPageCount: () => f.name.charCodeAt(0) - 64 }) as Awaited<ReturnType<typeof readPdf>>);
  vi.mocked(mergePdfs).mockImplementation(async () => output());
  vi.stubGlobal('PointerEvent', class extends MouseEvent {
    pointerId: number; pointerType: string; isPrimary = true;
    constructor(type: string, init: MouseEventInit & { pointerId?: number; pointerType?: string }) {
      super(type, init); this.pointerId = init.pointerId ?? 1; this.pointerType = init.pointerType ?? 'mouse';
    }
  });
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function(this: HTMLElement) {
    const index = rows().indexOf(this);
    return index < 0 ? new DOMRect(0, 0, 600, 400) : new DOMRect(0, 100 + index * 70, 600, 60);
  });
});
afterEach(() => {
  vi.useRealTimers(); vi.clearAllMocks();
  Reflect.deleteProperty(document, 'getAnimations');
  Reflect.deleteProperty(Element.prototype, 'getAnimations');
  Reflect.deleteProperty(Element.prototype, 'animate');
});
function setup(locale: 'zh' | 'en' = 'en') {
  return render(<Tooltip.Provider><PdfMerge locale={locale} region="global" /></Tooltip.Provider>);
}
async function add(list = ['A.pdf', 'B.pdf', 'C.pdf']) {
  fireEvent.change(screen.getByLabelText('Choose files or drop them here', { selector: 'input' }), { target: { files: list.map(file) } });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Merge' }).getAttribute('aria-busy')).toBeNull());
}
async function merge() {
  fireEvent.click(screen.getByRole('button', { name: 'Merge' }));
  await waitFor(() => expect(download().disabled).toBe(false));
}

it.each(['en', 'zh'] as const)('keeps all three actions present in %s, with no download until a valid result exists', locale => {
  const { container } = setup(locale);
  const actions = container.querySelector('[data-pdf-actions]')!;
  expect([...actions.querySelectorAll('button')].map(button => button.textContent)).toEqual(locale === 'en'
    ? ['Merge', 'Download', 'Clear'] : ['合并 PDF', '下载 PDF', '清空']);
  expect(actions.querySelectorAll('button')[0].disabled).toBe(true);
  expect(actions.querySelectorAll('button')[1].disabled).toBe(true);
});

it('merges the latest keyboard order, preserves metadata and invalidates downloads after reorder, removal and intake', async () => {
  setup(); await add();
  expect(names()).toEqual(['A.pdf', 'B.pdf', 'C.pdf']);
  expect(screen.queryByRole('button', { name: /Move up|Move down/ })).toBeNull();
  await merge(); fireEvent.click(download());
  expect(saveBlob).toHaveBeenCalledWith(expect.any(Blob), 'merged.pdf');
  const handle = screen.getByRole('button', { name: 'Reorder A.pdf' }); handle.focus();
  fireEvent.keyDown(handle, { key: 'ArrowDown' });
  expect(names()).toEqual(['B.pdf', 'A.pdf', 'C.pdf']);
  expect(document.activeElement).toBe(handle);
  expect(screen.getAllByRole('status').some(el => el.textContent?.includes('position 2 of 3'))).toBe(true);
  expect(rows()[0].textContent).toContain('2 pages');
  expect(download().disabled).toBe(true);
  await merge();
  expect(vi.mocked(mergePdfs).mock.calls.at(-1)![0].map(file => file.name)).toEqual(['B.pdf', 'A.pdf', 'C.pdf']);
  fireEvent.click(screen.getByRole('button', { name: 'Remove A.pdf' }));
  expect(names()).toEqual(['B.pdf', 'C.pdf']); expect(download().disabled).toBe(true);
  await merge(); await add(['D.pdf']); expect(download().disabled).toBe(true);
  expect(names()).toEqual(['B.pdf', 'C.pdf', 'D.pdf']);
});

it('supports first/last keyboard moves and leaves a valid result intact for a no-op move', async () => {
  setup(); await add(); await merge();
  fireEvent.keyDown(screen.getByRole('button', { name: 'Reorder A.pdf' }), { key: 'ArrowUp' });
  expect(download().disabled).toBe(false);
  fireEvent.keyDown(screen.getByRole('button', { name: 'Reorder A.pdf' }), { key: 'End' });
  expect(names()).toEqual(['B.pdf', 'C.pdf', 'A.pdf']); expect(download().disabled).toBe(true);
  fireEvent.keyDown(screen.getByRole('button', { name: 'Reorder A.pdf' }), { key: 'Home' });
  expect(names()).toEqual(['A.pdf', 'B.pdf', 'C.pdf']);
  expect(document.querySelector('[data-insert]')).toBeNull();
});

it('locks sorting/removal and duplicate submits while busy; clear cancels and rejects the late result', async () => {
  setup(); await add();
  let finish!: (blob: Blob) => void;
  vi.mocked(mergePdfs).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const start = screen.getByRole('button', { name: 'Merge' });
  fireEvent.click(start); fireEvent.click(start);
  expect(mergePdfs).toHaveBeenCalledTimes(1);
  expect(download().disabled).toBe(true);
  const remove = screen.getByRole('button', { name: 'Remove A.pdf' }) as HTMLButtonElement;
  expect(remove.disabled).toBe(true); fireEvent.click(remove);
  fireEvent.keyDown(screen.getByRole('button', { name: 'Reorder A.pdf' }), { key: 'End' });
  fireEvent.pointerDown(rows()[0], { clientX: 20, clientY: 120, button: 0 });
  fireEvent.pointerMove(document, { clientX: 20, clientY: 310 });
  expect(names()).toEqual(['A.pdf', 'B.pdf', 'C.pdf']); expect(document.querySelector('[data-dragging]')).toBeNull();
  const signal = vi.mocked(mergePdfs).mock.calls[0][1]!;
  fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
  expect(signal.aborted).toBe(true); expect(names()).toEqual([]);
  await act(async () => { finish(output()); });
  expect(download().disabled).toBe(true); expect((start as HTMLButtonElement).disabled).toBe(true);
});

it('clears files/results and ignores an unfinished intake after unmount', async () => {
  const { unmount } = setup(); await add(); await merge();
  fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
  expect(names()).toEqual([]); expect(download().disabled).toBe(true);
  let finish!: (doc: Awaited<ReturnType<typeof readPdf>>) => void;
  vi.mocked(readPdf).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  fireEvent.change(screen.getByLabelText('Choose files or drop them here', { selector: 'input' }),
    { target: { files: [file('D.pdf')] } });
  unmount();
  await act(async () => { finish({ getPageCount: () => 4 } as Awaited<ReturnType<typeof readPdf>>); });
  expect(document.querySelector('[data-pdf-file-list]')).toBeNull();
});
