// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import {
  ConverterSession,
  type ConverterServices,
} from '../src/tools/image-converter/session';
import {
  recommendations,
  sameSettings,
} from '../src/tools/image-converter/presets';
import {
  createProcessingState,
  setRecommendedPreset,
  restoreRecommended,
  updateSettings,
} from '../src/tools/processing-state';
import { ImageFailure, type ImageSource } from '../src/tools/image/types';
import { SerialJobs } from '../src/tools/image-converter/serial-jobs';
const capabilities = {
  png: { supported: true },
  jpeg: { supported: true },
  webp: { supported: true },
  avif: { supported: false },
};
const tick = async () => {
  for (let i = 0; i < 16; i++) await Promise.resolve();
};
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
};
const source = (file = new File(['original'], 'art.png')): ImageSource => ({
  file,
  blob: file,
  info: { format: 'png', width: 2, height: 2, orientation: 1 },
  width: 2,
  height: 2,
});
function setup(overrides: Partial<ConverterServices> = {}) {
  const encode = vi.fn(
    async () => new Blob(['encoded'], { type: 'image/webp' }),
  );
  const session = new ConverterSession(() => {}, {
    accept: async (file) => source(file),
    encode,
    quick: async (source) => ({ blob: source.blob, info: source.info, changed: false, kind: 'passthrough', metadataPolicy: 'privacy-v1' }),
    capabilities: async () => capabilities,
    ...overrides,
  });
  session.start();
  return { session, encode };
}
async function ready() {
  const s = setup();
  await tick();
  s.session.select(source().file);
  await tick();
  return s;
}
describe('converter state and scheduling', () => {
  it('distinguishes sanitized results, keeps naming outside policy, and rejects obsolete privacy proofs', async () => {
    const clean = new Blob(['cleaned'], { type: 'image/png' });
    const quick = vi.fn<ConverterServices['quick']>(async source => ({
      blob: clean, info: source.info, changed: true, kind: 'cleaned', metadataPolicy: 'privacy-v1',
    }));
    const { session, encode } = setup({ quick });
    await tick(); session.format('png'); session.add([source().file]); await tick();
    expect(session.download()).toMatchObject({ kind: 'cleaned', metadataPolicy: 'privacy-v1', blob: clean });
    expect(encode).not.toHaveBeenCalled();
    session.label('test'); session.mode('advanced'); session.label('tag');
    expect(quick).toHaveBeenCalledTimes(1); expect(session.download()?.blob).toBe(clean);
    expect(quick.mock.calls[0][2]).toBe(session.limits);
    // Simulate a result from an older/unproved policy; every consumer uses download().
    const value = session.snapshot.tasks[0].processing.result!.value;
    Object.assign(value, { metadataPolicy: 'unverified' });
    expect(session.download()).toBeUndefined();
    session.dispose();
  });
  it('never falls back to original bytes or encoding on unsafe Quick cleanup; Advanced is explicit', async () => {
    const { session, encode } = setup({ quick: async () => { throw new ImageFailure('metadata'); } });
    await tick(); session.format('png'); session.add([source().file]); await tick();
    expect(session.snapshot.tasks[0]).toMatchObject({ status: 'error', error: 'metadata' });
    expect(session.download()).toBeUndefined(); expect(encode).not.toHaveBeenCalled();
    expect(session.snapshot.controls.settings.format).toBe('png');
    session.mode('advanced'); await tick();
    expect(encode).not.toHaveBeenCalled(); expect(session.snapshot.tasks[0].status).toBe('queued');
    session.generateAll(); await tick();
    expect(encode).toHaveBeenCalledTimes(1); expect(session.download()?.kind).toBe('encoded');
    session.dispose();
  });
  it('keeps the serial lane occupied by removed in-flight cleanup and rejects its late result', async () => {
    const pending = deferred<Awaited<ReturnType<ConverterServices['quick']>>>();
    let calls = 0;
    const quick: ConverterServices['quick'] = async s => ++calls === 1 ? pending.promise : ({ blob: s.blob, info: s.info, changed: false, kind: 'passthrough', metadataPolicy: 'privacy-v1' });
    const { session } = setup({ quick }); await tick(); session.format('png');
    const [id] = session.add([source().file]); await tick();
    session.remove(id); const [next] = session.add([new File(['other'], 'b.png')]); await tick();
    expect(calls).toBe(1); expect(session.jobs.active).toBe(true);
    pending.resolve({ blob: new Blob(['private']), info: source().info, changed: true, kind: 'cleaned', metadataPolicy: 'privacy-v1' });
    await tick(); await tick();
    expect(session.snapshot.tasks.map(t => t.id)).toEqual([next]);
    expect(await session.download(next)?.blob.text()).toBe('other');
    expect(calls).toBe(2); session.dispose();
  });
  it('auto generates once, keeps mode changes and naming outside encoding versions', async () => {
    const { session, encode } = await ready();
    expect(encode).toHaveBeenCalledTimes(1);
    const state = session.snapshot.processing;
    session.label('new-name');
    session.mode('advanced');
    session.mode('quick');
    session.format('webp');
    await tick();
    expect(encode).toHaveBeenCalledTimes(1);
    expect(session.snapshot.processing.requestId).toBe(state.requestId);
    expect(session.download()).toBe(state.result?.value);
    session.dispose();
  });
  it('remembers per-format preferences and restores the CURRENT format', async () => {
    const { session } = await ready();
    session.mode('advanced');
    session.format('jpeg');
    session.settings({
      ...session.snapshot.processing.settings,
      quality: 95,
      jpegBackground: '#AABBCC',
    });
    session.format('webp');
    session.settings({ ...session.snapshot.processing.settings, quality: 73 });
    session.format('jpeg');
    expect(session.snapshot.processing.settings.quality).toBe(95);
    session.restore();
    expect(session.snapshot.processing.settings).toEqual(
      recommendations.jpeg.settings,
    );
    session.format('webp');
    expect(session.snapshot.processing.settings.quality).toBe(73);
    session.dispose();
  });
  it('uses passthrough for Quick and explicit encoding for Advanced same-format', async () => {
    const { session, encode } = await ready();
    session.format('png');
    await tick();
    expect(session.download()?.kind).toBe('passthrough');
    expect(await session.download()?.blob.text()).toBe('original');
    expect(encode).toHaveBeenCalledTimes(1);
    session.mode('advanced');
    session.generate();
    await tick();
    expect(encode).toHaveBeenCalledTimes(2);
    expect(session.download()?.kind).toBe('encoded');
    session.dispose();
  });
  it('rejects a bad candidate without losing a ready source/result, suspending download while checking', async () => {
    const bad = deferred<ImageSource>();
    const { session } = setup({
      accept: async (file) =>
        file.name === 'bad.png' ? bad.promise : source(file),
    });
    await tick();
    session.select(source().file);
    await tick();
    const old = session.download();
    session.select(new File(['bad'], 'bad.png'));
    expect(session.download()).toBeUndefined();
    bad.reject(new ImageFailure('corrupt'));
    await tick();
    expect(session.download()).toBe(old);
    expect(session.snapshot.inputError).toBe('corrupt');
    session.dispose();
  });
  it('only commits latest B/C candidate and keeps one active native operation', async () => {
    const b = deferred<ImageSource>();
    let active = 0,
      max = 0;
    const { session } = setup({
      accept: async (file) => {
        active++;
        max = Math.max(max, active);
        try {
          return file.name === 'B.png' ? await b.promise : source(file);
        } finally {
          active--;
        }
      },
    });
    await tick();
    session.select(new File(['b'], 'B.png'));
    session.select(new File(['c'], 'C.png'));
    b.resolve(source(new File(['b'], 'B.png')));
    await tick();
    expect(session.snapshot.source?.file.name).toBe('C.png');
    expect(max).toBe(1);
    session.dispose();
  });
  it('replaces waiting format jobs, refuses late results and does not restart identical pending presets', async () => {
    const first = deferred<Blob>();
    let count = 0;
    const { session, encode } = setup({
      encode: async () =>
        ++count === 1 ? first.promise : new Blob(['latest']),
    });
    await tick();
    session.select(source().file);
    await tick();
    session.format('jpeg');
    session.format('webp');
    session.format('webp');
    expect(count).toBe(1);
    first.resolve(new Blob(['obsolete']));
    await tick();
    expect(count).toBe(2);
    expect(await session.download()?.blob.text()).toBe('latest');
    expect(encode).toHaveBeenCalledTimes(0);
    session.dispose();
  });
  it('invalidates cancelled selections on metadata rejection/removal/unmount', async () => {
    const d = deferred<ImageSource>();
    const { session } = setup({ accept: () => d.promise });
    await tick();
    session.select(source().file);
    session.rejectSelection('bytes');
    d.resolve(source());
    await tick();
    expect(session.snapshot.source).toBeUndefined();
    session.remove();
    session.dispose();
    expect(session.snapshot.source).toBeUndefined();
    expect(session.download()).toBeUndefined();
  });
  it('capabilities arriving after a Quick source cause exactly one generation, PNG is conservative fallback', async () => {
    const caps = deferred<typeof capabilities>();
    const { session, encode } = setup({ capabilities: () => caps.promise });
    session.select(source().file);
    caps.resolve({ ...capabilities, webp: { supported: false } });
    await tick();
    expect(session.snapshot.processing.settings.format).toBe('png');
    expect(session.download()?.kind).toBe('passthrough');
    expect(encode).not.toHaveBeenCalled();
    session.dispose();
  });
  it('Advanced never auto generates, invalid values and stale blobs cannot download', async () => {
    const { session, encode } = await ready();
    session.mode('advanced');
    session.settings({ ...session.snapshot.processing.settings, quality: NaN });
    session.generate();
    await tick();
    expect(encode).toHaveBeenCalledTimes(1);
    expect(session.download()).toBeUndefined();
    expect(session.snapshot.processing.validSettings).toBe(false);
    session.dispose();
  });
  it('a watchdog reports timeout but does not start a second heavy task before the first settles', async () => {
    vi.useFakeTimers();
    const d = deferred<void>();
    const q = new SerialJobs(10),
      timeout = vi.fn(),
      second = vi.fn(async () => {});
    q.schedule('a', () => d.promise, timeout);
    q.schedule('b', second, timeout);
    await vi.advanceTimersByTimeAsync(11);
    expect(timeout).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
    expect(q.active).toBe(true);
    d.resolve();
    await tick();
    expect(second).toHaveBeenCalledTimes(1);
    expect(q.active).toBe(false);
    q.dispose();
    vi.useRealTimers();
  });
  it('does not strand a queued encode when an equal edit or rejected candidate arrives', async () => {
    const first = deferred<Blob>();
    let count = 0;
    const { session } = setup({
      encode: async () =>
        ++count === 1 ? first.promise : new Blob(['current']),
    });
    await tick();
    session.select(source().file);
    await tick();
    session.format('jpeg');
    session.mode('advanced');
    session.settings({ ...session.snapshot.processing.settings });
    session.select(new File(['b'], 'B.png'));
    session.rejectSelection('bytes');
    first.resolve(new Blob(['old']));
    await tick();
    expect(count).toBe(2);
    expect(session.snapshot.processing.status).toBe('ready');
    expect(await session.download()?.blob.text()).toBe('current');
    session.dispose();
  });
});
describe('effective parameters and filenames', () => {
  it.each(['png', 'jpeg', 'webp'] as const)(
    'restores %s baseline without forcing WebP',
    (format) => {
      let state = createProcessingState(recommendations.webp);
      state = setRecommendedPreset(state, recommendations[format]);
      state = restoreRecommended(state, sameSettings);
      expect(state.settings).toEqual(recommendations[format].settings);
      const ignored = updateSettings(
        state,
        {
          ...state.settings,
          jpegBackground: '#000000',
          quality: format === 'png' ? 99 : state.settings.quality,
        },
        sameSettings,
      );
      if (format !== 'jpeg') expect(ignored).toBe(state);
    },
  );
});
