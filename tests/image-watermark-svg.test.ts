import { expect, it, vi } from 'vitest';
import { sanitizeSvg, svgLimits } from '../src/tools/image-watermark/svg';
import { acceptWatermark, decodeWatermark } from '../src/tools/image-watermark/asset';
import { ImageResources } from '../src/tools/image/resources';
import { desktopImageLimits, mobileImageLimits } from '../src/tools/image/limits';

const wrap = (content: string, attributes = 'width="120" height="60"') => `<svg xmlns="http://www.w3.org/2000/svg" ${attributes}>${content}</svg>`;
it('reconstructs a bounded SVG with shapes, transforms, local gradients and clipping', () => {
  const result = sanitizeSvg(wrap('<defs><linearGradient id="paint"><stop offset="0%" stop-color="#ff0000"/><stop offset="100%" stop-color="#0000ff"/></linearGradient><clipPath id="clip"><circle cx="30" cy="30" r="24"/></clipPath></defs><g transform="translate(1 2) rotate(12)"><path d="M0 0 L120 0 L120 60 Z" fill="url(#paint)" clip-path="url(#clip)"/></g>'), desktopImageLimits);
  expect(result).toMatchObject({width:120,height:60});
  expect(result.xml).toContain('url(#paint)'); expect(result.xml).toContain('clipPath');
  expect(sanitizeSvg(wrap('<rect width="120" height="60"/>','viewBox="0 0 120 60"'),desktopImageLimits)).toMatchObject({width:120,height:60});
});
it.each([
  '<script>alert(1)</script>', '<rect onclick="alert(1)"/>', '<foreignObject/>', '<image href="https://example.com/x.png"/>',
  '<use href="#x"/>','<animate attributeName="opacity"/>','<rect style="fill: red"/>', '<rect fill="url(https://example.com/x)"/>',
  '<rect fill="url(data:image/png;base64,AAAA)"/>','<rect clip-path="url(#missing)"/>','<path d="M 1e999 0"/>',
  '<path d="M 0 L 2 3"/>','<path d="M0 0 A1 1 0 2 1 10 10"/>',
  '<linearGradient id="p" href="#p"/>','<clipPath id="p" clip-path="url(#p)"><rect/></clipPath>',
  '<clipPath id="p"><g clip-path="url(#p)"><rect/></g></clipPath>', '<g id="x"/><g id="x"/>', '<style>svg{fill:red}</style>',
  '<svg xmlns="http://www.w3.org/1999/xhtml"><div/></svg>', '<rect unknown="1"/>', '<text>Hello</text>',
])('rejects unsupported, external or active content: %s', content => {
  expect(()=>sanitizeSvg(wrap(content),desktopImageLimits)).toThrow();
});
it.each([
  '<!DOCTYPE svg SYSTEM "https://example.com/dtd">',
  '<!DOCTYPE svg [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>',
  '<?xml-stylesheet href="https://example.com/x.css"?>',
])('rejects XML resource loading before parsing: %s', prefix => {
  expect(()=>sanitizeSvg(prefix+wrap('<rect/>'),desktopImageLimits)).toThrow();
});
it('rejects invalid XML, dimensions, entity escapes and bounded complexity', () => {
  for (const xml of [wrap('<rect>'),wrap('<rect fill="&#117;rl(#p)"/>'),wrap('', 'width="10001" height="1"'),wrap('', 'width="1.5" height="2"'),wrap('', 'width="0" height="1"'), wrap('<g>'.repeat(17)+'</g>'.repeat(17)), wrap('<rect/>'.repeat(svgLimits.nodes)),wrap(' '.repeat(svgLimits.bytes))])
    expect(()=>sanitizeSvg(xml,mobileImageLimits)).toThrow();
});
it('only loads sanitized bytes into a detached image and revokes its URL on close or failed decode', async () => {
  const file=new File([wrap('<rect width="120" height="60" fill="#ff0000"/>')],'logo.svg',{type:'image/svg+xml'});
  const resources=new ImageResources(); let width=120;
  const decode=vi.fn(async()=>{}), remove=vi.fn();
  vi.stubGlobal('Image',class {src='';naturalWidth=width;naturalHeight=60;decode=decode;removeAttribute=remove;});
  vi.stubGlobal('URL',Object.assign(URL,{createObjectURL:vi.fn(()=>`blob:validated-svg`),revokeObjectURL:vi.fn()}));
  const source=await acceptWatermark(file,resources,desktopImageLimits);
  expect(source.blob).not.toBe(file); expect(source.blob.type).toBe('image/svg+xml');
  const loaded=await decodeWatermark(source,resources,desktopImageLimits);
  expect(loaded).toMatchObject({width:120,height:60}); expect(URL.createObjectURL).toHaveBeenCalledWith(source.blob);
  loaded.close(); expect(remove).toHaveBeenCalledWith('src');
  width=121;
  await expect(decodeWatermark(source,resources,desktopImageLimits)).rejects.toThrow('watermark');
  expect(resources.urlsCreated).toBe(resources.urlsRevoked);
  await expect(acceptWatermark(new File([wrap('<script/>')],'unsafe.svg'),resources,desktopImageLimits)).rejects.toThrow('svg');
  expect(decode).toHaveBeenCalledTimes(2);
});
