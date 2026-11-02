// @vitest-environment node
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import {unzipSync} from 'fflate';
import {ComicSession, archiveEntries} from '../src/tools/comic-page-organizer/session';
import {defaultExportSettings, recommendedQuality, validPagePrefix} from '../src/tools/comic-page-organizer/export-settings';
import {desktopComicBudget} from '../src/tools/comic-page-organizer/limits';
import {inspectComic} from '../src/tools/comic-page-organizer/source';
import {encodeImage} from '../src/tools/image/browser-codec';
import {comicPdf} from '../src/tools/comic-page-organizer/pdf';

vi.mock('../src/tools/comic-page-organizer/source', () => ({inspectComic: vi.fn(), verifyComic: vi.fn(), comicThumbnail: vi.fn()}));
vi.mock('../src/tools/image/browser-codec', () => ({encodeImage: vi.fn()}));
vi.mock('../src/tools/comic-page-organizer/pdf', () => ({pdfBudget: vi.fn(), comicPdf: vi.fn(async () => new Blob(['%PDF-test'], {type:'application/pdf'}))}));
const sessions: ComicSession[] = [];
const create = () => {const session = new ComicSession(desktopComicBudget); sessions.push(session); return session;};
const files = (count = 2) => Array.from({length:count}, (_,i) => new File([`original-${i}`], `${i+1}.png`, {type:'image/png'}));
const ready = async (session: ComicSession, count = 2) => {session.add(files(count)); await vi.waitFor(() => expect(session.snapshot().pages.every(p => p.status === 'ready')).toBe(true));};
beforeEach(() => {
  vi.mocked(inspectComic).mockImplementation(async file => ({file, blob:file, width:10,height:20,info:{format:'png',width:10,height:20,orientation:1}}));
  vi.mocked(encodeImage).mockReset().mockImplementation(async (source, settings) => new Blob([`converted-${source.file.name}`], {type:`image/${settings.format}`}));
});
afterEach(() => {sessions.splice(0).forEach(s => s.dispose()); vi.restoreAllMocks();});

it.each(['', '..','../p','a/b','a\\b','NUL','CON.txt','LPT1','COM¹','a\u0000b','a\u0085b','a\u202eb','name.',' name','a'.repeat(49),'图'.repeat(41),'bad:page'])('rejects unsafe prefix %j', prefix => {expect(validPagePrefix(prefix)).toBe(false);});
it.each(['page','我的漫画','第1卷_草稿 (2)','Book-v1.0'])('accepts a safe Unicode prefix %s', prefix => {expect(validPagePrefix(prefix)).toBe(true);});
it('keeps default bytes, stable numbering, Unicode ZIP names and parameter invalidation', async () => {
  const session=create(); await ready(session); session.configure({prefix:'漫画_第一卷'});
  const result=await session.pack('cbz');
  const zip=unzipSync(new Uint8Array(await result!.blob.arrayBuffer()));
  expect(Object.keys(zip)).toEqual(['漫画_第一卷-001.png','漫画_第一卷-002.png']);
  for(const [i,bytes] of Object.values(zip).entries()) expect(bytes).toEqual(new Uint8Array(await session.snapshot().pages[i].file.arrayBuffer()));
  expect(encodeImage).not.toHaveBeenCalled();
  session.configure({prefix:'../bad'}); expect(result!.current()).toBe(false);
  expect(await session.pack('zip')).toBeUndefined(); expect(session.snapshot().archiveError).toBe('invalidSettings');
  expect(()=>archiveEntries(session.snapshot().pages,'CON')).toThrow();
});
it.each(['jpeg','png','webp','avif'] as const)('lazily converts every %s page in order with selected quality and background', async format => {
  vi.stubGlobal('Worker',class {});
  const session=create(); await ready(session,30); session.move(session.snapshot().pages[29].id,0);
  session.configure({format, prefix:'选集', qualities:{...defaultExportSettings.qualities,[format]:61}, jpegBackground:'#123456'});
  const result=await session.pack('zip'), zip=unzipSync(new Uint8Array(await result!.blob.arrayBuffer()));
  expect(Object.keys(zip)[0]).toBe(`选集-001.${format === 'jpeg'?'jpg':format}`);
  expect(new TextDecoder().decode(Object.values(zip)[0])).toBe('converted-30.png');
  expect(encodeImage).toHaveBeenCalledTimes(30);
  expect(vi.mocked(encodeImage).mock.calls[0][1]).toMatchObject({format,quality:format==='png'?null:61,jpegBackground:'#123456'});
  expect(vi.mocked(encodeImage).mock.calls[0][4]?.signal).toBeInstanceOf(AbortSignal);
  expect(session.jobs.maxActive).toBe(1);
});
it('does not encode the next page until the current page has drained to disk', async () => {
  const session=create(); await ready(session); session.configure({format:'webp'});
  let release!:()=>void; const gate=new Promise<void>(r=>{release=r;}), abort=vi.fn(async()=>{release();}), close=vi.fn();
  const task=session.pack('zip',Promise.resolve({async createWritable(){return {async write(){await gate;},close,abort};}}));
  await vi.waitFor(()=>expect(encodeImage).toHaveBeenCalledTimes(1));
  session.configure({qualities:{...defaultExportSettings.qualities,webp:45}}); await task;
  expect(encodeImage).toHaveBeenCalledTimes(1); expect(close).not.toHaveBeenCalled(); expect(abort).toHaveBeenCalledOnce();
  expect(session.snapshot().exported).toBeUndefined();
});
it('holds the native lane after cancellation and rejects late converted output', async () => {
  const session=create(); await ready(session); session.configure({format:'jpeg'});
  let release!:(b:Blob)=>void; vi.mocked(encodeImage).mockImplementationOnce(()=>new Promise(r=>{release=r;}));
  const task=session.pack('zip'); await vi.waitFor(()=>expect(encodeImage).toHaveBeenCalledOnce());
  const signal=vi.mocked(encodeImage).mock.calls[0][4]!.signal!;
  session.configure({prefix:'new'}); expect(signal.aborted).toBe(true); expect(session.snapshot().packing).toBe(true);
  expect(await session.pack('zip')).toBeUndefined();
  release(new Blob(['late'])); expect(await task).toBeUndefined(); expect(session.snapshot().packing).toBe(false);
});
it('disables AVIF for unsupported devices and oversized pages without falling back', async () => {
  const session=create(); await ready(session); session.configure({format:'avif'});
  expect(session.avifIssue()).toBe('avifDevice'); expect(await session.pack('zip')).toBeUndefined();
  vi.stubGlobal('Worker',class {}); vi.mocked(inspectComic).mockImplementationOnce(async file=>({file,blob:file,width:5000,height:2000,info:{format:'png',width:5000,height:2000,orientation:1}}));
  session.add([new File(['large'],'large.png',{type:'image/png'})]); await vi.waitFor(()=>expect(session.snapshot().pages[2].status).toBe('ready'));
  expect(session.avifIssue()).toBe('avifBudget'); expect(await session.pack('zip')).toBeUndefined(); expect(encodeImage).not.toHaveBeenCalled();
});
it('keeps PDF independent from invalid ZIP settings and subsequent archive edits', async () => {
  const session=create(); await ready(session); session.configure({prefix:'../bad',format:'jpeg',jpegBackground:'invalid'});
  const pdf=await session.pack('pdf'); expect(pdf?.blob.type).toBe('application/pdf'); expect(comicPdf).toHaveBeenCalled();
  session.configure({prefix:'new'}); expect(pdf!.current()).toBe(true); expect(session.snapshot().exported).toBe('pdf');
  expect(encodeImage).not.toHaveBeenCalled();
});
it('uses the existing format-specific recommendations without losing per-format quality drafts', () => {
  expect(recommendedQuality('jpeg')).toBe(88); expect(recommendedQuality('webp')).toBe(85); expect(recommendedQuality('avif')).toBe(55);
  const session=create(); session.configure({format:'jpeg',qualities:{...defaultExportSettings.qualities,jpeg:34}});
  session.configure({format:'webp'}); session.configure({format:'jpeg'}); expect(session.snapshot().settings.qualities.jpeg).toBe(34);
});
