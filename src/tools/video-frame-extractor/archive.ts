import { Zip, ZipPassThrough } from 'fflate';
import type { ArchiveSink } from '../archive/stream-zip';
import { memoryLimit, VideoError, zipByteLimit, zipEntryLimit } from './core';

export type ArchiveHandle = { createWritable(): Promise<ArchiveSink> };
type SavePicker = (options: {
  suggestedName: string;
  types: { description: string; accept: Record<string, string[]> }[];
}) => Promise<ArchiveHandle>;

export function chooseVideoZip(name: string) {
  const picker = (window as Window & { showSaveFilePicker?: SavePicker }).showSaveFilePicker;
  if (window.isSecureContext && picker) {
    return picker.call(window, {
      suggestedName: name,
      types: [{ description: 'ZIP', accept: { 'application/zip': ['.zip'] } }],
    });
  }
}

export function videoArchive(signal: AbortSignal, sink?: ArchiveSink) {
  const parts: BlobPart[] = [];
  let chunks: Uint8Array<ArrayBuffer>[] = [], failure: unknown, final = false, entries = 0;
  let projected = 22, closed = false, aborting: Promise<void> | undefined;
  const maxBytes = sink ? zipByteLimit : memoryLimit;
  const zip = new Zip((error, data, end) => {
    if (error) { failure = error; return; }
    chunks.push(data as Uint8Array<ArrayBuffer>);
    final = end;
  });
  const abort = () => {
    if (closed) return;
    chunks.length = parts.length = 0;
    zip.terminate();
    aborting ??= Promise.resolve().then(() => sink?.abort(signal.reason)).catch(() => {});
  };
  if (signal.aborted) abort();
  else signal.addEventListener('abort', abort, { once: true });

  const drain = async () => {
    signal.throwIfAborted();
    if (failure) throw new VideoError('write');
    const next = chunks;
    chunks = [];
    if (!sink) parts.push(...next);
    else for (const chunk of next) {
      try { await sink.write(chunk); } catch { throw new VideoError('write'); }
      signal.throwIfAborted();
    }
  };
  return {
    async add(name: string, image: Blob) {
      signal.throwIfAborted();
      if (!image.size) throw new VideoError('encode');
      // Size and offset fields in fflate's Zip writer are 32 bit. Account
      // for both headers, UTF-8 names and the data descriptor before adding.
      const length = new TextEncoder().encode(name).length;
      projected += image.size + 92 + length * 2;
      if (++entries > zipEntryLimit || projected > zipByteLimit) throw new VideoError('zipFormat');
      if (projected > maxBytes) throw new VideoError('zipBudget');
      const entry = new ZipPassThrough(name);
      zip.add(entry);
      await drain();
      for (let offset = 0; offset < image.size; offset += 1024 ** 2) {
        const data = new Uint8Array(await image.slice(offset, offset + 1024 ** 2).arrayBuffer());
        signal.throwIfAborted();
        entry.push(data, offset + data.length === image.size);
        await drain();
      }
    },
    async finish() {
      signal.throwIfAborted();
      if (!entries) throw new VideoError('empty');
      zip.end();
      await drain();
      if (!final) throw new VideoError('write');
      let result: Blob | undefined;
      if (!sink) result = new Blob(parts, { type: 'application/zip' });
      else {
        try { await sink.close(); } catch { throw new VideoError('write'); }
      }
      signal.throwIfAborted();
      closed = true;
      return result;
    },
    async dispose() {
      signal.removeEventListener('abort', abort);
      abort();
      await aborting;
      parts.length = 0;
    },
  };
}
