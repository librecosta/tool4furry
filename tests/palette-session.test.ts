import { beforeEach, expect, it, vi } from 'vitest';
import { PaletteSession } from '../src/tools/palette-extractor/session';
import { mobileImageLimits } from '../src/tools/image/limits';
import {
  acceptImage,
  decodeChecked,
  toBlob,
} from '../src/tools/image/browser-codec';
import { renderPalette } from '../src/tools/palette-extractor/render';

vi.mock('../src/tools/image/browser-codec', () => ({
  acceptImage: vi.fn(),
  decodeChecked: vi.fn(),
  toBlob: vi.fn(),
}));
vi.mock('../src/tools/palette-extractor/palette', async (original) => ({
  ...(await original<
    typeof import('../src/tools/palette-extractor/palette')
  >()),
  candidates: () => [
    { hex: '#FFFFFF', l: 1, c: 0, a: 0, b: 0, population: 0.6 },
    { hex: '#000000', l: 0, c: 0, a: 0, b: 0, population: 0.4 },
  ],
}));
vi.mock('../src/tools/palette-extractor/render', () => ({
  renderPalette: vi.fn(),
}));
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};
beforeEach(() => {
  vi.mocked(acceptImage).mockResolvedValue({
    width: 20,
    height: 10,
    info: { format: 'png', width: 20, height: 10, orientation: 1 },
    file: new File(['a'], 'a.png'),
    blob: new Blob(['a']),
  });
  vi.mocked(decodeChecked).mockImplementation(
    async () =>
      ({ width: 20, height: 10, close: vi.fn() }) as unknown as ImageBitmap,
  );
  vi.mocked(toBlob).mockResolvedValue(new Blob(['png'], { type: 'image/png' }));
  vi.mocked(renderPalette).mockResolvedValue(
    new Blob(['png'], { type: 'image/png' }),
  );
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () =>
      ({
        drawImage: vi.fn(),
        getImageData: () => ({
          width: 20,
          height: 10,
          data: new Uint8ClampedArray(800),
        }),
      }) as never,
  );
  vi.stubGlobal(
    'URL',
    Object.assign(URL, {
      createObjectURL: vi.fn(() => `blob:${Math.random()}`),
      revokeObjectURL: vi.fn(),
    }),
  );
});
async function loaded() {
  const session = new PaletteSession(mobileImageLimits);
  session.import(new File(['a'], 'a.png'));
  await tick();
  return session;
}

it('edits stable IDs, preserves target count, rejects partial HEX and keeps order', async () => {
  const session = await loaded(),
    colors = session.snapshot().colors;
  expect(colors).toHaveLength(2);
  expect(session.snapshot().count).toBe(6);
  expect(session.edit(colors[0].id, '#ab')).toBe(false);
  expect(session.snapshot().colors).toBe(colors);
  session.add('#aBc');
  const added = session.snapshot().colors[2];
  expect(added.hex).toBe('#AABBCC');
  session.move(added.id, -1);
  expect(session.snapshot().colors.map((c) => c.id)).toEqual([
    colors[0].id,
    added.id,
    colors[1].id,
  ]);
  session.remove(colors[0].id);
  expect(session.snapshot().colors.map((c) => c.id)).toEqual([
    added.id,
    colors[1].id,
  ]);
  session.edit(added.id, '#123456');
  expect(session.snapshot().colors[0].hex).toBe('#123456');
  expect(session.snapshot().dirty).toBe(true);
  expect(session.snapshot().count).toBe(6);
  session.extract('dark', 3);
  expect(session.snapshot().dirty).toBe(false);
  expect(session.snapshot().mode).toBe('dark');
  session.dispose();
  expect(session.resources.canvasesCreated).toBe(
    session.resources.canvasesReleased,
  );
  expect(session.resources.urlsCreated).toBe(session.resources.urlsRevoked);
});
it('never removes the final color or adds more than ten', async () => {
  const session = await loaded();
  for (let i = 0; i < 12; i++) session.add('#123456');
  expect(session.snapshot().colors).toHaveLength(10);
  for (const color of session.snapshot().colors) session.remove(color.id);
  expect(session.snapshot().colors).toHaveLength(1);
  session.dispose();
});
it('discards late imports, serializes replacement and closes temporary resources', async () => {
  const first = deferred<Awaited<ReturnType<typeof acceptImage>>>();
  const ready = await acceptImage(
    new File(['x'], 'x.png'),
    new PaletteSession(mobileImageLimits).resources,
  );
  vi.mocked(acceptImage).mockReturnValueOnce(first.promise);
  const session = new PaletteSession(mobileImageLimits);
  session.import(new File(['old'], 'old.png'));
  session.import(new File(['new'], 'new.png'));
  expect(acceptImage).toHaveBeenCalledTimes(2); // Explicit setup call + active old import; replacement is queued.
  first.resolve(ready);
  await tick();
  expect(session.snapshot().source?.name).toBe('new.png');
  expect(session.jobs.maxActive).toBe(1);
  session.clear();
  expect(session.snapshot().colors).toEqual([]);
  session.dispose();
  expect(session.resources.urlsCreated).toBe(session.resources.urlsRevoked);
  expect(session.resources.bitmapsCreated).toBe(0); // Mocked decoder owns no resource-counter creation.
});
it('invalidates exports on edit and settles queued promises on clear/unmount', async () => {
  const session = await loaded(),
    pending = deferred<Blob>();
  vi.mocked(renderPalette).mockReturnValueOnce(pending.promise);
  const result = session.export(undefined, () => true);
  const valid = vi.mocked(renderPalette).mock.calls.at(-1)![5]!;
  session.edit(session.snapshot().colors[0].id, '#112233');
  expect(valid()).toBe(false);
  const queued = session.export(undefined, () => true);
  session.clear();
  expect(await queued).toBeUndefined();
  expect(await result).toBeUndefined();
  pending.resolve(new Blob(['old']));
  await tick();
  expect(session.snapshot().source).toBeUndefined();
  session.dispose();
});
