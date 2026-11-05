// @vitest-environment node
import { expect, it } from 'vitest';
import { unzipSync } from 'fflate';
import { renamePlan, RenamePlanError, defaultRules, type Rules } from '../src/tools/batch-file-renamer/core';
import { packZip } from '../src/tools/image-converter/zip';

const names = (input: string[], patch: Partial<Rules> = {}) => renamePlan(input, {...defaultRules, ...patch}).map(item => item.name);

it.each([
  ['', true, '001.png'], ['作品', true, '作品-001.png'],
  ['作品', false, '作品.png'], ['', false, '原图.png'],
] as const)('composes name %s with sequence %s without an orphan separator', (name, sequence, output) => {
  expect(names(['原图.png'], {name, sequence})).toEqual([output]);
});

it.each(['-', '_', ' ', ''] as const)('uses separator %j only between an actual name and number', separator => {
  expect(names(['image.jpg'], {name:'作品', separator})).toEqual([`作品${separator}001.jpg`]);
  expect(names(['image.jpg'], {separator})).toEqual(['001.jpg']);
  expect(names(['image.jpg'], {name:'作品', sequence:false, separator})).toEqual(['作品.jpg']);
});

it('preserves the final extension, its case, Unicode and unchanged original names', () => {
  const input = ['README', 'archive.part.PDF', '原图.jpg', '.gitignore', 'emoji-🐾.png'];
  expect(names(input)).toEqual(['001', '002.PDF', '003.jpg', '004', '005.png']);
  expect(names(input, {sequence:false})).toEqual(input);
  expect(names(['a.png', 'b.jpg'], {name:'作品', sequence:false})).toEqual(['作品.png','作品.jpg']);
});

it('pads from the chosen start without truncating larger integers and validates only active numbering', () => {
  expect(names(['a', 'b'], {start:'9', digits:'1'})).toEqual(['9','10']);
  expect(names(['a', 'b'], {start:'7', digits:'4'})).toEqual(['0007','0008']);
  expect(names(['a'], {start:'0'})).toEqual(['000']);
  expect(names(['a'], {start:String(Number.MAX_SAFE_INTEGER)})).toEqual([String(Number.MAX_SAFE_INTEGER)]);
  for (const patch of [{start:'-1'}, {start:'1.5'}, {start:'x'}, {start:String(Number.MAX_SAFE_INTEGER + 1)}, {digits:'0'}, {digits:'9'}])
    expect(() => names(['a'], patch)).toThrow();
  expect(() => names(['a','b'], {start:String(Number.MAX_SAFE_INTEGER)})).toThrow('safe integer');
  expect(names(['original.txt'], {sequence:false, start:'', digits:''})).toEqual(['original.txt']);
});

it('rejects unsafe, Windows-reserved and excessive UTF-8 output names without rewriting input', () => {
  for (const name of ['../escape', '/absolute', 'C:\\escape', 'bad?', 'bad\u0000', 'CON', 'lpt1', '   ', '.'])
    expect(() => names(['a.txt'], {name, sequence:false})).toThrow('invalid characters');
  expect(() => names(['a.txt'], {name:'中'.repeat(60), sequence:false})).toThrow('too long');
  expect(() => names(['a.txt'], {name:'a'.repeat(161), sequence:false})).toThrow();
  expect(() => names(['../unsafe.txt'], {sequence:false})).toThrow();
  expect(() => names(['bad.'], {sequence:false})).toThrow();
  expect(() => names(['a.txt'], {separator:'/' as Rules['separator']})).toThrow();
});

it('retains all proposed names and marks every case-insensitive collision, including the first file', () => {
  try {
    names(['one.PNG','two.png','notes.txt'], {name:'作品', sequence:false});
    expect.fail('The conflicting export must be rejected');
  } catch (error) {
    expect(error).toBeInstanceOf(RenamePlanError);
    const rejected = error as RenamePlanError;
    expect(rejected.en).toContain('Enable numbering');
    expect(rejected.plan.map(item => [item.name,item.issue])).toEqual([
      ['作品.PNG','duplicate'], ['作品.png','duplicate'], ['作品.txt',undefined],
    ]);
  }
  expect(() => names(['same.txt','SAME.TXT'], {sequence:false})).toThrow('Duplicate');
  expect(names(['same.txt','same.txt'])).toEqual(['001.txt','002.txt']);
});

it.each([
  {name:'', sequence:true}, {name:'作品', sequence:true},
  {name:'作品', sequence:false}, {name:'', sequence:false},
])('packages the exact live plan and original Unicode/binary File bytes: %j', async patch => {
  const files = [new File(['中文内容\nUTF-8'], 'readme.v2.txt'), new File([new Uint8Array([0,255,1,128])], '图片.bin')];
  const plan = renamePlan(files.map(file => file.name), {...defaultRules, ...patch, start:'8', digits:'2', separator:'_'});
  const zip = await packZip(files.map((blob, i) => ({name:plan[i].name, blob})), new AbortController().signal);
  expect(zip.type).toBe('application/zip');
  const extracted = unzipSync(new Uint8Array(await zip.arrayBuffer()));
  expect(Object.keys(extracted)).toEqual(plan.map(item => item.name));
  for (let i = 0; i < files.length; i++) expect(extracted[plan[i].name]).toEqual(new Uint8Array(await files[i].arrayBuffer()));
  expect(files.map(file => file.name)).toEqual(['readme.v2.txt','图片.bin']);
});
