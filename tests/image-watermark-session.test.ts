import { beforeEach, expect, it, vi } from 'vitest';
import { WatermarkSession } from '../src/tools/image-watermark/session';
import { defaults, renderWatermark } from '../src/tools/image-watermark/render';
import { acceptImage, decodeChecked, toBlob } from '../src/tools/image/browser-codec';
import { mobileImageLimits } from '../src/tools/image/limits';
import { packZip } from '../src/tools/image-converter/zip';
vi.mock('../src/tools/image/browser-codec', () => ({acceptImage:vi.fn(),decodeChecked:vi.fn(),toBlob:vi.fn()}));
vi.mock('../src/tools/image-watermark/render', async original => ({...(await original<typeof import('../src/tools/image-watermark/render')>()),renderWatermark:vi.fn()}));
vi.mock('../src/tools/image-converter/zip', () => ({packZip:vi.fn()}));
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
function deferred<T>() { let resolve!:(value:T)=>void; const promise=new Promise<T>(r=>{resolve=r;}); return {promise,resolve}; }
const file=(name='a.png')=>new File(['source'],name,{type:'image/png'});
beforeEach(()=>{
  vi.mocked(acceptImage).mockImplementation(async f=>{if(f.name==='bad.png')throw Error('corrupt');return {file:f,blob:f,info:{format:'png',width:600,height:400,orientation:1},width:600,height:400};});
  vi.mocked(decodeChecked).mockImplementation(async()=>({width:600,height:400,close:vi.fn()}) as unknown as ImageBitmap);
  vi.mocked(toBlob).mockResolvedValue(new Blob(['thumb'],{type:'image/png'}));
  vi.mocked(renderWatermark).mockResolvedValue(new Blob(['output'],{type:'image/png'}));
  vi.mocked(packZip).mockResolvedValue(new Blob(['zip']));
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({drawImage:vi.fn()} as never);
  vi.stubGlobal('URL',Object.assign(URL,{createObjectURL:vi.fn(()=>`blob:${Math.random()}`),revokeObjectURL:vi.fn()}));
});
async function loaded(names=['a.png','b.png']) {const session=new WatermarkSession(mobileImageLimits);session.add(names.map(n=>file(n)));await tick();await tick();return session;}
it('imports valid files after an invalid file, owns stable IDs and bounded previews, and selects a neighbour on deletion',async()=>{
  const session=await loaded(['bad.png','a.png','b.png']);
  expect(session.snapshot.tasks.map(t=>t.status)).toEqual(['error','idle','idle']);
  expect(session.snapshot.preview?.width).toBe(600);
  const id=session.snapshot.selected!;session.remove(id);await tick();
  expect(session.snapshot.selected).not.toBe(id);
  session.dispose();await tick();
  expect(session.resources.urlsCreated).toBe(session.resources.urlsRevoked);
  expect(session.resources.canvasesCreated).toBe(session.resources.canvasesReleased);
});
it('invalidates all current results when settings change, rejects illegal values and never revives a late export',async()=>{
  const session=await loaded(['a.png']),waiting=deferred<Blob>();
  vi.mocked(renderWatermark).mockReturnValueOnce(waiting.promise); session.start();await tick();
  session.update({...defaults,opacity:20}); waiting.resolve(new Blob(['old']));await tick();
  expect(session.snapshot.tasks[0]).toMatchObject({status:'stale',result:undefined});
  expect(session.update({...defaults,opacity:-1})).toBe(false);expect(session.snapshot.settings.opacity).toBe(20);
  session.start();await tick();expect(session.snapshot.tasks[0].status).toBe('ready');
  session.update({...session.snapshot.settings,position:0});expect(session.snapshot.tasks[0].result).toBeUndefined();session.dispose();
});
it('serializes native work, lets a failure continue, and keeps the lane until cancellation actually settles',async()=>{
  const session=await loaded(),waiting=deferred<Blob>();
  vi.mocked(renderWatermark).mockReturnValueOnce(waiting.promise);session.start();await tick();session.cancel();session.start();await tick();
  expect(renderWatermark).toHaveBeenCalledTimes(1);waiting.resolve(new Blob(['old']));await tick();
  expect(renderWatermark).toHaveBeenCalledTimes(3);expect(session.jobs.maxActive).toBe(1);
  vi.mocked(renderWatermark).mockRejectedValueOnce(Error('encode'));session.start();await tick();
  expect(session.snapshot.tasks.map(t=>t.status)).toEqual(['error','ready']);session.dispose();
});
it('rejects input and accumulated result limits explicitly without silently resizing',async()=>{
  const session=new WatermarkSession({...mobileImageLimits,files:1,totalBytes:7});session.add([file(),file('b.png')]);await tick();await tick();
  expect(session.snapshot.tasks).toHaveLength(1);expect(session.snapshot.error).toBe('budget');
  vi.mocked(renderWatermark).mockResolvedValueOnce(new Blob(['result-too-large']));session.start();await tick();
  expect(session.snapshot.tasks[0]).toMatchObject({status:'error',error:'budget',result:undefined});session.dispose();
});
it('invalidates a ZIP snapshot on edits, preserves valid successes after other failures and uses collision-safe names',async()=>{
  const session=await loaded(['same.png','same.png']);session.start();await tick();
  expect(session.filename(session.snapshot.tasks[0])).not.toBe(session.filename(session.snapshot.tasks[1]));
  const waiting=deferred<Blob>();vi.mocked(packZip).mockReturnValueOnce(waiting.promise);
  const save=vi.spyOn(session,'download').mockImplementation(()=>{}),archive=session.zip();
  session.update({...defaults,opacity:10});waiting.resolve(new Blob(['oldzip']));await expect(archive).rejects.toThrow('changed');expect(save).not.toHaveBeenCalled();
  session.dispose();
});
it('discards a deleted source, a replaced watermark and all late work after unmount',async()=>{
  const session=await loaded(['a.png']),waiting=deferred<Awaited<ReturnType<typeof acceptImage>>>();
  vi.mocked(acceptImage).mockReturnValueOnce(waiting.promise);session.setWatermark(file('mark.png'));session.removeWatermark();session.clear();session.dispose();
  waiting.resolve({file:file('mark.png'),blob:new Blob(['mark']),info:{format:'png',width:600,height:400,orientation:1},width:600,height:400});await tick();
  expect(session.snapshot.watermark).toBeUndefined();expect(session.snapshot.tasks).toHaveLength(0);
  expect(session.resources.canvasesCreated).toBe(session.resources.canvasesReleased);
});
