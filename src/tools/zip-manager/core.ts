import { Zip, ZipPassThrough, Unzip, UnzipInflate } from 'fflate';
import { fail, MiB, safeName } from '../general/bounds';
const MAX = 128 * MiB,
  COUNT = 500;
const check = (signal?: AbortSignal) => {
  if (signal?.aborted) throw new Error('Cancelled');
};
export function safePath(path: string) {
  if (path.length > 512 || path.startsWith('/') || path.includes('\\'))
    fail('归档路径不安全。', 'Unsafe archive path.');
  const parts = path.replace(/\/$/, '').split('/');
  if (!parts.length || parts.some((p) => !safeName(p)))
    fail('归档路径不安全。', 'Unsafe archive path.');
  return path;
}
export type Entry = {
  name: string;
  blob: Blob;
};
export async function createZip(entries: Entry[], signal?: AbortSignal) {
  if (
    !entries.length ||
    entries.length > COUNT ||
    entries.reduce((n, e) => n + e.blob.size, 0) > 96 * MiB
  )
    fail(
      'ZIP 最多 500 项、96 MiB 输入。',
      'ZIP supports at most 500 entries and 96 MiB of input.',
    );
  const names = new Set<string>();
  for (const e of entries) {
    safePath(e.name);
    const k = e.name.toLowerCase();
    if (names.has(k)) fail('归档内存在重复路径。', 'Duplicate archive paths.');
    names.add(k);
  }
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let total = 0,
    problem: unknown,
    complete = false;
  const zip = new Zip((err, data, final) => {
    if (err) {
      problem = err;
      return;
    }
    total += data.length;
    if (total > MAX) {
      problem = new Error('size');
      return;
    }
    chunks.push(data.slice() as Uint8Array<ArrayBuffer>);
    complete = final;
  });
  try {
    for (const entry of entries) {
      check(signal);
      const item = new ZipPassThrough(entry.name);
      zip.add(item);
      for (let at = 0; at < entry.blob.size; at += 256 * 1024) {
        check(signal);
        item.push(
          new Uint8Array(
            await entry.blob.slice(at, at + 256 * 1024).arrayBuffer(),
          ),
          false,
        );
        if (problem) throw problem;
        await new Promise((r) => setTimeout(r, 0));
      }
      item.push(new Uint8Array(), true);
    }
    zip.end();
    if (problem || !complete) throw problem ?? new Error();
    check(signal);
    return new Blob(chunks, { type: 'application/zip' });
  } finally {
    zip.terminate();
  }
}
export type ZipItem = {
  name: string;
  size: number;
  compressed: number;
  crc: number;
  offset: number;
  method: number;
};
const decoder = new TextDecoder('utf-8', { fatal: true });
function bad(): never {
  return fail(
    'ZIP 损坏、加密、不安全或超过解压限制。',
    'ZIP is damaged, encrypted, unsafe or exceeds extraction limits.',
  );
}
export async function inspectZip(blob: Blob, signal?: AbortSignal): Promise<ZipItem[]> {
  check(signal);
  if (blob.size < 22 || blob.size > 64 * MiB) bad();
  const bytes = new Uint8Array(await blob.arrayBuffer()),
    d = new DataView(bytes.buffer);
  check(signal);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--)
    if (
      d.getUint32(i, true) === 0x06054b50 &&
      i + 22 + d.getUint16(i + 20, true) === bytes.length
    ) {
      end = i;
      break;
    }
  if (
    end < 0 ||
    d.getUint16(end + 4, true) ||
    d.getUint16(end + 6, true) ||
    d.getUint16(end + 8, true) !== d.getUint16(end + 10, true)
  )
    bad();
  const count = d.getUint16(end + 10, true),
    length = d.getUint32(end + 12, true),
    start = d.getUint32(end + 16, true);
  if (count > COUNT || start + length !== end) bad();
  const result: ZipItem[] = [],
    names = new Set<string>();
  let at = start,
    total = 0;
  try {
    for (let n = 0; n < count; n++) {
      if (at + 46 > end || d.getUint32(at, true) !== 0x02014b50) bad();
      const flags = d.getUint16(at + 8, true),
        method = d.getUint16(at + 10, true),
        crc = d.getUint32(at + 16, true),
        compressed = d.getUint32(at + 20, true),
        size = d.getUint32(at + 24, true),
        nl = d.getUint16(at + 28, true),
        el = d.getUint16(at + 30, true),
        cl = d.getUint16(at + 32, true),
        offset = d.getUint32(at + 42, true);
      if (
        flags & 1 ||
        flags & 0x40 ||
        ![0, 8].includes(method) ||
        d.getUint16(at + 34, true) ||
        ((d.getUint32(at + 38, true) >>> 16) & 0xf000) === 0xa000 ||
        at + 46 + nl + el + cl > end
      )
        bad();
      const raw = bytes.subarray(at + 46, at + 46 + nl);
      if (!(flags & 0x800) && raw.some((v) => v > 127)) bad();
      const name = safePath(decoder.decode(raw)),
        key = name.toLowerCase();
      if (names.has(key)) bad();
      names.add(key);
      total += size;
      if (
        size > 32 * MiB ||
        total > MAX ||
        (size > 1024 * 1024 && size / Math.max(1, compressed) > 200) ||
        offset + 30 > start ||
        d.getUint32(offset, true) !== 0x04034b50
      )
        bad();
      const localFlags = d.getUint16(offset + 6, true),
        localMethod = d.getUint16(offset + 8, true),
        localName = d.getUint16(offset + 26, true),
        localExtra = d.getUint16(offset + 28, true),
        dataStart = offset + 30 + localName + localExtra;
      if (
        localFlags !== flags ||
        localMethod !== method ||
        dataStart + compressed > start ||
        decoder.decode(bytes.subarray(offset + 30, offset + 30 + localName)) !==
          name
      )
        bad();
      if (
        !(flags & 8) &&
        (d.getUint32(offset + 14, true) !== crc ||
          d.getUint32(offset + 18, true) !== compressed ||
          d.getUint32(offset + 22, true) !== size)
      )
        bad();
      if (name.endsWith('/')) {
        if (size) bad();
      } else result.push({ name, size, compressed, crc, offset, method });
      at += 46 + nl + el + cl;
    }
  } catch {
    bad();
  }
  if (at !== end) bad();
  return result;
}
const crcTable = Uint32Array.from({ length: 256 }, (_, n) => {
  for (let i = 0; i < 8; i++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
export function crc32(bytes: Uint8Array, previous = 0) {
  let crc = previous ^ 0xffffffff;
  for (const b of bytes) crc = crcTable[(crc ^ b) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
export async function extractZip(
  blob: Blob,
  items: ZipItem[],
  selected: string[],
  signal?: AbortSignal,
) {
  const wanted = new Set(selected);
  if (!wanted.size) fail('请选择文件。', 'Select files.');
  const output: Entry[] = [],
    found = new Set<string>();
  let error: unknown,
    total = 0;
  const unzip = new Unzip((file) => {
    const item = items.find((i) => i.name === file.name);
    if (!wanted.has(file.name)) return;
    if (!item || found.has(file.name)) {
      error = new Error();
      return;
    }
    found.add(file.name);
    let size = 0,
      crc = 0;
    const chunks: Uint8Array<ArrayBuffer>[] = [];
    file.ondata = (err, data, final) => {
      if (err) {
        error = err;
        return;
      }
      size += data.length;
      total += data.length;
      if (size > item.size || total > MAX || signal?.aborted) {
        error = new Error();
        file.terminate();
        return;
      }
      crc = crc32(data, crc);
      chunks.push(data.slice() as Uint8Array<ArrayBuffer>);
      if (final) {
        if (size !== item.size || crc !== item.crc) {
          error = new Error();
          return;
        }
        output.push({ name: file.name, blob: new Blob(chunks) });
      }
    };
    file.start();
  });
  unzip.register(UnzipInflate);
  // Small inflater inputs bound expansion before each actual-byte check.
  for (let at = 0; at < blob.size; at += 4096) {
    check(signal);
    unzip.push(
      new Uint8Array(await blob.slice(at, at + 4096).arrayBuffer()),
      at + 4096 >= blob.size,
    );
    if (error) bad();
    if (at % (256 * 1024) === 0) await new Promise((r) => setTimeout(r, 0));
  }
  check(signal);
  if (error || output.length !== wanted.size) bad();
  return selected.map((name) => output.find((e) => e.name === name)!);
}
