import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ResizeCollection,
  type CollectionServices,
} from '../src/tools/image-resize-crop/collection';
import { desktopImageLimits as limits } from '../src/tools/image/limits';
import { ImageFailure, type ImageSource } from '../src/tools/image/types';

const flush = async () => {
  for (let n = 0; n < 80; n++) await Promise.resolve();
};
function deferred<T>() {
  let resolve!: (value: T) => void;
  return {
    promise: new Promise<T>((done) => {
      resolve = done;
    }),
    resolve: (value: T) => resolve(value),
  };
}
const file = (name = 'source.png') =>
  new File(['source'], name, { type: 'image/png' });
const source = (file: File): ImageSource => ({
  file,
  blob: file,
  width: file.name.startsWith('portrait') ? 800 : 1200,
  height: file.name.startsWith('portrait') ? 1200 : 800,
  info: { format: 'png', width: 1200, height: 800, orientation: 1 },
});
const sessions: ResizeCollection[] = [];
function setup(overrides: Partial<CollectionServices> = {}, budget = limits) {
  const services: CollectionServices = {
    inspect: vi.fn(async (file) => source(file)),
    preview: vi.fn(async () => new Blob(['preview'])),
    render: vi.fn(async () => new Blob(['result'], { type: 'image/png' })),
    capabilities: vi.fn(async () => ({
      png: { supported: true },
      jpeg: { supported: true },
      webp: { supported: true },
      avif: { supported: false },
    })),
    ...overrides,
  };
  services.single ??= {
    load: vi.fn(async (file) => ({
      source: source(file),
      preview: new Blob(['preview']),
    })),
    render: services.render,
    capabilities: services.capabilities,
  };
  const changed = vi.fn();
  const session = new ResizeCollection(changed, services, budget);
  sessions.push(session);
  session.start();
  return { session, services, changed };
}
afterEach(() => {
  sessions.splice(0).forEach((session) => session.dispose());
  vi.useRealTimers();
});

describe('collection admission, drafts and lazy previews', () => {
  it('reserves replacement bytes while later imports are admitted', async () => {
    const replacement = deferred<{ source: ImageSource; preview: Blob }>();
    const { session } = setup(
      {
        single: {
          load: () => replacement.promise,
          render: async () => new Blob(['output']),
          capabilities: async () => ({ png: { supported: true }, jpeg: { supported: true }, webp: { supported: true }, avif: { supported: false } }),
        },
      },
      { ...limits, totalBytes: 20 },
    );
    session.add([file()]);
    await flush();
    const larger = new File(['1234567890123456'], 'replacement.png');
    session.replace(larger);
    session.add([file('next.png')]);
    expect(session.snapshot.intakeSummary?.rejected.total).toBe(1);
    replacement.resolve({
      source: source(larger),
      preview: new Blob(['preview']),
    });
    await flush();
    expect(session.snapshot.files[0]!.file).toBe(larger);
  });
  it('keeps replacement admission reserved after timeout until native settlement', async () => {
    vi.useFakeTimers();
    const replacement = deferred<{ source: ImageSource; preview: Blob }>();
    const { session, services } = setup({}, { ...limits, totalBytes: 20 });
    vi.mocked(services.single!.load).mockImplementation(() => replacement.promise);
    session.add([file()]); await flush();
    const larger = new File(['1234567890123456'], 'replacement.png');
    session.replace(larger); await flush();
    vi.advanceTimersByTime(45001);
    session.add([file('rejected.png')]);
    expect(session.snapshot.intakeSummary?.rejected.total).toBe(1);
    replacement.resolve({ source: source(larger), preview: new Blob(['late']) }); await flush();
    expect(session.snapshot.files[0]!.file.name).toBe('source.png');
    session.add([file('accepted.png')]); await flush();
    expect(session.snapshot.files).toHaveLength(2);
  });
  it('drops stale previews and skips invalid neighbours when the selected file is removed', async () => {
    const preview = deferred<Blob>();
    const { session, services } = setup({
      inspect: vi.fn(async (f) => {
        if (f.name === 'bad.png') throw new ImageFailure('corrupt');
        return source(f);
      }),
      preview: vi
        .fn()
        .mockImplementationOnce(() => preview.promise)
        .mockResolvedValue(new Blob(['current'])),
    });
    session.add([file(), file('bad.png'), file('third.png')]);
    await flush();
    const [a, , c] = session.snapshot.files;
    session.setMode('single');
    await flush();
    session.select(c!.id);
    preview.resolve(new Blob(['stale']));
    await flush();
    expect(await session.editor!.snapshot.preview?.text()).toBe('current');
    session.select(a!.id);
    await flush();
    session.remove(a!.id);
    await flush();
    expect(session.snapshot.selectedId).toBe(c!.id);
    expect(services.render).not.toHaveBeenCalled();
  });
  it('defaults one file to single, multiple to batch; appending does not change mode', async () => {
    const { session, services } = setup();
    session.add([file()]);
    await flush();
    expect(session.snapshot.mode).toBe('single');
    expect(services.preview).toHaveBeenCalledOnce();
    const first = session.snapshot.selectedId;
    session.add([file('portrait.png')]);
    await flush();
    expect(session.snapshot.mode).toBe('single');
    expect(session.snapshot.selectedId).toBe(first);
    expect(services.preview).toHaveBeenCalledOnce();
    session.clear();
    session.add([file(), file('portrait.png')]);
    await flush();
    expect(session.snapshot.mode).toBe('batch');
    expect(services.preview).toHaveBeenCalledOnce();
    expect(services.render).not.toHaveBeenCalled();
  });
  it('reports admission and structural rejection while keeping valid files', async () => {
    const inspect = vi.fn(async (f: File) => {
      if (f.name === 'bad.png') throw new ImageFailure('corrupt');
      return source(f);
    });
    const { session } = setup({ inspect });
    session.add([
      new File(['x'], 'bad.txt'),
      file('bad.png'),
      file('good.png'),
    ]);
    await flush();
    expect(session.snapshot.intakeSummary?.rejected.type).toBe(1);
    expect(session.snapshot.files.map((item) => item.intake)).toEqual([
      'failed',
      'ready',
    ]);
    expect(session.snapshot.selectedId).toBe(session.snapshot.files[1]?.id);
    session.startBatch();
    await flush();
    expect(session.delivery()).toMatchObject({ failed: 1, allowed: true });
  });
  it('preserves each single draft and result across selection and mode changes', async () => {
    const { session, services } = setup();
    session.add([file(), file('portrait.png')]);
    await flush();
    const [a, b] = session.snapshot.files;
    session.setMode('single');
    await flush();
    session.editor!.aspect('1:1');
    session.editor!.dimensions('400', '800', 'width');
    session.editor!.output({ format: 'webp' });
    session.editor!.export();
    await flush();
    const before = session.editor!.snapshot;
    session.select(b!.id);
    await flush();
    expect(session.editor!.snapshot.output).toMatchObject({
      width: 800,
      height: 1200,
      format: 'png',
    });
    session.editor!.dimensions('200', '1200', 'width');
    session.batchSettings({ value: '600', format: 'jpeg' });
    session.setMode('batch');
    session.startBatch();
    await flush();
    expect(
      vi
        .mocked(services.render)
        .mock.calls.slice(1)
        .map((call) => call[1]),
    ).toEqual([
      { x: 0, y: 0, width: 1200, height: 800 },
      { x: 0, y: 0, width: 800, height: 1200 },
    ]);
    session.select(a!.id);
    session.setMode('single');
    await flush();
    expect(session.editor!.snapshot).toMatchObject({
      crop: before.crop,
      output: before.output,
      result: before.result,
    });
    expect(session.snapshot.settings.format).toBe('jpeg');
    session.remove(a!.id);
    expect(session.snapshot.selectedId).toBe(b!.id);
    expect(session.editor!.snapshot.output.width).toBe(200);
  });
  it('enforces count/total admission and releases every draft on clear', async () => {
    const { session } = setup({}, { ...limits, files: 2, totalBytes: 12 });
    session.add([file(), file('b.png'), file('c.png')]);
    await flush();
    expect(session.snapshot.files).toHaveLength(2);
    expect(session.snapshot.intakeSummary?.rejected.count).toBe(1);
    session.clear();
    expect(session.snapshot.files).toHaveLength(0);
    expect(session.editor).toBeUndefined();
    expect(session.resources.bitmapsCreated).toBe(
      session.resources.bitmapsClosed,
    );
    session.add([new File(['1234567890123'], 'large.png')]);
    expect(session.snapshot.intakeSummary?.rejected.total).toBe(1);
  });
});

describe('batch serial tasks, cancellation and bounded delivery', () => {
  it('isolates a failure, keeps successes, retries only the failed item', async () => {
    const render = vi
      .fn()
      .mockRejectedValueOnce(new ImageFailure('encode'))
      .mockResolvedValue(new Blob(['ok']));
    const { session } = setup({ render });
    session.add([file(), file('b.png')]);
    await flush();
    session.startBatch();
    await flush();
    expect(session.snapshot.files.map((item) => item.batch.status)).toEqual([
      'failed',
      'success',
    ]);
    const success = session.download(session.snapshot.files[1]!.id)?.blob;
    session.retry(session.snapshot.files[0]!.id);
    await flush();
    expect(render).toHaveBeenCalledTimes(3);
    expect(session.download(session.snapshot.files[1]!.id)?.blob).toBe(success);
    expect(session.delivery().entries).toHaveLength(2);
  });
  it('retries validation before encoding a previously invalid file', async () => {
    const { session, services } = setup({
      inspect: vi
        .fn()
        .mockRejectedValueOnce(new ImageFailure('decode'))
        .mockImplementation(async (f) => source(f)),
    });
    session.add([file()]);
    await flush();
    session.setMode('batch');
    session.retry(session.snapshot.files[0]!.id);
    await flush();
    expect(services.inspect).toHaveBeenCalledTimes(2);
    expect(session.delivery().entries).toHaveLength(1);
  });
  it('serializes batch and single export, allows early individual download', async () => {
    const first = deferred<Blob>();
    const render = vi
      .fn()
      .mockImplementationOnce(() => first.promise)
      .mockResolvedValue(new Blob(['next']));
    const { session } = setup({ render });
    session.add([file(), file('b.png')]);
    await flush();
    session.startBatch();
    session.setMode('single');
    session.editor!.export();
    await flush();
    expect(render).toHaveBeenCalledOnce();
    expect(session.jobs.active).toBe(true);
    first.resolve(new Blob(['first']));
    await flush();
    expect(render).toHaveBeenCalledTimes(3);
    expect(session.jobs.maxActive).toBe(1);
    expect(session.editor!.download()).toBeDefined();
  });
  it('downloads a completed item while the next native job is unresolved', async () => {
    const second = deferred<Blob>();
    const { session } = setup({
      render: vi
        .fn()
        .mockResolvedValueOnce(new Blob(['ok']))
        .mockImplementationOnce(() => second.promise),
    });
    session.add([file(), file('b.png')]);
    await flush();
    session.startBatch();
    await flush();
    expect(session.download(session.snapshot.files[0]!.id)).toBeDefined();
    expect(session.delivery().allowed).toBe(false);
    expect(session.snapshot.files[1]!.batch.status).toBe('processing');
    second.resolve(new Blob(['ok']));
    await flush();
    expect(session.delivery().allowed).toBe(true);
  });
  it.each(['rules', 'cancel', 'remove', 'clear', 'dispose'] as const)(
    'rejects late native results and cancels waiting work on %s',
    async (action) => {
      const native = deferred<Blob>();
      const render = vi.fn(() => native.promise);
      const { session, changed } = setup({ render });
      session.add([file(), file('b.png')]);
      await flush();
      session.startBatch();
      await flush();
      if (action === 'rules') session.batchSettings({ value: '500' });
      if (action === 'cancel') session.cancelBatch();
      if (action === 'remove') {
        for (const item of [...session.snapshot.files]) session.remove(item.id);
      }
      if (action === 'clear') session.clear();
      if (action === 'dispose') session.dispose();
      const calls = changed.mock.calls.length;
      expect(session.jobs.active).toBe(true);
      native.resolve(new Blob(['late']));
      await flush();
      expect(render).toHaveBeenCalledOnce();
      expect(session.delivery().entries).toHaveLength(0);
      if (action === 'dispose') expect(changed).toHaveBeenCalledTimes(calls);
    },
  );
  it('times out without freeing the native lane, then continues later files', async () => {
    vi.useFakeTimers();
    const native = deferred<Blob>();
    const render = vi
      .fn()
      .mockImplementationOnce(() => native.promise)
      .mockResolvedValue(new Blob(['ok']));
    const { session } = setup({ render });
    session.add([file(), file('b.png')]);
    await flush();
    session.startBatch();
    await flush();
    vi.advanceTimersByTime(45001);
    expect(session.snapshot.files[0]!.batch.error).toBe('timeout');
    expect(render).toHaveBeenCalledOnce();
    native.resolve(new Blob(['late']));
    await flush();
    expect(session.snapshot.files.map((item) => item.batch.status)).toEqual([
      'failed',
      'success',
    ]);
  });
  it('bounds all retained single and batch results without dropping another success', async () => {
    const { session } = setup(
      { render: vi.fn(async () => new Blob(['1234567'])) },
      { ...limits, totalBytes: 12 },
    );
    session.add([file(), file('b.png')]);
    await flush();
    session.startBatch();
    await flush();
    expect(session.snapshot.files.map((item) => item.batch.status)).toEqual([
      'success',
      'failed',
    ]);
    expect(session.snapshot.files[1]!.batch.error).toBe('resultBudget');
    session.setMode('single');
    session.editor!.export();
    await flush();
    expect(session.editor!.snapshot.error).toBe('resultBudget');
    expect(session.delivery().entries).toHaveLength(1);
  });
  it.each(['rules', 'remove', 'add', 'clear', 'dispose'] as const)(
    'invalidates an in-flight ZIP snapshot on %s',
    async (action) => {
      const native = deferred<Blob>();
      const pack = vi.fn<NonNullable<CollectionServices['pack']>>(
        () => native.promise,
      );
      const { session } = setup({ pack });
      session.add([file('same.png'), file('same.png')]);
      await flush();
      session.startBatch();
      await flush();
      const names = session.delivery().entries.map((item) => item.name);
      expect(new Set(names).size).toBe(2);
      const zip = session.zip();
      await flush();
      if (action === 'rules') session.batchSettings({ quality: 70 });
      if (action === 'remove') session.remove(session.snapshot.files[0]!.id);
      if (action === 'add') session.add([file('new.png')]);
      if (action === 'clear') session.clear();
      if (action === 'dispose') session.dispose();
      expect(pack.mock.calls[0]?.[1].aborted).toBe(true);
      native.resolve(new Blob(['zip']));
      expect(await zip).toBeUndefined();
    },
  );
  it('packs only validated successes after all tasks ended, including partial failure', async () => {
    const pack = vi.fn<NonNullable<CollectionServices['pack']>>(
      async () => new Blob(['zip']),
    );
    const { session } = setup({
      pack,
      render: vi
        .fn()
        .mockRejectedValueOnce(new ImageFailure('encode'))
        .mockResolvedValue(new Blob(['ok'])),
    });
    session.add([file(), file('b.png')]);
    await flush();
    expect(await session.zip()).toBeUndefined();
    session.startBatch();
    await flush();
    expect(await session.zip()).toMatchObject({
      name: expect.stringMatching(/\.zip$/),
    });
    expect(pack.mock.calls[0]?.[0]).toHaveLength(1);
  });
  it('does not restore an import or preview completing after removal/unmount', async () => {
    const pending = deferred<ImageSource>();
    const { session, services, changed } = setup({
      inspect: () => pending.promise,
    });
    session.add([file()]);
    await flush();
    session.dispose();
    const calls = changed.mock.calls.length;
    pending.resolve(source(file()));
    await flush();
    expect(services.preview).not.toHaveBeenCalled();
    expect(session.snapshot.files).toHaveLength(0);
    expect(changed).toHaveBeenCalledTimes(calls);
  });
});
