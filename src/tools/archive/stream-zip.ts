import { Zip, ZipPassThrough } from 'fflate';

export type ArchiveEntry = Readonly<{name: string; blob: Blob}>;
export type LazyArchiveEntry = Readonly<{name: string; blob: () => Promise<Blob>}>;
export type ArchiveSink = {write(data: Uint8Array<ArrayBuffer>): Promise<void>; close(): Promise<void>; abort(reason?: unknown): Promise<void>};
export class ArchiveFailure extends Error {
  constructor(readonly code: 'budget' | 'changed' | 'failed' | 'timeout') {super(code);}
}
// Stored, non-ZIP64 output. Conservative bounds leave room for descriptors and
// the central directory. No directory paths or case-insensitive name collisions.
function archiveHeaders(entries: readonly {name: string}[]) {
  const names = new Set<string>(); let bytes = 22;
  if (!entries.length || entries.length >= 65535) throw new ArchiveFailure('budget');
  for (const {name} of entries) {
    const length = new TextEncoder().encode(name).length;
    if (!length || length > 180 || /[\x00-\x1f\x7f/\\<>:"|?*]/.test(name) || name === '.' || name === '..' || names.has(name.toLowerCase())) throw new ArchiveFailure('failed');
    names.add(name.toLowerCase());
    bytes += 92 + length * 2;
  }
  if (bytes >= 0xffffffff) throw new ArchiveFailure('budget');
  return bytes;
}
export function archiveSize(entries: readonly ArchiveEntry[]) {
  let bytes = archiveHeaders(entries);
  for (const {blob} of entries) {
    if (!Number.isSafeInteger(blob.size) || blob.size < 0 || blob.size >= 0xffffffff) throw new ArchiveFailure('budget');
    bytes += blob.size;
  }
  if (bytes >= 0xffffffff) throw new ArchiveFailure('budget');
  return bytes;
}

/** One input chunk at a time. fflate emits synchronously; drain its small batch
 * before reading the next chunk, so a slow disk never accumulates an archive. */
export async function writeZip(entries: readonly (ArchiveEntry | LazyArchiveEntry)[], sink: ArchiveSink, options: {
  signal: AbortSignal; maxBytes: number; idleMs?: number;
  prepare?: (entry: ArchiveEntry | LazyArchiveEntry, index: number) => Promise<void>;
  progress?: (finished: number) => void;
  beforeClose?: () => void;
}) {
  const {signal} = options;
  let pending: Uint8Array<ArrayBuffer>[] = [], bytes = 0, final = false, failure: unknown;
  const check = () => {if (signal.aborted) throw new ArchiveFailure('changed'); if (failure) throw failure;};
  const zip = new Zip((error, data, done) => {
    if (error) {failure = error; return;}
    bytes += data.byteLength;
    if (bytes > options.maxBytes) {failure = new ArchiveFailure('budget'); return;}
    pending.push(data as Uint8Array<ArrayBuffer>); final = done;
  });
  // Abort wakes a blocked writable. We still await the actual operation before
  // releasing the caller's serial lane; no late close can commit a stale file.
  let aborted: Promise<void> | undefined;
  const abort = () => {aborted ??= Promise.resolve().then(() => sink.abort(signal.reason)).catch(() => {});};
  signal.addEventListener('abort', abort, {once: true});
  const wait = async <T>(operation: () => Promise<T>) => {
    check(); let expired = false;
    const timer = setTimeout(() => {expired = true; abort();}, options.idleMs ?? 30000);
    try {const value = await operation(); if (expired) throw new ArchiveFailure('timeout'); check(); return value;}
    catch (error) {if (expired) throw new ArchiveFailure('timeout'); throw error;}
    finally {clearTimeout(timer);}
  };
  const drain = async () => {
    check(); const batch = pending; pending = [];
    for (const data of batch) await wait(() => sink.write(data));
  };
  try {
    check(); let projected = archiveHeaders(entries);
    if (!Number.isSafeInteger(options.maxBytes) || options.maxBytes < 22 || options.maxBytes >= 0xffffffff || projected > options.maxBytes) throw new ArchiveFailure('budget');
    for (const entry of entries) if (typeof entry.blob !== 'function') {
      if (!Number.isSafeInteger(entry.blob.size) || entry.blob.size < 0 || entry.blob.size >= 0xffffffff) throw new ArchiveFailure('budget');
      projected += entry.blob.size;
    }
    if (projected > options.maxBytes) throw new ArchiveFailure('budget');
    for (const [index, entry] of entries.entries()) {
      check(); await options.prepare?.(entry, index); check();
      // Await only this page. Never retain generated Blobs in the entry list.
      const blob = typeof entry.blob === 'function' ? await entry.blob() : entry.blob;
      check();
      if (typeof entry.blob === 'function') {
        if (!Number.isSafeInteger(blob.size) || blob.size < 0 || blob.size >= 0xffffffff) throw new ArchiveFailure('budget');
        projected += blob.size;
        if (projected > options.maxBytes) throw new ArchiveFailure('budget');
      }
      const file = new ZipPassThrough(entry.name); zip.add(file); await drain();
      for (let offset = 0; offset < blob.size; offset += 1024 ** 2) {
        const data = new Uint8Array(await wait(() => blob.slice(offset, offset + 1024 ** 2).arrayBuffer()));
        file.push(data, offset + data.length === blob.size); await drain();
      }
      if (!blob.size) {file.push(new Uint8Array(), true); await drain();}
      options.progress?.(index + 1);
    }
    zip.end(); await drain(); check();
    if (!final) throw new ArchiveFailure('failed');
    options.beforeClose?.();
    await wait(() => sink.close());
  } catch (error) {abort(); await aborted; throw error;}
  finally {signal.removeEventListener('abort', abort); zip.terminate(); pending.length = 0;}
}

export async function zipBlob(entries: readonly (ArchiveEntry | LazyArchiveEntry)[], options: Parameters<typeof writeZip>[2]) {
  const parts: BlobPart[] = [];
  try {
    await writeZip(entries, {async write(data) {parts.push(data);}, async close() {}, async abort() {parts.length = 0;}}, options);
    return new Blob(parts, {type: 'application/zip'});
  } finally {parts.length = 0;}
}
