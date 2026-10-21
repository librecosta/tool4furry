// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import {
  ConverterSession,
  type ConverterServices,
} from '../src/tools/image-converter/session';
import { ImageFailure, type ImageSource } from '../src/tools/image/types';
const tick = async () => {
  for (let i = 0; i < 80; i++) await Promise.resolve();
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
const file = (name: string) =>
  new File(['original'], name, { type: 'image/png' });
const source = (file: File): ImageSource => ({
  file,
  blob: file,
  info: { format: 'png', width: 80, height: 48, orientation: 1 },
  width: 80,
  height: 48,
});
const output = (text: string) => new Blob([text], { type: 'image/webp' });
async function setup(overrides: Partial<ConverterServices> = {}) {
  const encode = vi.fn(async (source: ImageSource) => output(source.file.name));
  const session = new ConverterSession(() => {}, {
    accept: async (file) => source(file),
    encode,
    capabilities: async () => ({
      png: { supported: true },
      jpeg: { supported: true },
      webp: { supported: true },
    }),
    ...overrides,
  });
  session.start();
  await tick();
  return { session, encode };
}
describe('image batch core (real task objects, controlled native service boundaries)', () => {
  it('can retry an active cancellation without accepting its late result or releasing the lane early', async () => {
    const pending = deferred<Blob>();
    let calls = 0;
    const { session } = await setup({
      encode: async () => (++calls === 1 ? pending.promise : output('retry')),
    });
    const [id] = session.add([file('a.png')]);
    await tick();
    const firstRequest = session.snapshot.tasks[0].processing.requestId;
    session.cancel(id);
    session.retry(id);
    await tick();
    expect(calls).toBe(1);
    expect(session.snapshot.tasks[0].status).toBe('queued');
    expect(session.snapshot.tasks[0].processing.requestId).toBeGreaterThan(
      firstRequest,
    );
    pending.resolve(output('cancelled'));
    await tick();
    expect(calls).toBe(2);
    expect(await session.download(id)!.blob.text()).toBe('retry');
    expect(session.snapshot.tasks[0].sequence).toBe(1);
    session.dispose();
  });
  it('reports only the timed-out file and resumes FIFO after its native promise settles', async () => {
    vi.useFakeTimers();
    try {
      const pending = deferred<Blob>();
      let calls = 0;
      const { session } = await setup({
        encode: async () => (++calls === 1 ? pending.promise : output('next')),
      });
      const ids = session.add([file('a.png'), file('b.png')]);
      await tick();
      await vi.advanceTimersByTimeAsync(45001);
      expect(session.snapshot.tasks.map((task) => task.status)).toEqual([
        'error',
        'queued',
      ]);
      session.add([file('c.png')]);
      expect(calls).toBe(1);
      expect(session.jobs.active).toBe(true);
      pending.resolve(output('late'));
      await tick();
      expect(calls).toBe(3);
      expect(session.download(ids[0])).toBeUndefined();
      expect(session.snapshot.tasks.map((task) => task.status)).toEqual([
        'error',
        'ready',
        'ready',
      ]);
      session.dispose();
    } finally {
      vi.useRealTimers();
    }
  });
  it('processes every task FIFO in one native lane; one failure does not stop later files', async () => {
    const order: string[] = [];
    let active = 0,
      max = 0;
    const { session } = await setup({
      accept: async (file) => {
        active++;
        max = Math.max(max, active);
        order.push(`accept:${file.name}`);
        await Promise.resolve();
        active--;
        return source(file);
      },
      encode: async (source) => {
        active++;
        max = Math.max(max, active);
        order.push(`encode:${source.file.name}`);
        try {
          await Promise.resolve();
          if (source.file.name === 'bad.png') throw new ImageFailure('encode');
          return output(source.file.name);
        } finally {
          active--;
        }
      },
    });
    const ids = session.add([file('a.png'), file('bad.png'), file('c.png')]);
    await tick();
    expect(order).toEqual([
      'accept:a.png',
      'accept:bad.png',
      'accept:c.png',
      'encode:a.png',
      'encode:bad.png',
      'encode:c.png',
    ]);
    expect(max).toBe(1);
    expect(new Set(ids).size).toBe(3);
    expect(session.snapshot.tasks.map((task) => task.status)).toEqual([
      'ready',
      'error',
      'ready',
    ]);
    expect(session.download(ids[0])).toBeTruthy();
    expect(session.download(ids[1])).toBeUndefined();
    expect(session.download(ids[2])).toBeTruthy();
    session.dispose();
  });
  it('waits in Advanced, retries validation/encoding independently and never reassigns sequence', async () => {
    let badAccept = true;
    const { session, encode } = await setup({
      accept: async (file) => {
        if (badAccept && file.name === 'bad.png')
          throw new ImageFailure('corrupt');
        return source(file);
      },
    });
    session.mode('advanced');
    const ids = session.add([file('a.png'), file('bad.png'), file('a.png')]);
    await tick();
    expect(session.snapshot.tasks.map((task) => task.status)).toEqual([
      'queued',
      'error',
      'queued',
    ]);
    expect(encode).not.toHaveBeenCalled();
    badAccept = false;
    session.retry(ids[1]);
    await tick();
    expect(session.snapshot.tasks[1].status).toBe('queued');
    session.generate();
    await tick();
    expect(encode).toHaveBeenCalledTimes(3);
    const names = ids.map((id) => session.filename(id).name);
    expect(names[0]).toContain('-0001-a.webp');
    expect(names[2]).toContain('-0003-a.webp');
    session.remove(ids[0]);
    const [fourth] = session.add([file('a.png')]);
    await tick();
    expect(session.filename(fourth).name).toContain('-0004-a.webp');
    expect(session.snapshot.tasks.map((task) => task.sequence)).toEqual([
      2, 3, 4,
    ]);
    expect(session.filename(ids[1]).name).toBe(names[1]);
    session.dispose();
  });
  it('invalidates all outputs, drops stale Blobs, and leaves Advanced to explicitly regenerate', async () => {
    const { session, encode } = await setup();
    const ids = session.add([file('a.png'), file('b.png')]);
    await tick();
    session.mode('advanced');
    session.settings({ ...session.snapshot.processing.settings, quality: 91 });
    expect(session.snapshot.tasks.map((task) => task.status)).toEqual([
      'stale',
      'stale',
    ]);
    ids.forEach((id) => expect(session.download(id)).toBeUndefined());
    expect(
      session.snapshot.tasks.every((task) => !task.processing.result),
    ).toBe(true);
    await tick();
    expect(encode).toHaveBeenCalledTimes(2);
    session.generate();
    await tick();
    expect(encode).toHaveBeenCalledTimes(4);
    expect(
      session.snapshot.tasks.every((task) => task.status === 'ready'),
    ).toBe(true);
    session.dispose();
  });
  it('keeps remaining files when replacing pending parameter jobs and ignores late obsolete output', async () => {
    const pending = deferred<Blob>();
    const calls: string[] = [];
    const { session } = await setup({
      encode: async (source, settings) => {
        calls.push(`${source.file.name}:${settings.format}`);
        return calls.length === 1 ? pending.promise : output(settings.format);
      },
    });
    const ids = session.add([file('a.png'), file('b.png'), file('c.png')]);
    await tick();
    session.format('jpeg');
    session.format('webp');
    session.format('webp');
    expect(calls).toEqual(['a.png:webp']);
    pending.resolve(output('obsolete'));
    await tick();
    expect(calls).toEqual([
      'a.png:webp',
      'a.png:webp',
      'b.png:webp',
      'c.png:webp',
    ]);
    for (const id of ids)
      expect(await session.download(id)?.blob.text()).toBe('webp');
    session.dispose();
  });
  it('isolates deletion and cancellation while the uninterruptible operation holds the lane', async () => {
    const pending = deferred<Blob>();
    let calls = 0;
    const { session } = await setup({
      encode: async () => (++calls === 1 ? pending.promise : output('next')),
    });
    const ids = session.add([file('a.png'), file('b.png'), file('c.png')]);
    await tick();
    session.remove(ids[0]);
    session.cancel(ids[1]);
    expect(calls).toBe(1);
    expect(session.jobs.active).toBe(true);
    pending.resolve(output('removed'));
    await tick();
    expect(calls).toBe(2);
    expect(session.snapshot.tasks.map((task) => task.status)).toEqual([
      'error',
      'ready',
    ]);
    expect(session.snapshot.tasks[0].error).toBe('cancelled');
    expect(session.download(ids[0])).toBeUndefined();
    expect(session.download(ids[1])).toBeUndefined();
    session.retry(ids[1]);
    await tick();
    expect(session.snapshot.tasks[0].sequence).toBe(2);
    expect(session.download(ids[1])).toBeTruthy();
    session.dispose();
  });
  it('refuses cancelled validation and disposed late results', async () => {
    const validation = deferred<ImageSource>();
    const pendingFile = file('a.png');
    const { session, encode } = await setup({
      accept: () => validation.promise,
    });
    const [id] = session.add([pendingFile]);
    session.cancel(id);
    validation.resolve(source(pendingFile));
    await tick();
    expect(session.snapshot.tasks[0].source).toBeUndefined();
    expect(encode).not.toHaveBeenCalled();
    session.dispose();
    expect(session.snapshot.tasks).toEqual([]);
    const late = deferred<Blob>();
    const other = await setup({ encode: () => late.promise });
    other.session.add([file('other.png')]);
    await tick();
    other.session.dispose();
    late.resolve(output('late'));
    await tick();
    expect(other.session.snapshot.tasks).toEqual([]);
    expect(other.session.download()).toBeUndefined();
  });
  it('changes only names for labels and mode, retaining the last valid Advanced preference', async () => {
    const { session, encode } = await setup();
    const [id] = session.add([file('a.png')]);
    await tick();
    const blob = session.download(id)!.blob,
      request = session.snapshot.tasks[0].processing.requestId;
    const standard = session.filename(id).name;
    session.label('收藏🐺');
    expect(session.filename(id).name).toBe(standard);
    session.mode('advanced');
    expect(session.filename(id).name).toContain('-收藏🐺-a.webp');
    session.label('bad/name');
    expect(session.filename(id).error).toBe(true);
    session.mode('quick');
    expect(session.filename(id).name).toBe(standard);
    session.mode('advanced');
    expect(session.snapshot.label).toBe('收藏🐺');
    await tick();
    expect(encode).toHaveBeenCalledTimes(1);
    expect(session.download(id)!.blob).toBe(blob);
    expect(session.snapshot.tasks[0].processing.requestId).toBe(request);
    session.dispose();
  });
  it('uses one batch timestamp but unique internal batch IDs, including same-format passthrough naming', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 21, 15, 48, 12, 123));
    try {
      const { session, encode } = await setup();
      const other = await setup();
      expect(session.snapshot.batch.time).toBe('20261021-154812123');
      expect(other.session.snapshot.batch.id).not.toBe(
        session.snapshot.batch.id,
      );
      session.format('png');
      const originals = [file('a.jpg'), file('a.png')];
      const ids = session.add(originals);
      await tick();
      expect(encode).not.toHaveBeenCalled();
      ids.forEach((id, index) => {
        expect(session.download(id)!.blob).toBe(originals[index]);
        expect(session.filename(id).name).toBe(
          `t4f-20261021-154812123-000${index + 1}-a.png`,
        );
      });
      session.remove(ids[0]);
      vi.advanceTimersByTime(10000);
      const [id] = session.add([file('later.png')]);
      await tick();
      expect(session.filename(id).name).toContain('20261021-154812123-0003');
      session.dispose();
      other.session.dispose();
    } finally {
      vi.useRealTimers();
    }
  });
});
