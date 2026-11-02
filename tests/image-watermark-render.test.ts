import { describe, expect, it, vi, beforeEach } from 'vitest';
import { defaults, validSettings, placement, tileGrid, maxTileDraws, drawComposition, renderWatermark } from '../src/tools/image-watermark/render';
import { ImageResources } from '../src/tools/image/resources';
import { desktopImageLimits, mobileImageLimits } from '../src/tools/image/limits';
import { qualifyCanvasAvif } from '../src/tools/image/inspect-avif';
import type { AvifEncoder } from '../src/tools/image/avif-encoder';
vi.mock('../src/tools/image/inspect-avif', () => ({qualifyCanvasAvif: vi.fn(async blob => blob)}));
import { decodeChecked, toBlob, validateOutput } from '../src/tools/image/browser-codec';
import type { ImageSource } from '../src/tools/image/types';
vi.mock('../src/tools/image/browser-codec', () => ({decodeChecked: vi.fn(), toBlob: vi.fn(), validateOutput: vi.fn()}));
const source = {width: 600, height: 400, info: {format: 'png', width: 600, height: 400, orientation: 1}, blob: new Blob(['source']), file: new File(['source'],'source.png')} as ImageSource;
let calls: Array<{alpha: number; args: unknown[]}>;
let ctx: CanvasRenderingContext2D;
beforeEach(() => {
  calls = [];
  ctx = {clearRect: vi.fn(), fillRect: vi.fn(), save: vi.fn(), restore: vi.fn(), scale: vi.fn(), translate: vi.fn(), rotate: vi.fn(), getImageData: vi.fn(() => ({data: new Uint8ClampedArray(600 * 400 * 4)})), globalAlpha: 1,
    drawImage(this: CanvasRenderingContext2D, ...args: unknown[]) { calls.push({alpha: this.globalAlpha, args}); },
    measureText: () => ({width: 100}), fillText: vi.fn()} as unknown as CanvasRenderingContext2D;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as never);
  vi.mocked(decodeChecked).mockImplementation(async blob => ({width: blob === source.blob ? 600 : 100, height: blob === source.blob ? 400 : 50, close: vi.fn()}) as unknown as ImageBitmap);
  vi.mocked(toBlob).mockResolvedValue(new Blob(['valid'],{type:'image/png'}));
  vi.mocked(validateOutput).mockImplementation(async blob => blob);
  Object.defineProperty(document, 'fonts', {configurable: true, value: {load: vi.fn(async () => [{}])}});
});
describe('watermark geometry and settings', () => {
  it.each(Array.from({length:9},(_,i)=>i))('keeps position %i inside the source, with uniform size and margins', position => {
    const box = placement(600,400,120,60,position,20);
    expect(box.width).toBe(120); expect(box.height).toBe(60);
    expect(box.x).toBe([20,240,460][position%3]); expect(box.y).toBe([20,170,320][Math.floor(position/3)]);
  });
  it('fits extreme watermark shapes and oversized margins without stretching or crossing the source', () => {
    const b = placement(3,2,1000,500,8,1000);
    expect(b.x).toBeGreaterThanOrEqual(0); expect(b.y).toBeGreaterThanOrEqual(0);
    expect(b.x+b.width).toBeLessThanOrEqual(3); expect(b.y+b.height).toBeLessThanOrEqual(2);
    expect(b.width/b.height).toBe(2);
  });
  it.each([{opacity:101},{margin:-1},{position:9},{fontSize:0},{quality:1.5},{imagePercent:0},{format:'gif'},{angle:46},{angle:NaN},{density:'infinite'},{layout:'free'},{text:''},{color:'#abc'},{text:'a\nb'}])('rejects invalid settings %j', patch => {
    expect(validSettings({...defaults,...patch} as typeof defaults)).toBe(false);
  });
  it('uses original pixel placement for a bounded preview and opacity applies only to the watermark', () => {
    const image = document.createElement('canvas'), mark = document.createElement('canvas');
    drawComposition(ctx,300,200,600,400,image,{...defaults,kind:'image',position:8,margin:20,imagePercent:20,opacity:50},{image:mark,width:100,height:50});
    expect(ctx.scale).toHaveBeenCalledWith(.5,.5);
    expect(calls[0]).toMatchObject({alpha:1,args:[image,0,0,300,200]});
    expect(calls[1]).toMatchObject({alpha:.5,args:[mark,460,320,120,60]});
  });
});
it.each([-45, 0, 32, 45])('fits the rotated bounding box at all nine anchors (%i°)', angle => {
  for (let position = 0; position < 9; position++) {
    const b = placement(400, 600, 700, 100, position, 24, angle), rad = angle * Math.PI / 180;
    const w = b.width * Math.abs(Math.cos(rad)) + b.height * Math.abs(Math.sin(rad));
    const h = b.width * Math.abs(Math.sin(rad)) + b.height * Math.abs(Math.cos(rad));
    const x = b.x + b.width / 2, y = b.y + b.height / 2;
    expect(x - w / 2).toBeGreaterThanOrEqual(24 - 1e-8); expect(x + w / 2).toBeLessThanOrEqual(376 + 1e-8);
    expect(y - h / 2).toBeGreaterThanOrEqual(24 - 1e-8); expect(y + h / 2).toBeLessThanOrEqual(576 + 1e-8);
  }
});
it.each([[1600,900], [900,1600], [10000,1]])('bounds rotated tile work and extends the grid beyond every edge (%i × %i)', (width, height) => {
  for (const angle of [-45,0,45]) {
    const sparse = tileGrid(width,height,100,30,angle,'sparse'), dense = tileGrid(width,height,100,30,angle,'dense');
    expect(dense.rows * dense.columns).toBeGreaterThanOrEqual(sparse.rows * sparse.columns);
    for (const size of [1,100]) for (const density of ['sparse','standard','dense'] as const) {
      const g = tileGrid(width,height,size,size/2,angle,density), c = Math.abs(Math.cos(g.radians)), s = Math.abs(Math.sin(g.radians));
      expect(g.rows * g.columns).toBeLessThanOrEqual(maxTileDraws);
      expect(g.startX).toBeLessThanOrEqual(-(width*c+height*s)/2); expect(g.startY).toBeLessThanOrEqual(-(width*s+height*c)/2);
    }
  }
});
it('uses the same source-space tile transforms and mark opacity for preview and export', () => {
  const source = document.createElement('canvas'), mark = document.createElement('canvas');
  drawComposition(ctx,300,200,600,400,source,{...defaults,kind:'image',layout:'tile',angle:30,opacity:25},{image:mark,width:100,height:50});
  const grid=tileGrid(600,400,120,60,30,'standard');
  expect(ctx.translate).toHaveBeenCalledWith(300,200); expect(ctx.rotate).toHaveBeenCalledWith(Math.PI/6);
  expect(calls).toHaveLength(1+grid.rows*grid.columns); expect(calls.slice(1).every(call=>call.alpha===.25)).toBe(true);
});
it('encodes actual AVIF RGBA through the existing adapter and releases the canvas before encoding', async () => {
  vi.stubGlobal('Worker', function(){});
  const resources = new ImageResources(), signal = new AbortController().signal;
  const encode = vi.fn(async () => {expect(resources.canvasesReleased).toBe(resources.canvasesCreated); return new ArrayBuffer(4);});
  const blob = await renderWatermark(source,{...defaults,format:'avif',quality:50},undefined,resources,desktopImageLimits,{avif:{encode} as unknown as AvifEncoder,signal});
  expect(encode).toHaveBeenCalledWith(expect.any(ArrayBuffer),600,400,50,false,signal);
  expect(blob.type).toBe('image/avif'); expect(qualifyCanvasAvif).toHaveBeenCalled();
  expect(validateOutput).toHaveBeenCalledWith(blob,'avif',600,400,resources,desktopImageLimits); expect(toBlob).not.toHaveBeenCalled();
});
it('rejects AVIF device, dimension and combined source/logo allocations before decoding', async () => {
  vi.stubGlobal('Worker', function(){});
  const resources=new ImageResources();
  await expect(renderWatermark(source,{...defaults,format:'avif'},undefined,resources,mobileImageLimits)).rejects.toThrow('avifDevice');
  await expect(renderWatermark({...source,width:3000,height:2000},{...defaults,format:'avif'},undefined,resources,desktopImageLimits)).rejects.toThrow('avifBudget');
  await expect(renderWatermark({...source,width:4000,height:4000},{...defaults,kind:'image'},{...source,width:4000,height:4000},resources,mobileImageLimits)).rejects.toThrow('budget');
  expect(decodeChecked).not.toHaveBeenCalled();
});
it('holds native decode until it settles on cancellation and then closes the bitmap without encoding', async () => {
  let finish!:(b:ImageBitmap)=>void;
  vi.mocked(decodeChecked).mockReturnValueOnce(new Promise(resolve=>{finish=resolve;}));
  const controller=new AbortController(), resources=new ImageResources();
  const pending=renderWatermark(source,{...defaults,kind:'image'},source,resources,mobileImageLimits,{avif:{} as AvifEncoder,signal:controller.signal});
  await Promise.resolve(); await Promise.resolve(); controller.abort();
  finish({width:600,height:400,close:vi.fn()} as unknown as ImageBitmap);
  await expect(pending).rejects.toThrow('cancelled'); expect(resources.bitmapsClosed).toBe(1); expect(toBlob).not.toHaveBeenCalled();
});
it('draws source once at its oriented dimensions, encodes exact format/quality and validates the result', async () => {
  const resources = new ImageResources();
  const result=await renderWatermark(source,{...defaults,format:'jpeg',background:'#123456',quality:81},undefined,resources,mobileImageLimits);
  expect(calls).toHaveLength(1); expect(calls[0].args.slice(1)).toEqual([0,0,600,400]);
  expect(ctx.fillRect).toHaveBeenCalledWith(0,0,600,400);
  expect(toBlob).toHaveBeenCalledWith(expect.any(HTMLCanvasElement),'image/jpeg',.81);
  expect(validateOutput).toHaveBeenCalledWith(result,'jpeg',600,400,resources,mobileImageLimits);
  expect(resources.canvasesCreated).toBe(resources.canvasesReleased); expect(resources.bitmapsClosed).toBe(1);
});
it('releases both original bitmaps and the canvas when encoding fails', async () => {
  const resources = new ImageResources();
  vi.mocked(toBlob).mockRejectedValueOnce(new Error('unsupported codec'));
  await expect(renderWatermark(source,{...defaults,kind:'image'}, {...source,blob:new Blob(['mark'])},resources,mobileImageLimits)).rejects.toThrow();
  expect(resources.canvasesReleased).toBe(1); expect(resources.bitmapsClosed).toBe(2);
  expect(validateOutput).not.toHaveBeenCalled();
});
