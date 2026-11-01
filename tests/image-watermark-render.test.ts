import { describe, expect, it, vi, beforeEach } from 'vitest';
import { defaults, validSettings, placement, drawComposition, renderWatermark } from '../src/tools/image-watermark/render';
import { ImageResources } from '../src/tools/image/resources';
import { mobileImageLimits } from '../src/tools/image/limits';
import { decodeChecked, toBlob, validateOutput } from '../src/tools/image/browser-codec';
import type { ImageSource } from '../src/tools/image/types';
vi.mock('../src/tools/image/browser-codec', () => ({decodeChecked: vi.fn(), toBlob: vi.fn(), validateOutput: vi.fn()}));
const source = {width: 600, height: 400, info: {format: 'png', width: 600, height: 400, orientation: 1}, blob: new Blob(['source']), file: new File(['source'],'source.png')} as ImageSource;
let calls: Array<{alpha: number; args: unknown[]}>;
let ctx: CanvasRenderingContext2D;
beforeEach(() => {
  calls = [];
  ctx = {clearRect: vi.fn(), fillRect: vi.fn(), save: vi.fn(), restore: vi.fn(), scale: vi.fn(), globalAlpha: 1,
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
  it.each([{opacity:101},{margin:-1},{position:9},{fontSize:0},{quality:1.5},{imagePercent:0},{format:'avif'},{text:''},{color:'#abc'},{text:'a\nb'}])('rejects invalid settings %j', patch => {
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
