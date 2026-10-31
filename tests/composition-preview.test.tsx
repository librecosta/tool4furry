import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { CompositionPreview } from '../src/tools/image-resize-crop/CompositionPreview';
import { resizeMessages } from '../src/tools/image-resize-crop/messages';
import type { ResizeView } from '../src/tools/image-resize-crop/session';

afterEach(() => vi.restoreAllMocks());
it('draws a bounded composition immediately, follows crop changes without encoding, and releases its canvas', () => {
  const drawImage = vi.fn(), fillRect = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((() => ({clearRect: vi.fn(), drawImage, fillRect})) as unknown as HTMLCanvasElement['getContext']);
  const encode = vi.spyOn(HTMLCanvasElement.prototype, 'toBlob');
  const view = {
    source: {width: 2400, height: 1600},
    crop: {x: 0, y: 0, width: 2400, height: 1600},
    output: {width: 2400, height: 1600, format: 'png', background: '#123456'},
  } as ResizeView;
  const {container, rerender, unmount} = render(<CompositionPreview view={view} url="blob:bounded-preview" t={resizeMessages.en}/>);
  const image = container.querySelector('img')!;
  Object.defineProperties(image, {complete: {value: true}, naturalWidth: {value: 1200}, naturalHeight: {value: 800}});
  fireEvent.load(image);
  const canvas = screen.getByRole('img', {name: 'Composition'}) as HTMLCanvasElement;
  expect([canvas.width, canvas.height]).toEqual([1200, 800]);
  expect(drawImage).toHaveBeenLastCalledWith(image, 0, 0, 1200, 800, 0, 0, 1200, 800);
  rerender(<CompositionPreview view={{...view, crop: {x: 600, y: 400, width: 1200, height: 800}, output: {...view.output, width: 600, height: 400, format: 'jpeg'}}} url="blob:bounded-preview" t={resizeMessages.en}/>);
  expect(drawImage).toHaveBeenLastCalledWith(image, 300, 200, 600, 400, 0, 0, 600, 400);
  expect(fillRect).toHaveBeenCalledWith(0, 0, 600, 400);
  expect(encode).not.toHaveBeenCalled();
  unmount();
  expect([canvas.width, canvas.height]).toEqual([0, 0]);
});

it('reports a failed preview image instead of showing it as an output', () => {
  const {container} = render(<CompositionPreview view={{} as ResizeView} url="blob:broken-preview" t={resizeMessages.en}/>);
  fireEvent.error(container.querySelector('img')!);
  expect(screen.getByRole('alert').textContent).toBe(resizeMessages.en.preview.viewer.error);
  expect(screen.queryByRole('img')).toBeNull();
});
