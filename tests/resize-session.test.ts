import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ResizeSession,
  type ResizeServices,
} from '../src/tools/image-resize-crop/session';
import { desktopImageLimits } from '../src/tools/image/limits';
import type { ImageSource } from '../src/tools/image/types';

const flush = async () => {
  for (let n = 0; n < 12; n++) await Promise.resolve();
};
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};
const file = new File(['source'], 'source.png');
const source: ImageSource = {
  file,
  blob: file,
  info: { format: 'png', width: 1200, height: 800, orientation: 1 },
  width: 1200,
  height: 800,
};
const preview = new Blob(['preview']);
function setup(overrides: Partial<ResizeServices> = {}) {
  const services: ResizeServices = {
    load: vi.fn(async () => ({ source, preview })),
    render: vi.fn(async () => new Blob(['output'], { type: 'image/png' })),
    capabilities: vi.fn(async () => ({
      png: { supported: true },
      jpeg: { supported: true },
      webp: { supported: true },
      avif: { supported: false },
    })),
    ...overrides,
  };
  const session = new ResizeSession(vi.fn(), services, desktopImageLimits);
  session.start();
  session.load(file);
  return { session, services };
}
afterEach(() => vi.useRealTimers());
describe('single-source resize draft lifecycle', () => {
  it('follows natural crop dimensions until customized, then retains width', async () => {
    const { session } = setup();
    await flush();
    expect(session.snapshot.output).toMatchObject({ width: 1200, height: 800 });
    session.aspect('1:1');
    expect(session.snapshot.output).toMatchObject({ width: 800, height: 800 });
    session.dimensions('400', '800', 'width');
    session.aspect('16:9');
    expect(session.snapshot.output).toMatchObject({ width: 400, height: 225 });
    session.natural();
    expect(session.snapshot.customWidth).toBeUndefined();
    expect(session.snapshot.output.width).toBe(session.snapshot.crop?.width);
    session.dispose();
  });
  it('reframes unlocked dimensions around the selection center without stretching', async () => {
    const { session } = setup();
    await flush();
    session.lock(false);
    session.dimensions('600', '600', 'width');
    expect(session.snapshot.crop).toEqual({
      x: 200,
      y: 0,
      width: 800,
      height: 800,
    });
    expect(session.snapshot.output).toMatchObject({ width: 600, height: 600 });
    session.scale('50');
    expect(session.snapshot.output).toMatchObject({ width: 400, height: 400 });
    session.dispose();
  });
  it.each([
    ['0', '800'],
    ['10001', '800'],
    ['9000', '9000'],
    ['abc', '800'],
    ['1', '0'],
  ])(
    'rejects invalid submitted dimensions %j atomically',
    async (width, height) => {
      const { session } = setup();
      await flush();
      session.lock(false);
      const before = session.snapshot;
      expect(() => session.dimensions(width, height, 'width')).toThrow();
      expect(session.snapshot).toBe(before);
      session.dispose();
    },
  );
  it('invalidates old results immediately and naming does not encode', async () => {
    const { session, services } = setup();
    await flush();
    session.export();
    await flush();
    expect(session.download()?.blob).toBeDefined();
    session.label('edited');
    expect(session.download()?.name).toContain('-edited-');
    expect(services.render).toHaveBeenCalledOnce();
    session.output({ quality: 75 });
    expect(session.download()).toBeUndefined();
    expect(session.snapshot.result).toBeUndefined();
    session.dispose();
  });
  it.each(['png', 'jpeg', 'webp'] as const)('blocks an unavailable %s encoder without a silent format fallback', async format => {
    const { session, services } = setup({ capabilities: async () => ({
      png: { supported: format !== 'png' },
      jpeg: { supported: format !== 'jpeg' },
      webp: { supported: format !== 'webp' },
      avif: { supported: false },
    }) });
    await flush();
    session.output({ format });
    expect(session.validOutput()).toBe(false);
    session.export();
    await flush();
    expect(services.render).not.toHaveBeenCalled();
    expect(session.download()).toBeUndefined();
    expect(session.snapshot.output.format).toBe(format);
    session.dispose();
  });
  it('blocks over-budget derived dimensions and does not silently shrink', async () => {
    const { session, services } = setup();
    await flush();
    session.dimensions('6000', '800', 'width');
    session.crop({ x: 0, y: 0, width: 1, height: 800 });
    expect(session.snapshot.output).toMatchObject({
      width: 6000,
      height: 4800000,
    });
    expect(session.validOutput()).toBe(false);
    session.export();
    expect(services.render).not.toHaveBeenCalled();
    session.dispose();
  });
  it('discards export responses after edits and holds the native lane until settlement', async () => {
    const first = deferred<Blob>();
    const render = vi
      .fn()
      .mockImplementationOnce(() => first.promise)
      .mockResolvedValue(new Blob(['new']));
    const { session } = setup({ render });
    await flush();
    session.export();
    await flush();
    session.output({ format: 'jpeg' });
    session.export();
    await flush();
    expect(render).toHaveBeenCalledOnce();
    first.resolve(new Blob(['old']));
    await flush();
    expect(render).toHaveBeenCalledTimes(2);
    expect(await session.download()?.blob.text()).toBe('new');
    session.dispose();
  });
  it('retries failures and rejects late results after clear, replace and dispose', async () => {
    const old = deferred<Blob>();
    const render = vi
      .fn()
      .mockRejectedValueOnce(new Error('failed'))
      .mockImplementationOnce(() => old.promise);
    const { session, services } = setup({ render });
    await flush();
    session.export();
    await flush();
    expect(session.snapshot.status).toBe('failed');
    session.export();
    await flush();
    session.load(new File(['new'], 'new.png'));
    await flush();
    expect(services.load).toHaveBeenCalledOnce();
    old.resolve(new Blob(['late']));
    await flush();
    expect(session.snapshot.result).toBeUndefined();
    expect(services.load).toHaveBeenCalledTimes(2);
    session.clear();
    expect(session.snapshot.source).toBeUndefined();
    expect(session.snapshot.preview).toBeUndefined();
    expect(session.download()).toBeUndefined();
    session.dispose();
  });
  it('does not revive a source on an import completing after unmount', async () => {
    const pending = deferred<{ source: ImageSource; preview: Blob }>();
    const { session } = setup({ load: () => pending.promise });
    await flush();
    session.dispose();
    pending.resolve({ source, preview });
    await flush();
    expect(session.snapshot.source).toBeUndefined();
    expect(session.snapshot.result).toBeUndefined();
  });
  it('keeps a failed replacement from destroying the existing draft', async () => {
    const { session, services } = setup();
    await flush();
    const before = session.snapshot.crop;
    vi.mocked(services.load).mockRejectedValueOnce(new Error('decode'));
    session.load(new File(['bad'], 'bad.png'));
    await flush();
    expect(session.snapshot.source).toBe(source);
    expect(session.snapshot.crop).toBe(before);
    expect(session.snapshot.status).toBe('failed');
    session.dispose();
  });
  it('times out without releasing the native lane or accepting the late result', async () => {
    vi.useFakeTimers();
    const pending = deferred<Blob>();
    const { session, services } = setup({ render: () => pending.promise });
    await flush();
    session.export();
    await flush();
    vi.advanceTimersByTime(45001);
    expect(session.snapshot.error).toBe('timeout');
    session.load(file);
    await flush();
    expect(services.load).toHaveBeenCalledOnce();
    pending.resolve(new Blob(['late']));
    await flush();
    expect(services.load).toHaveBeenCalledTimes(2);
    expect(session.snapshot.result).toBeUndefined();
    session.dispose();
  });
});
