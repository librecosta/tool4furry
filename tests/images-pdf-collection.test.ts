// @vitest-environment node
import {readFileSync} from 'node:fs';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {ImagesPdfCollection} from '../src/tools/images-to-pdf/collection';
const bitmap = vi.fn(), closed = vi.fn(), createUrl = vi.fn(), revokeUrl = vi.fn();
let id = 0;
beforeEach(()=>{
  vi.clearAllMocks(); id=0;
  vi.stubGlobal('createImageBitmap',bitmap.mockImplementation(async (_blob:Blob,options:ImageBitmapOptions)=>({width:options.resizeWidth??80,height:options.resizeHeight??48,close:closed})));
  vi.stubGlobal('URL',class extends URL {static createObjectURL=createUrl.mockImplementation(()=>`blob:${++id}`);static revokeObjectURL=revokeUrl;});
  vi.stubGlobal('document',{createElement:()=>({width:0,height:0,getContext:()=>({drawImage:vi.fn()}),toBlob:(cb:BlobCallback)=>cb(new Blob(['png'],{type:'image/png'}))})});
});
afterEach(()=>vi.unstubAllGlobals());
const file=(name='transparent.png')=>new File([readFileSync(`tests/fixtures/images/${name}`)],name);
async function ready(c:ImagesPdfCollection){await vi.waitFor(()=>expect(c.snapshot().pages.every(p=>p.status!=='checking')).toBe(true));}
it('inspects without decoding, appends stably, moves/removes only the target and renders only visible thumbnails',async()=>{
  const c=new ImagesPdfCollection(); c.add(Array.from({length:60},()=>file())); await ready(c);
  expect(c.snapshot().pages).toHaveLength(60); expect(bitmap).not.toHaveBeenCalled();
  const ids=c.snapshot().pages.map(p=>p.id); c.move(ids[0],59);
  expect(c.snapshot().pages.at(-1)?.id).toBe(ids[0]);
  c.setVisible([ids[1],ids[2]]); await vi.waitFor(()=>expect(createUrl).toHaveBeenCalledTimes(2));
  expect(bitmap).toHaveBeenCalledTimes(2); expect(bitmap.mock.calls[0][1]).toMatchObject({resizeWidth:80,resizeHeight:48});
  c.remove(ids[1]); expect(c.snapshot().pages.some(p=>p.id===ids[1])).toBe(false); expect(revokeUrl).toHaveBeenCalledTimes(1);
  c.clear(); expect(revokeUrl).toHaveBeenCalledTimes(2); expect(closed).toHaveBeenCalledTimes(2);
  expect(c.resources.canvasesCreated).toBe(c.resources.canvasesReleased); c.dispose();
});
it('bounds thumbnail cache, closes originals on preview, and cancels late preview ownership',async()=>{
  const c=new ImagesPdfCollection(); c.add(Array.from({length:55},()=>file())); await ready(c);
  const ids=c.snapshot().pages.map(p=>p.id);
  for(const page of ids){c.setVisible([page]); await vi.waitFor(()=>expect(c.snapshot().pages.find(p=>p.id===page)?.url).toBeTruthy());}
  expect(c.snapshot().pages.filter(p=>p.url)).toHaveLength(48); expect(revokeUrl).toHaveBeenCalledTimes(7);
  c.openPreview(ids[1]); await vi.waitFor(()=>expect(c.snapshot().preview?.url).toBeTruthy());
  c.closePreview(); expect(c.snapshot().preview).toBeUndefined();
  let finish!:(value:unknown)=>void;
  bitmap.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
  c.openPreview(ids[2]); await vi.waitFor(()=>expect(finish).toBeTypeOf('function')); c.closePreview();
  finish({width:80,height:48,close:closed}); await new Promise(r=>setTimeout(r,0));
  expect(c.snapshot().preview).toBeUndefined(); c.dispose();
  expect(createUrl.mock.calls.length).toBe(revokeUrl.mock.calls.length);
});
it('isolates bad input, retains original files, and keeps the native lane until an aborted operation actually settles',async()=>{
  const c=new ImagesPdfCollection(); c.add([file(),file('truncated.png')]); await ready(c);
  expect(c.snapshot().pages.map(p=>p.status)).toEqual(['ready','error']);
  let finish!:()=>void, next=false; const signal=new AbortController();
  const first=c.exclusive('first',signal.signal,()=>new Promise<void>(resolve=>{finish=resolve;}));
  const rejected=expect(first).rejects.toThrow('Cancelled');
  signal.abort(); const second=c.exclusive('second',new AbortController().signal,async()=>{next=true;});
  await new Promise(r=>setTimeout(r,5)); expect(next).toBe(false);
  finish(); await rejected; await second; expect(next).toBe(true);
  expect(c.snapshot().pages).toHaveLength(2); c.dispose();
});
