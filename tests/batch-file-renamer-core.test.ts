// @vitest-environment node
import { expect, it } from 'vitest';
import { unzipSync } from 'fflate';
import { renamePlan, defaultRules } from '../src/tools/batch-file-renamer/core';
import { packZip } from '../src/tools/image-converter/zip';

it('packages the same live naming plan without re-encoding Unicode text or binary file bytes', async () => {
  const files = [new File(['中文内容\nUTF-8'], 'readme.v2.txt'), new File([new Uint8Array([0, 255, 1, 128])], '图片.bin')];
  const plan = renamePlan(files.map(file => file.name), {...defaultRules, prefix:'作品-', suffix:'-final', find:'readme', replace:'notes', start:'8', digits:'2'});
  const zip = await packZip(files.map((blob, i) => ({name:plan[i].name, blob})), new AbortController().signal);
  expect(zip.type).toBe('application/zip');
  const extracted = unzipSync(new Uint8Array(await zip.arrayBuffer()));
  expect(Object.keys(extracted)).toEqual(['作品-notes.v2-final-08.txt', '作品-图片-final-09.bin']);
  for (let i = 0; i < files.length; i++) expect(extracted[plan[i].name]).toEqual(new Uint8Array(await files[i].arrayBuffer()));
  expect(files.map(file => file.name)).toEqual(['readme.v2.txt', '图片.bin']);
});
