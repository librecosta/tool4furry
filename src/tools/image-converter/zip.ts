import { Zip, ZipPassThrough } from 'fflate';

export const zipBudget = 128 * 1024 ** 2;
export const zipChunkSize = 1024 ** 2;
export class ZipFailure extends Error {
  constructor(readonly code: 'budget' | 'changed' | 'failed') {
    super(code);
  }
}
type Entry = Readonly<{ name: string; blob: Blob }>;

/** Stored ZIP only. Input is chunked; output parts and the final Blob still use memory. */
export async function packZip(entries: readonly Entry[], signal: AbortSignal) {
  const check = () => {
    if (signal.aborted) throw new ZipFailure('changed');
  };
  check();
  const names = new Set<string>();
  let estimated = 22; // EOCD; each entry adds local header, descriptor and directory record.
  for (const { name, blob } of entries) {
    const length = new TextEncoder().encode(name).length;
    if (
      !length ||
      length > 180 ||
      /[\x00-\x1f\x7f/\\<>:"|?*]/.test(name) ||
      name === '.' ||
      name === '..' ||
      names.has(name.toLowerCase())
    )
      throw new ZipFailure('failed');
    names.add(name.toLowerCase());
    estimated += blob.size + 92 + 2 * length;
  }
  if (!entries.length) throw new ZipFailure('failed');
  if (estimated > zipBudget) throw new ZipFailure('budget');
  const parts: BlobPart[] = [];
  let bytes = 0;
  let failure: Error | undefined;
  let finished = false;
  const zip = new Zip((error, data, final) => {
    if (error) {
      failure = error;
      return;
    }
    bytes += data.byteLength;
    if (bytes > zipBudget) {
      failure = new ZipFailure('budget');
      return;
    }
    parts.push(data as Uint8Array<ArrayBuffer>);
    finished = final;
  });
  const inspect = () => {
    check();
    if (failure) throw failure;
  };
  try {
    for (const { name, blob } of entries) {
      inspect();
      const file = new ZipPassThrough(name);
      zip.add(file);
      for (let offset = 0; offset < blob.size; offset += zipChunkSize) {
        inspect();
        const chunk = new Uint8Array(
          await blob.slice(offset, offset + zipChunkSize).arrayBuffer(),
        );
        inspect();
        file.push(chunk, offset + chunk.length === blob.size);
      }
      if (!blob.size) file.push(new Uint8Array(), true);
      inspect();
    }
    zip.end();
    inspect();
    if (!finished) throw new ZipFailure('failed');
    return new Blob(parts, { type: 'application/zip' });
  } finally {
    zip.terminate();
    parts.length = 0;
  }
}
