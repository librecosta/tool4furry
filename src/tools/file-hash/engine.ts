// Worker-only implementation. UI and the Registry import only the pure core module.
import { createMD5, createSHA1, createSHA256, createSHA512, createCRC32, type IHasher } from 'hash-wasm';
import { HashError, type HashAlgorithm } from './core';
export const hashChunkBytes = 2 * 1024 ** 2;
const factories = { md5: createMD5, sha1: createSHA1, sha256: createSHA256, sha512: createSHA512, crc32: createCRC32 };
type Options = { signal?: AbortSignal; onProgress?: (loaded: number, total: number) => void };
const check = (signal?: AbortSignal) => { if (signal?.aborted) throw new DOMException('Aborted', 'AbortError'); };
/** One serial worker keeps only its current algorithm instance, reset between files. */
export function createHashEngine() {
  let current: HashAlgorithm | undefined, hasher: IHasher | undefined;
  return async (file: Blob, algorithm: HashAlgorithm, { signal, onProgress }: Options = {}) => {
    check(signal);
    if (typeof WebAssembly === 'undefined') throw new HashError('unsupported');
    if (!Number.isSafeInteger(file.size) || file.size < 0) throw new HashError('read');
    if (!hasher || current !== algorithm) {
      try { hasher = await factories[algorithm](); current = algorithm; }
      catch { hasher = undefined; throw new HashError('initialization'); }
    }
    check(signal); hasher.init(); onProgress?.(0, file.size);
    for (let offset = 0; offset < file.size; offset += hashChunkBytes) {
      check(signal);
      const end = Math.min(file.size, offset + hashChunkBytes);
      let block: ArrayBuffer;
      try { block = await file.slice(offset, end).arrayBuffer(); }
      catch { throw new HashError('read'); }
      check(signal);
      if (block.byteLength !== end - offset) throw new HashError('read');
      try { hasher.update(new Uint8Array(block)); }
      catch { throw new HashError('resource'); }
      onProgress?.(end, file.size);
      await new Promise<void>(resolve => setTimeout(resolve, 0));
    }
    check(signal);
    let digest: string;
    try { digest = hasher.digest('hex'); }
    catch { throw new HashError('resource'); }
    onProgress?.(file.size, file.size); return digest;
  };
}
