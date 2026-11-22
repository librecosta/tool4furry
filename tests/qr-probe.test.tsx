import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import QrCodeGenerator from '../src/tools/qr-code-generator/QrCodeGenerator';

const probe = vi.hoisted(() => {
  let complete!: () => void;
  const ready = new Promise<void>(resolve => { complete = resolve; });
  return { ready, complete, import: vi.fn(), mount: vi.fn(), dispose: vi.fn() };
});

afterEach(() => vi.unstubAllGlobals());

vi.mock('../src/tools/qr-code-generator/graphics/TerrainProbe', async () => {
  probe.import();
  await probe.ready;
  return {
    default: function MockProbe() {
      useEffect(() => {
        probe.mount();
        return () => { probe.dispose(); };
      }, []);
      return <div>Mounted 3D probe</div>;
    },
  };
});

it('loads the private probe only on request, can close during loading, and releases its mounted view', async () => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  render(<QrCodeGenerator region="global" locale="en" />);
  const text = screen.getByRole('textbox', { name: 'Text or URL' }) as HTMLTextAreaElement;
  fireEvent.change(text, { target: { value: 'https://example.com/#🦊' } });
  expect(probe.import).not.toHaveBeenCalled();
  expect(screen.queryByText('Mounted 3D probe')).toBeNull();

  fireEvent.click(screen.getByRole('button', { name: 'Open 3D probe' }));
  expect(screen.getByRole('status').textContent).toBe('Loading 3D…');
  await waitFor(() => expect(probe.import).toHaveBeenCalledOnce());
  fireEvent.click(screen.getByRole('button', { name: 'Close 3D probe' }));
  probe.complete();
  expect(probe.mount).not.toHaveBeenCalled();

  fireEvent.click(screen.getByRole('button', { name: 'Open 3D probe' }));
  expect(await screen.findByText('Mounted 3D probe')).toBeTruthy();
  expect(probe.mount).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole('button', { name: 'Close 3D probe' }));
  expect(screen.queryByText('Mounted 3D probe')).toBeNull();
  expect(probe.dispose).toHaveBeenCalledOnce();
  expect(probe.import).toHaveBeenCalledOnce();
  expect(text.value).toBe('https://example.com/#🦊');
});
