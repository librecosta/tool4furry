import { useState } from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BatchDownload } from '../src/tools/image-converter/BatchDownload';
import { ConverterSession } from '../src/tools/image-converter/session';
import { converterMessages } from '../src/tools/image-converter/messages';
const { pack } = vi.hoisted(() => ({ pack: vi.fn() }));
vi.mock('../src/tools/image-converter/zip', () => ({ packZip: pack }));
const tick = async () => {
  for (let i = 0; i < 70; i++) await Promise.resolve();
};
beforeEach(() => {
  pack.mockReset().mockResolvedValue(new Blob(['zip']));
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  vi.stubGlobal(
    'URL',
    class extends URL {
      static createObjectURL = vi.fn(() => 'blob:zip');
      static revokeObjectURL = vi.fn();
    },
  );
});
async function setup() {
  let emit = (_: ConverterSession['snapshot']) => {};
  const session = new ConverterSession((view) => emit(view), {
    quick: async (source) => ({ blob: source.blob, info: source.info, changed: false, kind: 'passthrough', metadataPolicy: 'privacy-v1' }),
    capabilities: async () => ({
      webp: { supported: true },
      avif: { supported: false },
      jpeg: { supported: true },
      png: { supported: true },
    }),
    accept: async (file) => ({
      file,
      blob: file,
      width: 1,
      height: 1,
      info: { format: 'png', width: 1, height: 1, orientation: 1 },
    }),
    encode: async () => new Blob(['image']),
  });
  session.start();
  session.add([new File(['a'], 'a.png'), new File(['b'], 'b.png')]);
  await tick();
  function Harness() {
    const [view, setView] = useState(session.snapshot);
    emit = setView;
    return (
      <BatchDownload
        session={session}
        view={view}
        blocked={false}
        t={converterMessages.en}
      />
    );
  }
  return { session, ...render(<Harness />) };
}
describe('batch ZIP delivery UI', () => {
  it('handles partial errors, pending and empty results, and hides the single-task entry', async () => {
    const { session } = await setup();
    const ids = session.snapshot.tasks.map((t) => t.id);
    act(() => session.cancel(ids[0]));
    expect(screen.getByRole('status').textContent).toBe(
      'Succeeded 1 · Failed 1',
    );
    expect(screen.getByRole('button').hasAttribute('disabled')).toBe(false);
    let added!: string;
    act(() => {
      session.mode('advanced');
      [added] = session.add([new File(['x'], 'new.png')]);
    });
    expect(screen.getByRole('status').textContent).toContain('Wait');
    expect(screen.getByRole('button').hasAttribute('disabled')).toBe(true);
    await act(tick);
    act(() => {
      session.cancel(added);
      session.cancel(ids[1]);
    });
    expect(screen.getByRole('status').textContent).toContain('No valid');
    expect(screen.getByRole('button').hasAttribute('disabled')).toBe(true);
    act(() => {
      session.remove(added);
      session.remove(ids[1]);
    });
    expect(screen.queryByRole('button')).toBeNull();
    session.dispose();
  });
  it('revokes a successful download URL after the browser handoff', async () => {
    const { session, unmount } = await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Download ZIP' }));
    await waitFor(
      () => expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:zip'),
      { timeout: 1800 },
    );
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
    session.dispose();
  });
  it('guards duplicate clicks, reports counts, triggers a download and revokes its temporary URL on unmount', async () => {
    let finish!: (blob: Blob) => void;
    pack.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const { session, unmount } = await setup();
    expect(screen.getByRole('status').textContent).toBe(
      'Succeeded 2 · Failed 0',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Download ZIP' }));
    await waitFor(() => expect(pack).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'Packing…' }));
    expect(pack).toHaveBeenCalledTimes(1);
    await act(async () => finish(new Blob(['zip'])));
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:zip');
    session.dispose();
  });
  it.each(['label', 'settings', 'remove', 'add', 'clear'] as const)(
    'discards a pack after %s changes and keeps results available',
    async (change) => {
      let finish!: (blob: Blob) => void;
      pack.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      );
      const { session } = await setup();
      fireEvent.click(screen.getByRole('button', { name: 'Download ZIP' }));
      await waitFor(() => expect(pack).toHaveBeenCalledTimes(1));
      act(() => {
        if (change === 'label') session.label('tag');
        if (change === 'settings')
          session.settings({
            ...session.snapshot.controls.settings,
            quality: 90,
          });
        if (change === 'remove') session.remove(session.snapshot.tasks[0].id);
        if (change === 'add') session.add([new File(['c'], 'c.png')]);
        if (change === 'clear') session.remove();
      });
      await act(async () => finish(new Blob(['zip'])));
      expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled();
      expect(URL.createObjectURL).not.toHaveBeenCalled();
      if (['label', 'settings', 'add'].includes(change))
        expect(screen.getByRole('alert').textContent).toContain('changed');
      session.dispose();
    },
  );
  it.each(['budget', 'failed'])(
    'allows retry after %s and preserves individual outputs',
    async (error) => {
      pack.mockRejectedValueOnce(new Error(error));
      const { session, unmount } = await setup();
      const blob = session.download(session.snapshot.tasks[0].id)?.blob;
      fireEvent.click(screen.getByRole('button', { name: 'Download ZIP' }));
      expect(await screen.findByRole('alert')).toBeTruthy();
      expect(session.download(session.snapshot.tasks[0].id)?.blob).toBe(blob);
      fireEvent.click(
        screen.getByRole('button', { name: 'Retry ZIP download' }),
      );
      await waitFor(() =>
        expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1),
      );
      unmount();
      session.dispose();
    },
  );
  it('aborts during unload and never creates a late URL', async () => {
    let finish!: (blob: Blob) => void;
    pack.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const { session, unmount } = await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Download ZIP' }));
    await waitFor(() => expect(pack).toHaveBeenCalledTimes(1));
    const signal = pack.mock.calls[0][1] as AbortSignal;
    unmount();
    expect(signal.aborted).toBe(true);
    await act(async () => finish(new Blob(['zip'])));
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    session.dispose();
  });
});
