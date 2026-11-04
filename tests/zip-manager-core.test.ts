// @vitest-environment node
import { expect, it } from 'vitest';
import { zipSync, unzipSync, strToU8 } from 'fflate';
import { createZip, inspectZip, extractZip, safePath } from '../src/tools/zip-manager/core';
import { checkFiles, filePath, folderStem, zipTree, selectionState, selectPaths } from '../src/tools/zip-manager/tree';
import { createZipDownloadNamer, zipStem } from '../src/tools/zip-manager/download-name';

const file = (path: string, text = path) => Object.defineProperty(new File([text], path.split('/').at(-1)!), 'webkitRelativePath', { value: path.includes('/') ? path : '' });

it('keeps real directory paths, distinguishes duplicate basenames and checks the full intake', () => {
  const files = [file('作品/人物/正面.txt'), file('作品/背景/正面.txt'), file('作品/说明.txt')];
  expect(() => checkFiles(files)).not.toThrow();
  expect(folderStem(files)).toBe('作品');
  expect(folderStem([...files, file('loose.txt')])).toBe('archive');
  const tree = zipTree(files.map(f => ({ name: filePath(f), size: f.size })));
  expect(tree[0].files).toEqual(files.map(filePath));
  expect(tree[0].children?.map(n => n.name)).toEqual(['人物', '背景', '说明.txt']);
  expect(tree[0].size).toBe(files.reduce((sum, f) => sum + f.size, 0));
  expect(() => checkFiles([...files, file('作品/人物/正面.txt')])).toThrow('Duplicate');
  expect(() => checkFiles([file('a.txt'), file('A.txt')])).toThrow('Duplicate');
  for (const path of ['../bad', '/absolute', 'C:/bad', 'a\\b', 'folder/CON']) {
    expect(() => safePath(path)).toThrow();
    expect(() => zipTree([{name: path, size: 1}])).toThrow();
    expect(() => checkFiles([file(path)])).toThrow();
  }
  expect(() => checkFiles(Array.from({length:501}, (_, i) => file(`${i}.txt`)))).toThrow();
});

it('derives whole-folder and mixed selection from one set without changing unrelated paths', () => {
  const paths = ['p/a.txt', 'p/b.txt'], original = new Set(['outside.txt', paths[0]]);
  expect(selectionState(paths, original)).toEqual({checked:false, indeterminate:true});
  const all = selectPaths(original, paths, true);
  expect(selectionState(paths, all)).toEqual({checked:true, indeterminate:false});
  expect([...selectPaths(all, paths, false)]).toEqual(['outside.txt']);
  expect([...original]).toEqual(['outside.txt', paths[0]]);
});

it('creates stored ZIPs and repacks selected deflated entries with exact paths and bytes', async () => {
  const originals = {'project/images/a.bin': new Uint8Array([0,255,42]), 'project/images/b.txt': strToU8('你好\nworld'), 'README.md': strToU8('# Original')};
  const stored = await createZip(Object.entries(originals).map(([name, bytes]) => ({ name, blob:new Blob([bytes as Uint8Array<ArrayBuffer>]) })));
  expect(stored.type).toBe('application/zip');
  expect(unzipSync(new Uint8Array(await stored.arrayBuffer()))).toEqual(originals);
  expect((await inspectZip(stored)).every(item => item.method === 0)).toBe(true);
  const archive = new Blob([zipSync(originals) as Uint8Array<ArrayBuffer>]);
  const items = await inspectZip(archive), wanted = ['project/images/b.txt', 'README.md'];
  const extracted = await extractZip(archive, items, wanted);
  expect(extracted.map(entry => entry.name)).toEqual(wanted);
  const repacked = unzipSync(new Uint8Array(await (await createZip(extracted)).arrayBuffer()));
  expect(Object.keys(repacked)).toEqual(wanted);
  for (const path of wanted) expect(repacked[path]).toEqual(originals[path as keyof typeof originals]);
  const [single] = await extractZip(archive, items, ['project/images/a.bin']);
  expect(new Uint8Array(await single.blob.arrayBuffer())).toEqual(originals['project/images/a.bin']);
});

it('retains invalid-path, CRC, encrypted, bomb, duplicate-path and cancellation protection', async () => {
  await expect(createZip([{name:'same',blob:new Blob(['a'])},{name:'SAME',blob:new Blob(['b'])}])).rejects.toThrow();
  const bytes = zipSync({'data.bin':new Uint8Array([1,2,3,4])},{level:0}), blob = new Blob([bytes as Uint8Array<ArrayBuffer>]);
  const items = await inspectZip(blob), view = new DataView(bytes.buffer);
  const corrupt = bytes.slice(); corrupt[30 + 'data.bin'.length] ^= 1;
  await expect(extractZip(new Blob([corrupt]), items, ['data.bin'])).rejects.toThrow();
  const encrypted = bytes.slice(), central = view.getUint32(bytes.length - 22 + 16, true);
  encrypted[6] |= 1; encrypted[central + 8] |= 1;
  for (const invalid of [new Blob(['bad']), new Blob([encrypted]), new Blob([zipSync({'../bad':strToU8('x')}) as Uint8Array<ArrayBuffer>]), new Blob([zipSync({'bomb':new Uint8Array(2*1024**2)}) as Uint8Array<ArrayBuffer>])]) await expect(inspectZip(invalid)).rejects.toThrow();
  const c = new AbortController(); c.abort();
  await expect(inspectZip(blob, c.signal)).rejects.toThrow('Cancelled');
  await expect(extractZip(blob, items, ['data.bin'], c.signal)).rejects.toThrow('Cancelled');
  const delayed = new Blob([bytes as Uint8Array<ArrayBuffer>]), duringRead = new AbortController();
  const read = delayed.arrayBuffer.bind(delayed);
  delayed.arrayBuffer = async () => {duringRead.abort(); return read();};
  await expect(inspectZip(delayed, duringRead.signal)).rejects.toThrow('Cancelled');
});

it('uses local millisecond ZIP names with short collisions and safe Unicode stems', () => {
  const name = createZipDownloadNamer(), date = new Date(2026,10,4,22,30,45,123);
  expect(name('角色设定合集', false, date)).toBe('角色设定合集-20261104-223045-123.zip');
  expect(name('project.ZIP', true, date)).toBe('project-selected-20261104-223045-123-2.zip');
  expect(name('project', true, date)).toMatch(/-123-3\.zip$/);
  expect(zipStem('notes.v2.zip')).toBe('notes.v2');
  for (const value of ['', '..', 'CON', 'LPT1.txt', 'CON .txt', 'COM¹']) expect(zipStem(value)).toBe('archive');
  expect(zipStem('x<>:"/\\|?*\u0000\u0085\u202e')).not.toMatch(/[<>:"/\\|?*\u0000-\u001f\u007f-\u009f\u202e]/);
  const long = name('🦊中文'.repeat(200), false, date);
  expect(new TextEncoder().encode(long).length).toBeLessThan(220);
  expect(long).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/);
  expect(long.match(/\.zip/g)).toHaveLength(1);
});
