import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MetadataSession } from '../src/tools/exif-metadata/session';
import { desktopImageLimits as limits } from '../src/tools/image/limits';
import { acceptImage, decodeChecked } from '../src/tools/image/browser-codec';
import { cleanImageMetadata } from '../src/tools/image/metadata';
import { readMetadata } from '../src/tools/exif-metadata/read-metadata';
import { packZip } from '../src/tools/image-converter/zip';

vi.mock('../src/tools/image/browser-codec', () => ({acceptImage: vi.fn(), decodeChecked: vi.fn()}));
vi.mock('../src/tools/image/metadata', () => ({cleanImageMetadata: vi.fn()}));
vi.mock('../src/tools/exif-metadata/read-metadata', () => ({readMetadata: vi.fn()}));
vi.mock('../src/tools/image-converter/zip', () => ({packZip: vi.fn()}));
const flush = async () => { for (let n = 0; n < 60; n++) await Promise.resolve(); };
const file = (name = 'art.jpg') => new File([new Uint8Array(1000)], name, {type: 'image/jpeg'});
const info = {format: 'jpeg' as const, width: 30, height: 20, orientation: 1 as const};
const result = () => ({blob: new Blob([new Uint8Array(500)], {type: 'image/jpeg'}), info, changed: true, metadataPolicy: 'privacy-v1' as const});
const sessions: MetadataSession[] = [];
const create = (budget = limits) => { const session = new MetadataSession(budget); sessions.push(session); return session; };
beforeEach(() => {
  vi.mocked(acceptImage).mockImplementation(async file => ({file, blob: file, width: 30, height: 20, info}));
  vi.mocked(decodeChecked).mockImplementation(async () => ({width: 30, height: 20, close: vi.fn()}) as unknown as ImageBitmap);
  vi.mocked(cleanImageMetadata).mockImplementation(async () => result());
  vi.mocked(readMetadata).mockResolvedValue({fields: [], blocks: [], partial: false});
  vi.mocked(packZip).mockResolvedValue(new Blob(['zip']));
  let serial = 0;
  vi.stubGlobal('URL', class extends URL {static createObjectURL = vi.fn(() => `blob:metadata-${++serial}`); static revokeObjectURL = vi.fn();});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});
afterEach(() => {sessions.splice(0).forEach(session => session.dispose()); vi.restoreAllMocks(); vi.useRealTimers();});

it('detects sequentially, appends, selects an adjacent file after removal, and never allocates preview URLs', async () => {
  const session = create(); session.add([file('a.jpg'), file('b.jpg')]); await flush();
  const [first, second] = session.snapshot().tasks;
  expect(session.snapshot().selectedId).toBe(first.id);
  expect(session.snapshot().tasks.map(task => task.status)).toEqual(['stale', 'stale']);
  expect(cleanImageMetadata).not.toHaveBeenCalled(); expect(URL.createObjectURL).not.toHaveBeenCalled();
  session.add([file('c.jpg')]); await flush();
  session.select(second.id); session.remove(second.id);
  expect(session.snapshot().tasks.find(task => task.id === session.snapshot().selectedId)?.file.name).toBe('c.jpg');
  session.remove(session.snapshot().selectedId!); expect(session.snapshot().selectedId).toBe(first.id);
  expect(session.jobs.maxActive).toBe(1);
});
it('isolates invalid input and cleanup failures, retries each phase, and keeps verified successes', async () => {
  const session = create(); vi.mocked(acceptImage).mockRejectedValueOnce(new Error('invalid'));
  session.add([file('invalid.jpg'), file('good.jpg'), file('other.jpg')]); await flush();
  expect(session.snapshot().tasks.map(task => task.status)).toEqual(['error', 'stale', 'stale']);
  vi.mocked(cleanImageMetadata).mockRejectedValueOnce(new Error('unsupported metadata'));
  session.clean(); await flush();
  expect(session.snapshot().tasks.map(task => task.status)).toEqual(['error', 'error', 'ready']);
  const [bad, retry, success] = session.snapshot().tasks;
  session.retry(bad.id); session.retry(retry.id); await flush();
  expect(session.snapshot().tasks.map(task => task.status)).toEqual(['stale', 'ready', 'ready']);
  expect(session.snapshot().tasks[2].output).toBe(success.output);
  session.clean(bad.id); await flush(); expect(session.snapshot().tasks.every(task => task.status === 'ready')).toBe(true);
});
it('validates unchanged outputs and gives them normal individual and ZIP download qualification', async () => {
  const session = create(); session.add([file()]); await flush();
  vi.mocked(cleanImageMetadata).mockResolvedValueOnce({...result(), changed: false}); session.clean(); await flush();
  const task = session.snapshot().tasks[0]; expect(task).toMatchObject({status: 'ready', output: {changed: false}});
  expect(decodeChecked).toHaveBeenCalledOnce();
  const save = vi.spyOn(session, 'save').mockImplementation(() => {});
  session.download(task.id); await session.zip(); expect(save).toHaveBeenCalledTimes(2);
  expect(vi.mocked(packZip).mock.calls[0][0][0].blob).toBe(task.output!.blob);
});
it.each(['mime', 'dimensions', 'decode'] as const)('refuses a %s validation failure without a downloadable result', async reason => {
  const session = create(); session.add([file()]); await flush();
  if (reason === 'mime') vi.mocked(cleanImageMetadata).mockResolvedValueOnce({...result(), blob: new Blob(['bad'], {type: 'image/png'})});
  if (reason === 'dimensions') vi.mocked(cleanImageMetadata).mockResolvedValueOnce({...result(), info: {...info, width: 31}});
  if (reason === 'decode') vi.mocked(decodeChecked).mockRejectedValueOnce(new Error('decode'));
  session.clean(); await flush(); expect(session.snapshot().tasks[0]).toMatchObject({status: 'error', error: 'clean', output: undefined});
  const save = vi.spyOn(session, 'save'); session.download(session.snapshot().tasks[0].id); expect(save).not.toHaveBeenCalled();
  await expect(session.zip()).rejects.toThrow('empty');
});
it('enforces input count, individual and aggregate bytes, and cumulative result bounds', async () => {
  const session = create({...limits, files: 3, bytes: 1500, totalBytes: 2500});
  session.add([new File([new Uint8Array(1600)], 'large.jpg'), file('a.jpg'), file('b.jpg'), file('over.jpg')]); await flush();
  expect(session.snapshot().issues).toEqual(['large.jpg', 'over.jpg']);
  vi.mocked(cleanImageMetadata).mockImplementation(async () => ({...result(), blob: new Blob([new Uint8Array(1400)], {type: 'image/jpeg'})}));
  session.clean(); await flush(); expect(session.snapshot().tasks.map(task => task.status)).toEqual(['ready', 'error']);
  expect(session.snapshot().tasks[1].error).toBe('budget');
  const count = create({...limits, files: 1}); count.add([file(), file()]); expect(count.snapshot().issues).toHaveLength(1);
});
it.each(['remove', 'clear', 'dispose'] as const)('cancels waiting work and discards late native output on %s', async action => {
  const session = create(); session.add([file('a.jpg'), file('b.jpg')]); await flush();
  let finish!: (value: ImageBitmap) => void;
  vi.mocked(decodeChecked).mockImplementationOnce(() => new Promise(resolve => {finish = resolve;}));
  session.clean(); await flush(); expect(decodeChecked).toHaveBeenCalledTimes(1);
  const first = session.snapshot().tasks[0].id;
  if (action === 'remove') {session.remove(first); session.remove(session.snapshot().tasks[0].id);} else session[action]();
  session.download(first); const close = vi.fn(); finish({width: 30, height: 20, close} as unknown as ImageBitmap); await flush();
  expect(close).toHaveBeenCalledOnce(); expect(session.snapshot().tasks).toEqual([]); expect(decodeChecked).toHaveBeenCalledTimes(1);
  expect(session.resources.urlsCreated).toBe(0);
});
it('keeps a timed-out native lane occupied until settlement and retries without accepting its late result', async () => {
  vi.useFakeTimers(); const session = create(); session.add([file('a.jpg'), file('b.jpg')]); await flush();
  let finish!: (value: ReturnType<typeof result>) => void;
  vi.mocked(cleanImageMetadata).mockImplementationOnce(() => new Promise(resolve => {finish = resolve;}));
  session.clean(); await flush(); await vi.advanceTimersByTimeAsync(45000);
  expect(session.snapshot().tasks[0]).toMatchObject({status: 'error', error: 'timeout'});
  session.retry(session.snapshot().tasks[0].id); await flush(); expect(cleanImageMetadata).toHaveBeenCalledTimes(1);
  finish(result()); await flush(); expect(session.snapshot().tasks.map(task => task.status)).toEqual(['ready', 'ready']);
  expect(cleanImageMetadata).toHaveBeenCalledTimes(3); expect(session.jobs.maxActive).toBe(1);
});
it('accounts for removed active input until native inspection finishes', async () => {
  const session = create({...limits, totalBytes: 1500}), original = file();
  let finish!: (value: Awaited<ReturnType<typeof acceptImage>>) => void;
  vi.mocked(acceptImage).mockImplementationOnce(() => new Promise(resolve => {finish = resolve;}));
  session.add([original]); await flush(); session.clear(); session.add([file('blocked.jpg')]);
  expect(session.snapshot().tasks).toEqual([]); expect(session.snapshot().issues).toEqual(['blocked.jpg']);
  finish({file: original, blob: original, info, width: 30, height: 20}); await flush();
  session.add([file('allowed.jpg')]); await flush(); expect(session.snapshot().tasks[0].status).toBe('stale');
});
it('packs only finished successes with stable unique names and invalidates changed ZIP snapshots', async () => {
  const session = create(); session.add([file(), file()]); await flush();
  await expect(session.zip()).rejects.toThrow('pending'); session.clean(); await flush();
  const save = vi.spyOn(session, 'save').mockImplementation(() => {}); await session.zip();
  expect(new Set(vi.mocked(packZip).mock.calls[0][0].map(entry => entry.name)).size).toBe(2);
  let finish!: (blob: Blob) => void;
  vi.mocked(packZip).mockImplementationOnce(() => new Promise(resolve => {finish = resolve;}));
  const packing = session.zip(); session.select(session.snapshot().tasks[1].id); finish(new Blob(['valid'])); await packing;
  vi.mocked(packZip).mockImplementationOnce(() => new Promise(resolve => {finish = resolve;}));
  const changed = session.zip(); session.remove(session.snapshot().tasks[0].id); finish(new Blob(['old']));
  await expect(changed).rejects.toThrow('changed'); expect(save).toHaveBeenCalledTimes(2);
});
it('releases transient download URLs on deletion, timers, and disposal', async () => {
  vi.useFakeTimers(); const session = create(); session.add([file('a.jpg'), file('b.jpg')]); await flush(); session.clean(); await flush();
  const [a,b] = session.snapshot().tasks; session.download(a.id); session.download(a.id);
  expect(session.resources.urlsRevoked).toBe(1); session.remove(a.id); expect(session.resources.urlsRevoked).toBe(2);
  session.download(b.id); await vi.advanceTimersByTimeAsync(1000); expect(session.resources.urlsRevoked).toBe(3);
  session.download(b.id); session.dispose(); expect(session.resources.urlsCreated).toBe(session.resources.urlsRevoked);
});
