import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { compile } from 'sass-embedded';
import { definition } from '../src/tools/file-hash/definition';
it('keeps the local hash worker, embedded WASM and notices under the Published File Hash lazy loader',()=>{
  expect(definition.status).toBe('published');
  const ui=readFileSync('src/tools/file-hash/FileHash.tsx','utf8'),queue=readFileSync('src/tools/file-hash/queue.ts','utf8'),worker=readFileSync('src/tools/file-hash/hash.worker.ts','utf8'),engine=readFileSync('src/tools/file-hash/engine.ts','utf8'),core=readFileSync('src/tools/file-hash/core.ts','utf8');
  expect(queue).toContain("new Worker(new URL('./hash.worker.ts', import.meta.url)");expect(worker).toContain("from './engine'");
  expect(engine).toContain("from 'hash-wasm'");expect(core).not.toContain('hash-wasm');expect(ui).not.toContain("from './engine'");
  expect(ui).toContain("from '../../ui/FileTaskList'");expect(ui).toContain('form.fileWorkspace');expect(ui).toContain('form.settingsPanel');
  expect(ui).not.toContain('boundedFiles');expect(engine).not.toMatch(/file\.arrayBuffer\(|crypto\.subtle/);
  expect(ui).toContain('hash-wasm.NOTICE.txt?url');
  expect(readFileSync('astro.config.mjs','utf8')).toMatch(/include:\s*\[[^\]]*'hash-wasm'/);
  const notice=readFileSync('src/tools/file-hash/hash-wasm.NOTICE.txt','utf8'),license=readFileSync('node_modules/hash-wasm/LICENSE','utf8');
  expect(notice.replace(/\r\n/g,'\n')).toContain(license.replace(/\r\n/g,'\n'));
  for(const source of ['md5','sha1','sha256','sha512']){
    const original=readFileSync(`node_modules/hash-wasm/src/${source}.c`,'utf8');expect(notice.replace(/\r\n/g,'\n')).toContain(original.slice(0,original.indexOf('*/')+2).replace(/\r\n/g,'\n'));
  }
  expect(notice).toContain('Stephan Brumme');expect(notice).toContain('The origin of this software must not be misrepresented');
  expect(compile('src/tools/file-hash/hash.module.scss').css).toContain('overflow-wrap: anywhere');
});
