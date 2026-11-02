// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { unzipSync } from 'fflate';
import { ComicSession, archiveEntries, naturalPages } from '../src/tools/comic-page-organizer/session';
import { acceptImage } from '../src/tools/image/browser-codec';
import { desktopImageLimits as limits, zipOutputBytes } from '../src/tools/image/limits';
import type { ImageSource } from '../src/tools/image/types';

vi.mock('../src/tools/image/browser-codec', () => ({acceptImage: vi.fn()}));
const file = (name: string, bytes = 'original EXIF bytes') => new File([bytes], name, {type: 'image/png'});
const source = (f: File): ImageSource => ({file: f, blob: f, width: 50, height: 80, info: {format: 'png', width: 50, height: 80, orientation: 1}});
const sessions: ComicSession[] = [];
const create = (budget = limits) => { const session = new ComicSession(budget); sessions.push(session); return session; };
const flush = async () => {for (let i = 0; i < 30; i++) await Promise.resolve();};
const deferred = <T>() => { let resolve!: (value: T) => void; return {promise: new Promise<T>(done => {resolve = done;}), resolve: (value: T) => resolve(value)}; };
beforeEach(() => {vi.mocked(acceptImage).mockImplementation(async f => {if (f.name === 'broken.png') throw new Error('decode'); return source(f);});});
afterEach(() => {sessions.splice(0).forEach(session => session.dispose()); vi.useRealTimers();});

describe('comic page ownership and ordering', () => {
  it('naturally sorts filenames and folder paths with stable duplicate ties', () => {
    const a = file('page2.png'), b = file('page2.png');
    expect(naturalPages([file('page10.png'), b, file('page1.png'), a].map(file => ({file}))).map(item => item.file)).toEqual([expect.objectContaining({name: 'page1.png'}), b, a, expect.objectContaining({name: 'page10.png'})]);
    const nested = file('1.png'); Object.defineProperty(nested, 'webkitRelativePath', {value: 'Book/10/1.png'});
    const earlier = file('2.png'); Object.defineProperty(earlier, 'webkitRelativePath', {value: 'Book/2/2.png'});
    expect(naturalPages([{file: nested}, {file: earlier}])[0].file).toBe(earlier);
  });
  it('appends naturally sorted batches while retaining manual order and stable IDs', async () => {
    const session = create(); session.add([file('10.png'), file('2.png'), file('1.png')]); await flush();
    const ids = session.snapshot().pages.map(page => page.id);
    expect(session.snapshot().pages.map(page => page.file.name)).toEqual(['1.png', '2.png', '10.png']);
    session.move(ids[2], 0); session.add([file('30.png'), file('20.png')]); await flush();
    expect(session.snapshot().pages.map(page => page.file.name)).toEqual(['10.png', '1.png', '2.png', '20.png', '30.png']);
    expect(session.snapshot().pages[0].id).toBe(ids[2]);
    session.sort();
    expect(session.snapshot().pages.map(page => page.file.name)).toEqual(['1.png', '2.png', '10.png', '20.png', '30.png']);
    session.move(ids[0], 4); expect(session.snapshot().pages[4].id).toBe(ids[0]);
    session.move(ids[0], 0); expect(session.snapshot().pages[0].id).toBe(ids[0]);
  });
  it('resets duplicate paths to initial intake order after manual moves and later additions', async () => {
    const session = create(), a = file('2.png', 'first'), b = file('2.png', 'second'), c = file('2.png', 'third');
    session.add([a, file('10.png'), b]); await flush();
    const second = session.snapshot().pages.find(page => page.file === b)!;
    session.move(second.id, 0); session.add([c, file('1.png')]); await flush();
    session.sort();
    expect(session.snapshot().pages.map(page => page.file)).toEqual([expect.objectContaining({name: '1.png'}), a, b, c, expect.objectContaining({name: '10.png'})]);
    const order = session.snapshot().pages.map(page => page.id);
    session.sort(); expect(session.snapshot().pages.map(page => page.id)).toEqual(order);
  });
  it('multiselects, removes and clears pages with exact URL release', async () => {
    const session = create(); session.add([file('1.png'), file('2.png')]); await flush();
    const ids = session.snapshot().pages.map(page => page.id); session.select(ids[0], true); session.select(ids[0], true);
    expect(session.snapshot().selected).toEqual([ids[0]]); session.selectAll(true); expect(session.snapshot().selected).toEqual(ids);
    session.remove([ids[1]]); expect(session.resources.urlsRevoked).toBe(1);
    session.clear(); expect(session.snapshot()).toMatchObject({pages: [], selected: [], intake: undefined});
    expect(session.resources.urlsCreated).toBe(session.resources.urlsRevoked);
  });
  it('rejects unsupported/over-budget inputs while valid files and later validation continue', async () => {
    const session = create({...limits, files: 2, bytes: 20, totalBytes: 30});
    session.add([new File(['bad'], 'bad.txt', {type: 'text/plain'}), file('large.png', 'x'.repeat(21)), file('broken.png', 'x'), file('valid.png', 'x'), file('extra.png', 'x')]); await flush();
    expect(session.snapshot().intake).toMatchObject({accepted: 2, rejected: {type: 1, size: 1, count: 1}});
    expect(session.snapshot().pages.map(page => page.status)).toEqual(['error', 'ready']);
    const result = await session.pack('zip'); expect(result).toBeDefined();
    expect(Object.keys(unzipSync(new Uint8Array(await result!.blob.arrayBuffer())))).toEqual(['page-001.png']);
  });
  it('retains removed active input bytes and serial occupancy until native validation settles', async () => {
    const gate = deferred<ImageSource>(), f = file('active.png', '12345678');
    vi.mocked(acceptImage).mockImplementationOnce(() => gate.promise);
    const session = create({...limits, totalBytes: 10}); session.add([f]);
    session.remove([session.snapshot().pages[0].id]); session.add([file('blocked.png', '123')]);
    expect(session.snapshot().intake?.rejected.total).toBe(1);
    session.add([file('allowed.png', '1')]); await flush(); expect(acceptImage).toHaveBeenCalledTimes(1);
    gate.resolve(source(f)); await flush(); expect(acceptImage).toHaveBeenCalledTimes(2);
    expect(session.snapshot().pages).toHaveLength(1); expect(session.resources.urlsCreated).toBe(1);
    expect(session.jobs.maxActive).toBe(1);
  });
  it('times out without overlapping the next native operation or accepting late results', async () => {
    vi.useFakeTimers(); const gate = deferred<ImageSource>(), f = file('1.png');
    vi.mocked(acceptImage).mockImplementationOnce(() => gate.promise);
    const session = create(); session.add([f, file('2.png')]); await vi.advanceTimersByTimeAsync(45001);
    expect(session.snapshot().pages.map(page => page.status)).toEqual(['error', 'queued']); expect(acceptImage).toHaveBeenCalledTimes(1);
    gate.resolve(source(f)); await flush(); expect(session.snapshot().pages.map(page => page.status)).toEqual(['error', 'ready']);
    expect(session.resources.urlsCreated).toBe(1);
  });
});

describe('original-byte comic archives', () => {
  it.each(['zip', 'cbz'] as const)('exports ordered %s entries with a first-page cover and unchanged source bytes', async format => {
    const session = create(), a = file('same.png', 'EXIF untouched A'), b = file('same.png', 'EXIF untouched B');
    session.add([a, b, file('10.png', 'PAGE10')]); await flush();
    const second = session.snapshot().pages.find(page => page.file === b)!; session.move(second.id, 0);
    const expected = session.snapshot().pages.map(page => page.file);
    const result = await session.pack(format); expect(result?.filename.endsWith(`.${format}`)).toBe(true);
    expect(result?.blob.type).toBe(format === 'cbz' ? 'application/vnd.comicbook+zip' : 'application/zip');
    const extracted = unzipSync(new Uint8Array(await result!.blob.arrayBuffer()));
    expect(Object.keys(extracted)).toEqual(['page-001.png', 'page-002.png', 'page-003.png']);
    for (const [i, bytes] of Object.values(extracted).entries()) expect(bytes).toEqual(new Uint8Array(await expected[i].arrayBuffer()));
    expect(archiveEntries(session.snapshot().pages).every((entry, i) => entry.blob === expected[i])).toBe(true);
    session.select(second.id, true); expect(result?.current()).toBe(true);
    session.move(session.snapshot().pages[2].id, 1); expect(result?.current()).toBe(false);
    expect(session.download(result!)).toBe(false);
  });
  it('uses inspected format rather than the extension and never creates name collisions', async () => {
    vi.mocked(acceptImage).mockImplementation(async f => ({...source(f), info: {...source(f).info, format: 'jpeg'}}));
    const session = create(); session.add([file('../../same.png'), file('../../same.png')]); await flush();
    expect(archiveEntries(session.snapshot().pages).map(entry => entry.name)).toEqual(['page-001.jpg', 'page-002.jpg']);
  });
  it('invalidates an in-flight ZIP before delivery and shares the serial lane with new imports', async () => {
    const session = create(), f = file('1.png'); session.add([f]); await flush();
    const block = deferred<ArrayBuffer>(); vi.spyOn(f, 'slice').mockReturnValue({arrayBuffer: () => block.promise} as Blob);
    const packing = session.pack('cbz'); await flush(); expect(session.snapshot().packing).toBe(true);
    session.add([file('2.png')]); expect(await packing).toBeUndefined(); await flush(); expect(acceptImage).toHaveBeenCalledTimes(1);
    block.resolve(new Uint8Array([1, 2]).buffer); await flush();
    expect(acceptImage).toHaveBeenCalledTimes(2); expect(session.snapshot().packing).toBe(false);
  });
  it('cancels an archive snapshot when the first page moves, and regenerates in actual order', async () => {
    const session = create(), f = file('1.png'); session.add([f, file('2.png')]); await flush();
    const block = deferred<ArrayBuffer>(), slice = vi.spyOn(f, 'slice').mockReturnValue({arrayBuffer: () => block.promise} as Blob);
    const packing = session.pack('zip'); await flush();
    session.move(session.snapshot().pages[0].id, 1); expect(await packing).toBeUndefined();
    block.resolve(new Uint8Array([1, 2]).buffer); await flush(); slice.mockRestore();
    const result = await session.pack('cbz');
    const entries = Object.values(unzipSync(new Uint8Array(await result!.blob.arrayBuffer())));
    expect(entries[0]).toEqual(new Uint8Array(await session.snapshot().pages[0].file.arrayBuffer()));
    session.sort(); expect(result?.current()).toBe(false);
  });
  it('checks the ZIP output budget before reading file bytes', async () => {
    const huge = file('huge.png'); Object.defineProperty(huge, 'size', {value: zipOutputBytes});
    const session = create({...limits, bytes: zipOutputBytes, totalBytes: zipOutputBytes}); session.add([huge]); await flush();
    const slice = vi.spyOn(huge, 'slice'); expect(await session.pack('zip')).toBeUndefined();
    expect(session.snapshot().archiveError).toBe('budget'); expect(slice).not.toHaveBeenCalled();
  });
  it('does not deliver or allocate URLs after disposal while validation is pending', async () => {
    const gate = deferred<ImageSource>(), f = file('page.png'); vi.mocked(acceptImage).mockImplementationOnce(() => gate.promise);
    const session = create(); session.add([f]); session.dispose(); gate.resolve(source(f)); await flush();
    expect(session.resources.urlsCreated).toBe(0); expect(await session.pack('zip')).toBeUndefined();
    session.add([file('late.png')]); expect(session.snapshot().pages).toHaveLength(0);
  });
});
