import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { Tooltip } from '@base-ui/react/tooltip';
import userEvent from '@testing-library/user-event';
import { PdfPagePreview } from '../src/tools/pdf-split/PdfPagePreview';
import { enlargedSize, type PreviewSession } from '../src/tools/pdf-split/preview-session';

const createUrl = vi.fn(() => 'blob:page-preview');
const revokeUrl = vi.fn();
const renderPage = vi.fn(async (_page: number, canvas: HTMLCanvasElement, _size: typeof enlargedSize, _signal: AbortSignal) => {
  canvas.width = 1100; canvas.height = 1555;
});
const session = { render: renderPage } as unknown as PreviewSession;
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('URL', class extends URL { static createObjectURL = createUrl; static revokeObjectURL = revokeUrl; });
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(callback => callback(new Blob(['preview'], { type: 'image/png' })));
  const original = HTMLElement.prototype.getBoundingClientRect;
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    return this.hasAttribute('data-image-preview-viewport') ? new DOMRect(0, 0, 800, 600) : original.call(this);
  });
});
const preview = (page = 1) => <Tooltip.Provider><PdfPagePreview session={session} page={page} locale="en" /></Tooltip.Provider>;

it('uses the bounded page render in the interactive viewer, supports zoom/keyboard pan/fit, and releases its URL and canvas', async () => {
  const user = userEvent.setup();
  const { unmount } = render(preview());
  const image = await screen.findByRole('img', { name: 'Preview of page 1' });
  fireEvent.load(image);
  const actual = screen.getByRole('button', { name: 'Actual size' });
  // The asynchronous raster mounts a separate viewer. Wait for its loaded state
  // and React's committed interaction updates, rather than reading a prior fit.
  await waitFor(() => expect(actual).toHaveProperty('disabled', false));
  const viewport = screen.getByRole('region', { name: 'PDF page preview' });
  const fitted = image.style.transform;
  expect(fitted).toContain(`scale(${600 / 1555})`);
  await user.click(actual);
  await waitFor(() => expect(image.style.transform).toContain('scale(1)'));
  fireEvent.wheel(viewport, { deltaY: -100, clientX: 400, clientY: 300 });
  await waitFor(() => expect(image.style.transform).toContain(`scale(${Math.exp(0.2)})`));
  fireEvent.keyDown(viewport, { key: 'ArrowRight' });
  await waitFor(() => expect(image.style.transform).toContain('+ 40px'));
  await user.click(screen.getByRole('button', { name: 'Fit to view' }));
  await waitFor(() => expect(image.style.transform).toBe(fitted));
  const [, canvas, size, signal] = renderPage.mock.calls[0];
  expect(size).toBe(enlargedSize);
  expect(canvas.width * canvas.height).toBe(0);
  unmount();
  expect(signal.aborted).toBe(true);
  expect(revokeUrl).toHaveBeenCalledExactlyOnceWith('blob:page-preview');
});

it('aborts a pending page and never publishes or retains a late raster after closing', async () => {
  let finish!: () => void;
  renderPage.mockImplementationOnce((_page, canvas) => new Promise(resolve => {
    canvas.width = 1100; canvas.height = 1555; finish = resolve;
  }));
  const { unmount } = render(preview());
  const [, canvas, , signal] = renderPage.mock.calls[0];
  unmount();
  expect(signal.aborted).toBe(true);
  expect(canvas.width * canvas.height).toBe(0);
  await act(async () => finish());
  expect(createUrl).not.toHaveBeenCalled();
  expect(HTMLCanvasElement.prototype.toBlob).not.toHaveBeenCalled();
});

it('ignores late PNG encoding on page replacement and releases the previous URL', async () => {
  let finish!: BlobCallback;
  vi.mocked(HTMLCanvasElement.prototype.toBlob).mockImplementationOnce(callback => { finish = callback; });
  const { rerender, unmount } = render(preview());
  await waitFor(() => expect(finish).toBeTypeOf('function'));
  rerender(preview(2));
  await screen.findByRole('img', { name: 'Preview of page 2' });
  await act(async () => finish(new Blob(['stale'])));
  expect(createUrl).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('img', { name: 'Preview of page 1' })).toBeNull();
  rerender(preview(3));
  await screen.findByRole('img', { name: 'Preview of page 3' });
  expect(revokeUrl).toHaveBeenCalledTimes(1);
  unmount();
  expect(revokeUrl).toHaveBeenCalledTimes(2);
});

it('reports render/PNG encoding failures instead of showing a false preview', async () => {
  renderPage.mockRejectedValueOnce(new Error('render failed'));
  const { rerender } = render(preview());
  expect((await screen.findByRole('alert')).textContent).toBe('Page preview unavailable');
  expect(createUrl).not.toHaveBeenCalled();
  vi.mocked(HTMLCanvasElement.prototype.toBlob).mockImplementationOnce(callback => callback(null));
  rerender(preview(2));
  await waitFor(() => expect(HTMLCanvasElement.prototype.toBlob).toHaveBeenCalledOnce());
  expect((await screen.findByRole('alert')).textContent).toBe('Page preview unavailable');
  expect(screen.queryByRole('img')).toBeNull();
});
