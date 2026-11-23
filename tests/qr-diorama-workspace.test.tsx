import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import QrCodeGenerator from '../src/tools/qr-code-generator/QrCodeGenerator';
import type { DioramaSceneProps } from '../src/tools/qr-code-generator/graphics/DioramaScene';

const mock = vi.hoisted(() => ({
  load: vi.fn(), render: vi.fn(), mount: vi.fn(), dispose: vi.fn(),
  zoom: vi.fn(),
  art: vi.fn((_matrix: unknown) => new Promise(() => {})),
}));

vi.mock('../src/tools/qr-code-generator/art/export', () => ({ generateVerifiedQr: mock.art }));
vi.mock('../src/tools/qr-code-generator/graphics/DioramaScene', () => {
  mock.load();
  return {
    default: function MockScene(props: DioramaSceneProps) {
      mock.render(props);
      useEffect(() => {
        mock.mount();
        return () => { mock.dispose(); };
      }, []);
      useEffect(() => {
        const zoomRef = props.zoomRef;
        zoomRef.current = mock.zoom;
        return () => { zoomRef.current = null; };
      }, [props.zoomRef]);
      useEffect(() => { props.onStatus(props.command.pose); }, [props.command, props.onStatus]);
      return <canvas aria-label={props.label} />;
    },
  };
});

afterEach(() => vi.unstubAllGlobals());

it('loads near the stage and reuses the canvas and shared matrix across both views', async () => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  let intersect!: (entries: { isIntersecting: boolean }[]) => void;
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback: typeof intersect) { intersect = callback; }
    observe() {}
    disconnect() {}
  });
  const view = render(<QrCodeGenerator locale="en" region="global" />);
  expect(mock.load).not.toHaveBeenCalled();
  act(() => intersect([{ isIntersecting: false }]));
  expect(mock.load).not.toHaveBeenCalled();
  act(() => intersect([{ isIntersecting: true }]));
  const canvas = await screen.findByLabelText('3D terrain diorama');
  await waitFor(() => expect(mock.art).toHaveBeenCalledOnce());
  const initial: DioramaSceneProps = mock.render.mock.lastCall![0];
  expect(initial.matrix).toBe(mock.art.mock.calls[0][0]);
  fireEvent.click(screen.getByRole('button', { name: 'QR' }));
  fireEvent.click(screen.getByRole('button', { name: 'World' }));
  fireEvent.click(screen.getByRole('button', { name: 'QR' }));
  fireEvent.click(screen.getByRole('button', { name: 'Valley' }));
  const valley: DioramaSceneProps = mock.render.mock.lastCall![0];
  expect(valley.command.pose).toBe('front');
  expect(valley.recipe.terrain.id).toBe('valley');
  expect(valley.recipe.artwork).toEqual(initial.recipe.artwork);
  expect(valley.matrix).toBe(initial.matrix);
  expect(screen.getByLabelText('3D terrain diorama')).toBe(canvas);
  fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
  fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
  expect(mock.zoom.mock.calls).toEqual([['in'], ['out']]);
  fireEvent.click(screen.getByRole('tab', { name: '2D' }));
  expect(screen.queryByRole('button', { name: 'Zoom in' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Valley' })).toBeNull();
  expect(mock.render.mock.lastCall![0].active).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: 'Contour' }));
  const contour: DioramaSceneProps = mock.render.mock.lastCall![0];
  expect(contour.recipe.terrain).toBe(valley.recipe.terrain);
  expect(contour.matrix).toBe(valley.matrix);
  fireEvent.click(screen.getByRole('tab', { name: '3D' }));
  expect(screen.getByLabelText('3D terrain diorama')).toBe(canvas);
  expect(screen.getByRole('button', { name: 'Valley' }).getAttribute('aria-pressed')).toBe('true');
  expect(mock.render.mock.lastCall![0].active).toBe(true);
  fireEvent.change(screen.getByRole('textbox', { name: 'Text or URL' }), { target: { value: '' } });
  expect(mock.render.mock.lastCall![0].matrix).toBeNull();
  view.unmount();
  expect(mock.mount).toHaveBeenCalledOnce();
  expect(mock.dispose).toHaveBeenCalledOnce();
});
