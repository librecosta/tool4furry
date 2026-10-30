// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AvifEncoder } from '../src/tools/image/avif-encoder';
import { encodeImage } from '../src/tools/image/browser-codec';
import { ImageResources } from '../src/tools/image/resources';
import { desktopImageLimits, mobileImageLimits } from '../src/tools/image/limits';
import type { ImageSource } from '../src/tools/image/types';

class FakeWorker {
  onmessage?: (event: { data: unknown }) => void;
  onerror?: () => void;
  postMessage = vi.fn(); terminate = vi.fn();
  complete(id: number, heap = 32 * 1024 ** 2) { this.onmessage?.({ data: { id, buffer: new ArrayBuffer(10), heap } }); }
}
const setup = () => {
  const workers: FakeWorker[] = [];
  const create = vi.fn(() => { const w = new FakeWorker(); workers.push(w); return w as unknown as Worker; });
  return { client: new AvifEncoder(create), create, workers };
};
const buffer = () => new ArrayBuffer(16);
afterEach(() => vi.useRealTimers());
describe('one lazy AVIF worker within the existing FIFO', () => {
  it('does not create a worker before demand, transfers pixels and reuses small-job initialization', async () => {
    const { client, create, workers } = setup(); expect(create).not.toHaveBeenCalled();
    const rgba = buffer(), first = client.encode(rgba, 2, 2, 55, false);
    expect(workers[0].postMessage).toHaveBeenCalledWith({ id: 1, rgba, width: 2, height: 2, quality: 55, avif444: false }, [rgba]);
    workers[0].complete(1); await first;
    const second = client.encode(buffer(), 2, 2, 60, true); expect(create).toHaveBeenCalledOnce();
    workers[0].complete(1); // late reply must not satisfy request 2
    workers[0].complete(2); await second; client.dispose();
    expect(workers[0].terminate).toHaveBeenCalledOnce();
  });
  it('hard-cancels, ignores late replies and reconstructs a fresh engine', async () => {
    const { client, create, workers } = setup(), abort = new AbortController();
    const first = client.encode(buffer(), 2, 2, 55, false, abort.signal);
    const refused = expect(first).rejects.toMatchObject({ code: 'cancelled' }); abort.abort(); await refused;
    expect(workers[0].terminate).toHaveBeenCalledOnce();
    const next = client.encode(buffer(), 2, 2, 55, false);
    workers[0].complete(1); workers[1].complete(2); await next;
    expect(create).toHaveBeenCalledTimes(2); client.dispose();
  });
  it('terminates on a 30s timeout and permits explicit retry', async () => {
    vi.useFakeTimers(); const { client, workers } = setup();
    const pending = client.encode(buffer(), 2, 2, 55, false);
    const failure = expect(pending).rejects.toMatchObject({ code: 'avifTimeout' });
    await vi.advanceTimersByTimeAsync(30000); await failure;
    expect(workers[0].terminate).toHaveBeenCalledOnce();
    const retry = client.encode(buffer(), 2, 2, 55, false); workers[1].complete(2); await retry; client.dispose();
  });
  it.each(['load', 'high-water', 'idle', 'dispose'])('releases on %s without an automatic retry loop', async reason => {
    vi.useFakeTimers(); const { client, workers, create } = setup();
    const result = client.encode(buffer(), 2, 2, 55, false);
    if (reason === 'load') { const failure = expect(result).rejects.toMatchObject({ code: 'avifLoad' }); workers[0].onerror!(); await failure; }
    else if (reason === 'dispose') { const failure = expect(result).rejects.toMatchObject({ code: 'cancelled' }); client.dispose(); await failure; }
    else { workers[0].complete(1, reason === 'high-water' ? 400 * 1024 ** 2 : undefined); await result; if (reason === 'idle') await vi.advanceTimersByTimeAsync(30000); }
    expect(workers[0].terminate).toHaveBeenCalledOnce(); expect(create).toHaveBeenCalledOnce(); client.dispose();
  });
  it('rejects mobile/unknown and oversized output before decoding; other formats retain their budgets', async () => {
    const resources = new ImageResources(), bitmap = vi.spyOn(resources, 'bitmap');
    const source = { width: 4097, height: 10 } as ImageSource;
    const settings = { format: 'avif' as const, quality: 55, jpegBackground: '#FFFFFF' };
    await expect(encodeImage(source, settings, resources, mobileImageLimits)).rejects.toMatchObject({ code: 'avifDevice' });
    await expect(encodeImage(source, settings, resources, desktopImageLimits)).rejects.toMatchObject({ code: 'avifBudget' });
    expect(bitmap).not.toHaveBeenCalled(); expect(desktopImageLimits.pixels).toBe(40_000_000);
  });
  it.each([[2048, 2048, true], [4096, 1024, true], [3840, 1080, true], [3000, 1000, true], [4097, 1, false], [2048, 2049, false], [3840, 2160, false]])('checks both AVIF pixel and edge budgets: %ix%i', async (width, height, allowed) => {
    const resources = new ImageResources(), bitmap = vi.spyOn(resources, 'bitmap');
    // No operation deliberately stops valid requests immediately after budget checks.
    await expect(encodeImage({ width, height } as ImageSource, { format: 'avif', quality: 55, jpegBackground: '#FFFFFF' }, resources, desktopImageLimits))
      .rejects.toMatchObject({ code: allowed ? 'avifLoad' : 'avifBudget' });
    expect(bitmap).not.toHaveBeenCalled();
  });
});
