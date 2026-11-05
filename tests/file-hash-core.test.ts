// @vitest-environment node
import { createHash } from 'node:crypto';
import { crc32 } from 'node:zlib';
import { afterEach, expect, it, vi } from 'vitest';
import { algorithms, comparison, checksumText, createChecksumNamer, type HashAlgorithm } from '../src/tools/file-hash/core';
import { createHashEngine, hashChunkBytes } from '../src/tools/file-hash/engine';
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const inputs = [Buffer.alloc(0), Buffer.from('abc'), Buffer.from('文件校验 🐾\n'), Buffer.from([0,255,128,13,10,1])];
it.each(Object.keys(algorithms) as HashAlgorithm[])('matches independent %s vectors, resetting the reused state for each file', async algorithm => {
  const hash = createHashEngine();
  for (const bytes of inputs) {
    const expected = algorithm === 'crc32' ? crc32(bytes).toString(16).padStart(8,'0') : createHash(algorithm).update(bytes).digest('hex');
    const progress: number[] = [];
    expect(await hash(new Blob([bytes]), algorithm, {onProgress: loaded => progress.push(loaded)})).toBe(expected);
    expect(progress.at(-1)).toBe(bytes.length);
  }
  if (algorithm === 'crc32') expect(await hash(new Blob(['123456789']), algorithm)).toBe('cbf43926');
  if (algorithm === 'md5') expect(await hash(new Blob(['abc']), algorithm)).toBe('900150983cd24fb0d6963f7d28e17f72');
});
it.each(Object.keys(algorithms) as HashAlgorithm[])('matches independent %s across multiple incremental updates', async algorithm => {
  const bytes=Buffer.alloc(hashChunkBytes+31);
  for(let i=0;i<bytes.length;i++) bytes[i]=i%251;
  const expected=algorithm==='crc32'?crc32(bytes).toString(16).padStart(8,'0'):createHash(algorithm).update(bytes).digest('hex');
  const progress:number[]=[];
  expect(await createHashEngine()(new Blob([bytes]),algorithm,{onProgress:loaded=>progress.push(loaded)})).toBe(expected);
  expect(progress).toContain(hashChunkBytes);expect(progress.at(-1)).toBe(bytes.length);
});
it.each([hashChunkBytes-1, hashChunkBytes, hashChunkBytes+1, hashChunkBytes*2+13, 33*1024**2+17])('reads %i bytes only through bounded slices, with correct boundaries and SHA-256', async length => {
  const bytes=Buffer.alloc(length,0xa7), file=new Blob([bytes]), ranges:number[][]=[];
  const slice=file.slice.bind(file);
  vi.spyOn(file,'arrayBuffer').mockRejectedValue(new Error('Whole-file reads are forbidden'));
  vi.spyOn(file,'slice').mockImplementation((start=0,end=length) => {ranges.push([start,end]);return slice(start,end);});
  const progress:number[]=[];
  expect(await createHashEngine()(file,'sha256',{onProgress: loaded=>progress.push(loaded)})).toBe(createHash('sha256').update(bytes).digest('hex'));
  expect(file.arrayBuffer).not.toHaveBeenCalled(); expect(ranges[0][0]).toBe(0);expect(ranges.at(-1)![1]).toBe(length);
  expect(ranges.every(([start,end],i)=>end-start<=hashChunkBytes&&start===(i?ranges[i-1][1]:0))).toBe(true);
  expect(progress.at(-1)).toBe(length);expect(progress).toEqual([...progress].sort((a,b)=>a-b));
});
it('reports read and partial-read failures, aborts between chunks, and can reuse the engine after failures', async () => {
  const hash=createHashEngine(), file=new Blob([new Uint8Array(hashChunkBytes+1)]), abort=new AbortController();
  await expect(hash(file,'md5',{signal:abort.signal,onProgress:loaded=>{if(loaded)abort.abort();}})).rejects.toMatchObject({name:'AbortError'});
  expect(await hash(new Blob(['abc']),'md5')).toBe('900150983cd24fb0d6963f7d28e17f72');
  const broken=new Blob(['abc']), unreadable=new Blob(['abc']);vi.spyOn(unreadable,'arrayBuffer').mockRejectedValue(Error('read'));vi.spyOn(broken,'slice').mockReturnValue(unreadable);
  await expect(hash(broken,'md5')).rejects.toMatchObject({code:'read'});
  vi.spyOn(broken,'slice').mockReturnValue(new Blob(['a']));await expect(hash(broken,'md5')).rejects.toMatchObject({code:'read'});
});
it('reports unavailable WASM and failed initialization instead of substituting a digest', async () => {
  const wasm=globalThis.WebAssembly;vi.stubGlobal('WebAssembly',undefined);
  await expect(createHashEngine()(new Blob(),'md5')).rejects.toMatchObject({code:'unsupported'});
  vi.stubGlobal('WebAssembly',wasm);vi.spyOn(WebAssembly,'instantiate').mockRejectedValue(new Error('unavailable'));
  await expect(createHashEngine()(new Blob(),'md5')).rejects.toMatchObject({code:'initialization'});
});
it.each(Object.keys(algorithms) as HashAlgorithm[])('compares only complete valid %s values, ignoring case and surrounding whitespace', algorithm=>{
  const actual='a'.repeat(algorithms[algorithm].length);
  expect(comparison(actual,'',algorithm)).toBe('empty');expect(comparison(actual,'aa',algorithm)).toBe('incomplete');
  expect(comparison(actual,'z',algorithm)).toBe('invalid');expect(comparison(actual,actual+'a',algorithm)).toBe('invalid');
  expect(comparison(undefined,actual,algorithm)).toBe('pending');expect(comparison(actual,` ${actual.toUpperCase()}\n`,algorithm)).toBe('match');
  expect(comparison(actual,'b'.repeat(actual.length),algorithm)).toBe('mismatch');
});
it('exports complete digests in order and safely quotes filenames containing controls, quotes and backslashes',()=>{
  const names=['中文🐾.txt','line\nbreak\r\t"\\\0\u2028.txt'];
  const text=checksumText('md5',names.map((name,i)=>({name,digest:String(i).repeat(32)})));
  expect(text.split('\n')).toHaveLength(4);expect(text).toContain('0'.repeat(32)+'  中文🐾.txt');
  const encoded=text.split('\n')[2].slice(34);expect(JSON.parse(encoded)).toBe(names[1]);expect(text).not.toContain('\u2028');
  const name=createChecksumNamer(), now=new Date(2026,10,5,20,47,12,123);
  expect(name('md5',now)).toBe('checksums-md5-20261105-204712-123.txt');
  expect(name('md5',now)).toBe('checksums-md5-20261105-204712-123-2.txt');expect(name('sha512',now)).toContain('checksums-sha512-');
});
