import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { Tooltip } from '@base-ui/react/tooltip';
import PdfSplit from '../src/tools/pdf-split/PdfSplit';
import { readPdf } from '../src/tools/general/pdf';
import { createOutput } from '../src/tools/pdf-split/output';
import { saveBlob } from '../src/tools/general/ui';
import { openPreview } from '../src/tools/pdf-split/preview-engine';
import { setViewport } from './setup';

vi.mock('../src/tools/general/pdf', async original => ({ ...await original<typeof import('../src/tools/general/pdf')>(), readPdf: vi.fn() }));
vi.mock('../src/tools/pdf-split/output', async original => ({ ...await original<typeof import('../src/tools/pdf-split/output')>(), createOutput: vi.fn() }));
vi.mock('../src/tools/pdf-split/preview-engine', () => ({ openPreview: vi.fn() }));
vi.mock('../src/tools/general/ui', async original => ({ ...await original<typeof import('../src/tools/general/ui')>(), saveBlob: vi.fn() }));
const sessions: { render: ReturnType<typeof vi.fn>; destroy: ReturnType<typeof vi.fn> }[] = [];
beforeEach(() => {
  setViewport(); vi.clearAllMocks(); sessions.length = 0;
  vi.mocked(readPdf).mockImplementation(async file => {
    const count = file.name.startsWith('long') ? 500 : file.name.startsWith('new') ? 2 : 10;
    return { getPageCount: () => count, getPageIndices: () => Array.from({ length: count }, (_, i) => i) } as Awaited<ReturnType<typeof readPdf>>;
  });
  vi.mocked(createOutput).mockResolvedValue(new Blob(['validated in core test'], { type: 'application/pdf' }));
  vi.mocked(openPreview).mockImplementation(async () => {
    const session = { render: vi.fn(async () => {}), destroy: vi.fn(async () => {}) };
    sessions.push(session); return session as unknown as Awaited<ReturnType<typeof openPreview>>;
  });
});
function setup(locale: 'zh' | 'en' = 'en') { render(<Tooltip.Provider><PdfSplit locale={locale} region="cn" /></Tooltip.Provider>); }
async function upload(name = 'ten.pdf') {
  fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [new File(['actual parsing mocked only here'], name, { type: 'application/pdf' })] } });
  await screen.findByText(name);
  await waitFor(() => expect(screen.getByLabelText(/Page range|页码范围/)).toHaveProperty('value', name.startsWith('long') ? '1-500' : name.startsWith('new') ? '1-2' : '1-10'));
}
const selected = () => [...document.querySelectorAll('[data-page-number][data-selected]')].map(e => Number(e.getAttribute('data-page-number')));
const download = () => screen.getByRole('button', { name: /^(Download|下载)$/ }) as HTMLButtonElement;

it('keeps three actions visible, defaults all pages, and synchronizes clicks and ordered manual ranges', async () => {
  setup(); expect(download().disabled).toBe(true);
  expect(document.querySelector('[data-pdf-split-actions]')!.children).toHaveLength(3);
  await upload(); expect(selected()).toEqual([1,2,3,4,5,6,7,8,9,10]);
  for (const n of [4,6,7,9,10]) fireEvent.click(screen.getByRole('button', { name: `Select page ${n}` }));
  expect(screen.getByLabelText('Page range')).toHaveProperty('value', '1-3,5,8');
  fireEvent.change(screen.getByLabelText('Page range'), { target: { value: '8,1-3,5' } });
  fireEvent.click(screen.getByRole('button', { name: 'Selected' }));
  expect([...document.querySelectorAll('[data-page-number]')].map(e => e.getAttribute('data-page-number'))).toEqual(['8','1','2','3','5']);
  fireEvent.click(screen.getByRole('button', { name: 'Extract' }));
  await waitFor(() => expect(download().disabled).toBe(false));
  expect(vi.mocked(createOutput).mock.calls[0][1]).toEqual([7,0,1,2,4]);
  fireEvent.click(download()); expect(saveBlob).toHaveBeenCalledWith(expect.any(Blob), 'split.pdf');
  fireEvent.click(screen.getByRole('button', { name: 'Per-page ZIP' })); expect(download().disabled).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Create ZIP' }));
  await waitFor(() => expect(download().disabled).toBe(false));
  expect(vi.mocked(createOutput).mock.calls[1][1]).toEqual([7,0,1,2,4]);
  fireEvent.click(download()); expect(saveBlob).toHaveBeenLastCalledWith(expect.any(Blob), 'split-pages.zip');
});
it('rejects empty, duplicate, reversed and out-of-range input without using the last valid selection', async () => {
  setup(); await upload();
  for (const value of ['', '1,1', '3-1', '11', 'x']) {
    fireEvent.change(screen.getByLabelText('Page range'), { target: { value } });
    expect(screen.getByRole('button', { name: 'Extract' })).toHaveProperty('disabled', true);
    expect(selected()).toEqual([]); expect(download().disabled).toBe(true);
  }
  fireEvent.click(screen.getByRole('button', { name: 'Select all' })); expect(selected()).toHaveLength(10);
  fireEvent.click(screen.getByRole('button', { name: 'Clear selection' })); expect(selected()).toHaveLength(0);
});
it('renders at most one batch for a long PDF, and applies the ZIP limit to selection, not document length', async () => {
  setup(); await upload('long.pdf');
  expect(document.querySelectorAll('[data-page-number]')).toHaveLength(24);
  fireEvent.click(screen.getByRole('button', { name: 'Next' })); expect(document.querySelector('[data-page-number]')?.getAttribute('data-page-number')).toBe('25');
  fireEvent.click(screen.getByRole('button', { name: 'Per-page ZIP' })); expect(screen.getByRole('button', { name: 'Create ZIP' })).toHaveProperty('disabled', true);
  fireEvent.change(screen.getByLabelText('Page range'), { target: { value: '491-500' } });
  expect(screen.getByRole('button', { name: 'Create ZIP' })).toHaveProperty('disabled', false);
});
it('invalidates late generation, resets new documents and destroys old preview ownership', async () => {
  setup(); await upload(); await waitFor(() => expect(sessions.length).toBe(1));
  let finish!: (blob: Blob) => void;
  vi.mocked(createOutput).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  fireEvent.click(screen.getByRole('button', { name: 'Extract' })); fireEvent.click(screen.getByRole('button', { name: 'Extract' }));
  expect(createOutput).toHaveBeenCalledTimes(1);
  fireEvent.change(screen.getByLabelText('Page range'), { target: { value: '2' } });
  await act(async () => finish(new Blob(['late']))); expect(download().disabled).toBe(true);
  await upload('new.pdf'); await waitFor(() => expect(sessions[0].destroy).toHaveBeenCalledOnce());
  expect(selected()).toEqual([1,2]);
  fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
  expect(screen.queryByLabelText('Page range')).toBeNull(); expect(document.querySelectorAll('canvas')).toHaveLength(0); expect(download().disabled).toBe(true);
});
it('does not publish a stale preview load after replacing the file; reports preview failures without blocking extraction', async () => {
  setup(); let finish!: (session: Awaited<ReturnType<typeof openPreview>>) => void;
  vi.mocked(openPreview).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  await upload(); await waitFor(() => expect(openPreview).toHaveBeenCalledTimes(1));
  await upload('new.pdf');
  const stale = { destroy: vi.fn(async () => {}), render: vi.fn(async () => {}) };
  await act(async () => finish(stale as unknown as Awaited<ReturnType<typeof openPreview>>));
  expect(stale.destroy).toHaveBeenCalledOnce(); expect(stale.render).not.toHaveBeenCalled();
  vi.mocked(openPreview).mockRejectedValueOnce(new Error('worker failed')); await upload();
  await screen.findByText('Unable to load the preview. You can still extract pages from the original PDF.');
  expect(screen.getByRole('button', { name: 'Extract' })).toHaveProperty('disabled', false);
});
