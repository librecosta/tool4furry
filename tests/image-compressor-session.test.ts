import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CompressorSession } from '../src/tools/image-compressor/session';
import { desktopImageLimits as limits } from '../src/tools/image/limits';
import { acceptImage } from '../src/tools/image/browser-codec';
import { compressImage } from '../src/tools/image-compressor/compress';
import { packZip } from '../src/tools/image-converter/zip';

vi.mock('../src/tools/image/browser-codec', () => ({acceptImage: vi.fn()}));
vi.mock('../src/tools/image-compressor/compress', async original => ({...await original<typeof import('../src/tools/image-compressor/compress')>(), compressImage: vi.fn()}));
vi.mock('../src/tools/image-converter/zip', () => ({packZip: vi.fn()}));
const flush = async () => { for (let n = 0; n < 40; n++) await Promise.resolve(); };
const file = (name = 'art.png') => new File([new Uint8Array(3000)], name, {type: 'image/png'});
const result = () => ({blob: new Blob([new Uint8Array(1000)], {type: 'image/webp'}), width: 30, height: 20, format: 'webp' as const, quality: 82, targetMet: true, saved: 2000, attempts: 1});
const sessions: CompressorSession[] = [];
const create = (budget = limits) => { const session = new CompressorSession(budget); sessions.push(session); return session; };
beforeEach(() => {
  vi.mocked(acceptImage).mockImplementation(async file => ({file, blob: file, width: 30, height: 20, info: {format: 'png', width: 30, height: 20, orientation: 1}}));
  vi.mocked(compressImage).mockImplementation(async () => result());
  vi.mocked(packZip).mockResolvedValue(new Blob(['zip']));
  let id = 0;
  vi.stubGlobal('URL', class extends URL { static createObjectURL = vi.fn(() => `blob:compress-${++id}`); static revokeObjectURL = vi.fn(); });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});
afterEach(() => { for (const session of sessions.splice(0)) session.dispose(); vi.useRealTimers(); });

it('imports valid files alongside invalid files, supports append and applies count/byte boundaries', async () => {
  const session = create({...limits, files: 3, totalBytes: 10000});
  vi.mocked(acceptImage).mockImplementationOnce(async () => { throw new Error('bad'); });
  session.add([file('bad.png'), file('good.png')]); await flush();
  expect(session.snapshot().tasks.map(task => task.status)).toEqual(['error', 'stale']);
  session.add([file('append.png'), file('over.png')]); await flush();
  expect(session.snapshot().tasks).toHaveLength(3); expect(session.snapshot().issues).toEqual(['over.png']);
  session.remove(session.snapshot().tasks[0].id); session.clear();
  expect(session.snapshot().tasks).toEqual([]); expect(session.resources.urlsCreated).toBe(session.resources.urlsRevoked);
});
it('does not encode on import; supports isolated failure, retry and current result download', async () => {
  const session = create(); session.add([file('one.png'), file('two.png')]); await flush();
  expect(compressImage).not.toHaveBeenCalled();
  vi.mocked(compressImage).mockRejectedValueOnce(new Error('encoder'));
  session.start(); await flush(); expect(session.snapshot().tasks.map(task => task.status)).toEqual(['error', 'ready']);
  session.retry(session.snapshot().tasks[0].id); await flush();
  expect(session.snapshot().tasks.every(task => task.status === 'ready')).toBe(true);
  const save = vi.spyOn(session, 'save').mockImplementation(() => {}), task = session.snapshot().tasks[0];
  session.download(task.id); expect(save).toHaveBeenCalledWith(task.result!.blob, expect.stringMatching(/\.webp$/));
});
it('invalidates results immediately and does not overlap late native work with replacement tasks', async () => {
  const session = create(); session.add([file('one.png'), file('two.png')]); await flush();
  let release!: (value: ReturnType<typeof result>) => void;
  vi.mocked(compressImage).mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
  session.start(); await flush(); expect(compressImage).toHaveBeenCalledTimes(1);
  session.configure({quality: 65}); session.start(); await flush(); expect(compressImage).toHaveBeenCalledTimes(1);
  expect(session.snapshot().tasks.every(task => !task.result)).toBe(true);
  release(result()); await flush(); expect(compressImage).toHaveBeenCalledTimes(3);
  expect(session.snapshot().tasks.every(task => task.status === 'ready')).toBe(true);
  expect(session.jobs.maxActive).toBe(1);
  const resultURLs = session.snapshot().tasks.map(task => task.result!.url);
  session.configure({quality: 64});
  expect(session.snapshot().tasks.every(task => task.status === 'stale' && !task.result)).toBe(true);
  for (const url of resultURLs) expect(URL.revokeObjectURL).toHaveBeenCalledWith(url);
});
it('cancels waiting tasks and ignores active completion after deletion/unmount', async () => {
  const session = create(); session.add([file('one.png'), file('two.png')]); await flush();
  let release!: (value: ReturnType<typeof result>) => void;
  vi.mocked(compressImage).mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
  session.start(); await flush(); session.cancel(); session.remove(session.snapshot().tasks[0].id); session.dispose();
  release(result()); await flush(); expect(compressImage).toHaveBeenCalledTimes(1);
  expect(session.snapshot().tasks).toEqual([]); expect(session.resources.urlsCreated).toBe(session.resources.urlsRevoked);
});
it.each(['intake', 'encode'] as const)('counts a removed active %s File against admission until its native operation settles', async phase => {
  const session = create({...limits, totalBytes: 5000}), first = file('first.png');
  let settle!: () => void;
  if (phase === 'intake') {
    vi.mocked(acceptImage).mockImplementationOnce(() => new Promise(resolve => {
      settle = () => resolve({file: first, blob: first, width: 30, height: 20, info: {format: 'png', width: 30, height: 20, orientation: 1}});
    }));
  } else {
    vi.mocked(compressImage).mockImplementationOnce(() => new Promise(resolve => { settle = () => resolve(result()); }));
  }
  session.add([first]); await flush();
  if (phase === 'encode') { session.start(); await flush(); }
  session.remove(session.snapshot().tasks[0].id);
  session.add([file('blocked.png')]);
  expect(session.snapshot().tasks).toEqual([]);
  expect(session.snapshot().issues).toEqual(['blocked.png']);
  settle(); await flush();
  expect(session.snapshot().tasks).toEqual([]);
  session.add([file('allowed.png')]); await flush();
  expect(session.snapshot().tasks.map(task => task.file.name)).toEqual(['allowed.png']);
  expect(session.snapshot().tasks[0].status).toBe('stale');
});
it('keeps cumulative results bounded without discarding other verified files', async () => {
  const session = create({...limits, totalBytes: 6500}); session.add([file('one.png'), file('two.png')]); await flush();
  vi.mocked(compressImage).mockImplementation(async () => ({...result(), blob: new Blob([new Uint8Array(4000)])}));
  session.start(); await flush(); expect(session.snapshot().tasks.map(task => task.status)).toEqual(['ready', 'error']);
  expect(session.snapshot().tasks[1].error).toBe('bytes'); expect(session.snapshot().tasks[0].result).toBeDefined();
});
it('only packs current finished results, uses unique names and aborts changed ZIP snapshots', async () => {
  const session = create(); session.add([file(), file()]); await flush();
  const save = vi.spyOn(session, 'save').mockImplementation(() => {});
  session.start(); await expect(session.zip()).rejects.toThrow('pending'); await flush();
  await session.zip();
  const entries = vi.mocked(packZip).mock.calls[0][0];
  expect(entries).toHaveLength(2); expect(new Set(entries.map(entry => entry.name)).size).toBe(2);
  expect(save).toHaveBeenCalledOnce();
  let finish!: (value: Blob) => void;
  vi.mocked(packZip).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const packing = session.zip(); session.configure({quality: 50}); finish(new Blob(['old zip']));
  await expect(packing).rejects.toThrow('changed'); expect(save).toHaveBeenCalledOnce();
});
