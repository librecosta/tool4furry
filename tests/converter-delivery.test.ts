// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { unzipSync } from 'fflate';
import {
  packZip,
  zipBudget,
  zipChunkSize,
} from '../src/tools/image-converter/zip';
import {
  deliverySnapshot,
  deliveryState,
} from '../src/tools/image-converter/delivery';
import { ConverterSession } from '../src/tools/image-converter/session';
import { taskFilename } from '../src/tools/file-naming';

const tick = async () => {
  for (let i = 0; i < 30; i++) await Promise.resolve();
};
async function setup(names = ['same.png', 'same.png', '中文🐾.png']) {
  const session = new ConverterSession(() => {}, {
    quick: async (source) => ({ blob: source.blob, info: source.info, changed: false, kind: 'passthrough', metadataPolicy: 'privacy-v1' }),
    capabilities: async () => ({
      png: { supported: true },
      jpeg: { supported: true },
      webp: { supported: true },
      avif: { supported: false },
    }),
    accept: async (file) => {
      if (file.name === 'broken.png') throw new Error('corrupt');
      return {
        file,
        blob: file,
        width: 1,
        height: 1,
        info: { format: 'png', width: 1, height: 1, orientation: 1 },
      };
    },
    encode: async (source) =>
      new Blob([await source.blob.arrayBuffer()], { type: 'image/webp' }),
  });
  session.start();
  session.add(
    names.map((name, i) => new File([new Uint8Array([i, 255, 0, 13])], name)),
  );
  await tick();
  // Node Blob arrayBuffer completes on the event loop.
  await vi.waitFor(() =>
    expect(
      session.snapshot.tasks.every((t) =>
        ['ready', 'error'].includes(t.status),
      ),
    ).toBe(true),
  );
  return session;
}

describe('stored ZIP delivery', () => {
  it('rejects change-then-undo even when batched UI updates have not run effects yet', async () => {
    const session = await setup();
    const first = deliverySnapshot(session)!;
    session.label('tag');
    session.label('');
    expect(first.current()).toBe(false);
    const second = deliverySnapshot(session)!;
    const [id] = session.add([new File(['x'], 'extra.png')]);
    session.remove(id);
    expect(second.current()).toBe(false);
    session.dispose();
  });
  it('extracts stable root entries with duplicate sources, Unicode labels and byte-identical verified outputs', async () => {
    const session = await setup();
    session.mode('advanced');
    session.label('作品🐾');
    const snapshot = deliverySnapshot(session)!;
    const archive = await packZip(
      snapshot.entries,
      new AbortController().signal,
    );
    const extracted = unzipSync(new Uint8Array(await archive.arrayBuffer()));
    expect(Object.keys(extracted)).toEqual(snapshot.entries.map((e) => e.name));
    expect(new Set(Object.keys(extracted)).size).toBe(3);
    for (const entry of snapshot.entries) {
      expect(extracted[entry.name]).toEqual(
        new Uint8Array(await entry.blob.arrayBuffer()),
      );
      expect(entry.name).toContain('-作品🐾-');
      expect(entry.name).not.toMatch(/[/\\]/);
    }
    expect(snapshot.filename).toBe(`t4f-${session.snapshot.batch.time}.zip`);
    expect(snapshot.current()).toBe(true);
    session.dispose();
  });
  it('handles partial failure, blocks unfinished/empty/single states and keeps stable sequence gaps', async () => {
    const session = await setup(['a.png', 'broken.png', 'a.png']);
    expect(deliveryState(session)).toMatchObject({
      allowed: true,
      failed: 1,
      pending: false,
    });
    const snapshot = deliverySnapshot(session)!;
    expect(
      snapshot.entries.map((e) => e.name.match(/-(\d{4})-a.webp$/)?.[1]),
    ).toEqual(['0001', '0003']);
    const extracted = unzipSync(
      new Uint8Array(
        await (
          await packZip(snapshot.entries, new AbortController().signal)
        ).arrayBuffer(),
      ),
    );
    expect(Object.keys(extracted)).toHaveLength(2);
    session.mode('advanced');
    session.settings({ ...session.snapshot.controls.settings, quality: 90 });
    expect(deliverySnapshot(session)).toBeUndefined();
    session.remove();
    expect(deliveryState(session).allowed).toBe(false);
    session.add([new File(['a'], 'a.png')]);
    await tick();
    expect(deliveryState(session).allowed).toBe(false);
    session.dispose();
    const failed = await setup(['broken.png', 'broken.png']);
    expect(deliveryState(failed)).toMatchObject({ allowed: false, failed: 2 });
    failed.dispose();
  });
  it.each([
    'settings',
    'format',
    'label',
    'add',
    'remove',
    'clear',
    'regenerate',
    'dispose',
  ] as const)('invalidates a snapshot after %s', async (change) => {
    const session = await setup();
    session.mode('advanced');
    const snapshot = deliverySnapshot(session)!;
    if (change === 'settings')
      session.settings({ ...session.snapshot.controls.settings, quality: 91 });
    if (change === 'format') session.format('jpeg');
    if (change === 'label') session.label('new');
    if (change === 'add') session.add([new File(['a'], 'a.png')]);
    if (change === 'remove') session.remove(session.snapshot.tasks[0].id);
    if (change === 'clear') {
      session.remove();
      session.add([new File(['a'], 'a.png')]);
    }
    if (change === 'regenerate') session.generate(session.snapshot.tasks[0].id);
    if (change === 'dispose') session.dispose();
    expect(snapshot.current()).toBe(false);
    session.dispose();
  });
  it('preflights the real 128 MiB cap including UTF-8 headers, without reading oversized payloads', async () => {
    const blob = new Blob(['x']);
    const slice = vi.spyOn(blob, 'slice');
    Object.defineProperty(blob, 'size', {
      value: zipBudget - 22 - 92 - 2 * 4 + 1,
    });
    await expect(
      packZip([{ name: 'a.png', blob }], new AbortController().signal),
    ).rejects.toMatchObject({ code: 'budget' });
    expect(slice).not.toHaveBeenCalled();
  });
  it('reads bounded sequential slices, checks abort after a read, and releases on read failure', async () => {
    const blob = new Blob([new Uint8Array(zipChunkSize * 2 + 7)]);
    const slice = vi.spyOn(blob, 'slice');
    const zip = await packZip(
      [{ name: 'a.png', blob }],
      new AbortController().signal,
    );
    expect(slice.mock.calls).toEqual([
      [0, zipChunkSize],
      [zipChunkSize, 2 * zipChunkSize],
      [2 * zipChunkSize, 3 * zipChunkSize],
    ]);
    expect(
      unzipSync(new Uint8Array(await zip.arrayBuffer()))['a.png'].length,
    ).toBe(blob.size);
    const controller = new AbortController();
    slice.mockImplementationOnce(() => {
      controller.abort();
      return new Blob(['x']);
    });
    await expect(
      packZip([{ name: 'a.png', blob }], controller.signal),
    ).rejects.toMatchObject({ code: 'changed' });
    slice.mockImplementationOnce(() => {
      throw new Error('read failure');
    });
    await expect(
      packZip([{ name: 'a.png', blob }], new AbortController().signal),
    ).rejects.toThrow('read failure');
  });
  it('rejects unsafe/duplicate entries and accepts safe truncation from the frozen naming function', async () => {
    const blob = new Blob(['x']);
    for (const name of ['../x.png', 'x\\y.png', '..', 'x\u0000.png'])
      await expect(
        packZip([{ name, blob }], new AbortController().signal),
      ).rejects.toThrow();
    await expect(
      packZip(
        [
          { name: 'a.png', blob },
          { name: 'A.png', blob },
        ],
        new AbortController().signal,
      ),
    ).rejects.toThrow();
    const name = taskFilename({
      time: '20261021-154812123',
      sequence: 1,
      source: '中文🐾'.repeat(90) + '.png',
      extension: 'webp',
    }).name;
    expect(new TextEncoder().encode(name).length).toBeLessThanOrEqual(180);
    const result = unzipSync(
      new Uint8Array(
        await (
          await packZip([{ name, blob }], new AbortController().signal)
        ).arrayBuffer(),
      ),
    );
    expect(Object.keys(result)).toEqual([name]);
  });
});
