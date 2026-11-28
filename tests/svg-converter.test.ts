import { describe, it, expect } from 'vitest';
import { validateSvg, formatSvg } from '../src/tools/svg-converter/policy';
import { outputSize, packIco, sizedSvg, createSvgNamer, embedSvg } from '../src/tools/svg-converter/core';
import svgSample from '../src/tools/svg-converter/librecosta-black-white.svg?raw';
import { mergePixelRegions, tracePixelArt, tracingSize, tracePresets } from '../src/tools/svg-converter/vector';
import { traceColor } from '../src/tools/svg-converter/color-trace';
import { getAvailableTools, tools } from '../src/tools/registry';

const svg = (body: string, attributes = 'viewBox="-8 -4 80 40"') =>
  '<svg xmlns="http://www.w3.org/2000/svg" ' + attributes + '>' + body + '</svg>';
const parsed = (xml: string) => new DOMParser().parseFromString(xml, 'image/svg+xml');

describe('SVG Converter static SVG policy', () => {
  it('accepts same-document CSS painting, text, gradients, filters, and symbols', async () => {
    const doc = await validateSvg(svg(
      '<style>.paper { fill: url(#paint); stroke-width: 1px; }</style><defs>' +
      '<linearGradient id="paint"><stop offset="0" stop-color="#a397d2"/></linearGradient>' +
      '<filter id="shadow"><feGaussianBlur stdDeviation="2"/></filter>' +
      '<symbol id="icon" viewBox="0 0 20 20"><rect width="20" height="20"/></symbol></defs>' +
      '<use href="#icon" filter="url(#shadow)" width="20" height="20"/>' +
      '<text class="paper" xml:space="preserve">A  B<tspan> C</tspan></text>',
    ));
    expect(doc).toMatchObject({ width: 80, height: 40, viewBox: [-8, -4, 80, 40], hasEffects: true });
    expect(parsed(formatSvg(doc)).querySelector('text')?.textContent).toBe('A  B C');
    expect(parsed(formatSvg(doc)).querySelector('style')?.textContent).toBe('.paper { fill: url(#paint); stroke-width: 1px; }');
    await expect(validateSvg(svgSample)).resolves.toMatchObject({
      width: 831.113, height: 847.343, viewBox: [3.781, 3.124, 831.113, 847.343],
    });
  });
  it.each([
    '<script/>', '<rect onclick="noop()"/>', '<foreignObject/>', '<animate/>',
    '<image href="https://resource.invalid/image.png"/>', '<use href="https://resource.invalid/shape.svg#x"/>',
    '<image href="data:image/svg+xml;base64,AAAA"/>', '<image href="data:image/png;base64,AAAA"/>',
    '<rect fill="url(https://resource.invalid/paint)"/>',
    '<style>@import "https://resource.invalid/style.css";</style>',
    '<style>.a{fill:url(https://resource.invalid/paint)}</style>',
    '<style>@font-face{font-family:X;src:url(https://resource.invalid/font.woff2)}</style>',
    '<style>.a{fill:var(--x)}</style>', '<g xmlns="https://example.invalid/svg"/>',
    '<?xml-stylesheet href="https://resource.invalid/style.css" type="text/css"?>',
    '<use href="#missing"/>', '<g id="loop"><use href="#loop"/></g>',
    '<pattern width=".000001" height="1"><rect width="1" height="1"/></pattern>',
    '<filter><feGaussianBlur stdDeviation="999"/></filter>',
    '<rect xmlns:x="https://example.invalid/ns" x:test="value"/>',
  ])('rejects unsafe or unsupported static content %s', async body => {
    await expect(validateSvg(svg(body))).rejects.toThrow(/SVG cannot be processed/);
  });
  it('rejects declarations, malformed XML and reference expansion', async () => {
    await expect(validateSvg('<!DOCTYPE svg>' + svg(''))).rejects.toThrow(/DTD/);
    await expect(validateSvg(svg('<path>'))).rejects.toThrow(/Invalid XML/);
    const defs = ['<rect id="a0" width="1" height="1"/>'];
    for (let i = 1; i <= 9; i++)
      defs.push('<g id="a' + i + '">' + ('<use href="#a' + (i - 1) + '"/>').repeat(4) + '</g>');
    await expect(validateSvg(svg('<defs>' + defs.join('') + '</defs><use href="#a9"/>'))).rejects.toThrow(/complexity/);
  });
  it('resolves absolute units and retains viewBox, viewport and aspect semantics', async () => {
    const doc = await validateSvg(svg('<path d="M0 0L80 40"/>', 'width="2in" height="2.54cm" preserveAspectRatio="xMaxYMin meet"'));
    expect(doc).toMatchObject({ width: 192, height: 96 });
    const output = parsed(await sizedSvg(doc, { width: 1440, height: 720 }).text()).documentElement;
    expect(output.getAttribute('viewBox')).toBe('0 0 192 96');
    expect(output.getAttribute('preserveAspectRatio')).toBe('xMaxYMin meet');
    const negative = await validateSvg(svg('<rect width="20" height="10"/>'));
    expect(parsed(await sizedSvg(negative, { width: 160, height: 80 }).text()).documentElement.getAttribute('viewBox')).toBe('-8 -4 80 40');
    const unknown = await validateSvg(svg('', 'width="100%" height="100%"'));
    expect(unknown.width).toBeUndefined();
    expect(unknown.height).toBeUndefined();
    expect(outputSize(16_384, 1024)).toEqual({ width: 16_384, height: 1024 });
    expect(() => outputSize(10_000, 4500)).toThrow();
  });
});

it('emits an actual ICO directory and rejects inconsistent frame sizes', async () => {
  function png(size: number) {
    const bytes = new Uint8Array(33);
    const header = new DataView(bytes.buffer);
    header.setUint32(0, 0x89504e47);
    header.setUint32(4, 0x0d0a1a0a);
    header.setUint32(12, 0x49484452);
    header.setUint32(16, size);
    header.setUint32(20, size);
    return bytes;
  }
  const blob = packIco([{ size: 16, png: png(16) }, { size: 256, png: png(256) }]);
  const view = new DataView(await blob.arrayBuffer());
  expect([view.getUint16(0, true), view.getUint16(2, true), view.getUint16(4, true)]).toEqual([0, 1, 2]);
  expect(view.getUint8(6)).toBe(16);
  expect(view.getUint8(22)).toBe(0);
  expect(view.getUint32(18, true)).toBe(38);
  expect(view.getUint32(34, true)).toBe(71);
  expect(() => packIco([{ size: 32, png: png(16) }])).toThrow();
});

it('uses real geometry, separate transparent regions and different tracing parameters', async () => {
  const width = 32, height = 32;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 3; y < 29; y++) for (let x = 3; x < 29; x++) {
    if (x >= 12 && x <= 19 && y >= 12 && y <= 19) continue;
    data.set(x < 16 ? [200, 30, 80, 255] : [30, 190, 210, 255], (y * width + x) * 4);
  }
  // ImageData exposes dimensions through prototype getters, not own data properties.
  const source = Object.create({ width, height, data }) as { width: number; height: number; data: Uint8ClampedArray };
  const color = traceColor(source, tracePresets.illustration);
  const mono = traceColor(source, { ...tracePresets.line, threshold: 254 });
  expect(color.xml).toMatch(/fill="#c81e50"/);
  expect(color.xml).toMatch(/fill="#1ebed2"/);
  expect(mono.xml).not.toContain('#c81e50');
  expect(mono.xml).toMatch(/d="M[^"]*ZM[^"]*Z"/);
  expect(color.xml).not.toMatch(/<image|data:/);
  expect(mono.xml).not.toMatch(/<image|data:/);
  await expect(validateSvg(color.xml)).resolves.toMatchObject({ width, height });
  await expect(validateSvg(mono.xml)).resolves.toMatchObject({ width, height });
  expect(tracingSize(4000, 2000, 'photo')).toEqual({ width: 2828, height: 1414 });
  expect(tracingSize(4000, 2000, 'pixel')).toBeUndefined();
});

it('merges exact rows and columns without changing pixel-region alpha', async () => {
  const red = [255, 0, 0, 128], clear = [0, 0, 0, 0];
  const source = { width: 3, height: 2, data: new Uint8ClampedArray([...red, ...red, ...clear, ...red, ...red, ...clear]) };
  expect(mergePixelRegions(source)).toEqual([{ x: 0, y: 0, width: 2, height: 2, color: 0xff000080 }]);
  const traced = tracePixelArt(source);
  expect(traced).toMatchObject({ count: 1 });
  expect(traced.xml).toContain('fill-opacity="0.50196078"');
  expect(traced.xml).toContain('M0 0h2v2h-2z');
  await expect(validateSvg(traced.xml)).resolves.toMatchObject({ width: 3, height: 2 });
});

it('keeps Embed separate and avoids timestamp collisions', () => {
  const document = embedSvg({ width: 20, height: 10 }, 'data:image/png;base64,AAAA', 'cover', '#ffffff');
  expect(document).toContain('xMidYMid slice');
  expect(document).toContain('<image');
  const name = createSvgNamer(), at = new Date(2026, 0, 2, 3, 4, 5, 6);
  expect(name('示例.svg', 'png', at)).toBe('示例-20260102-030405-006.png');
  expect(name('示例.svg', 'png', at)).toBe('示例-20260102-030405-006-2.png');
});

it('publishes a single SVG Converter entry in both regions', () => {
  const tool = tools.find(item => item.id === 'svg-converter');
  expect(tool).toMatchObject({ status: 'published', slug: 'svg-converter', regions: ['cn', 'global'], copy: { zh: { title: 'SVG 转换' }, en: { title: 'SVG Converter' } } });
  expect(tools).toHaveLength(29);
  for (const region of ['cn', 'global'] as const) {
    expect(getAvailableTools(region, false)).toHaveLength(27);
    expect(getAvailableTools(region, false)).toContain(tool);
    expect(getAvailableTools(region, true).some(item => item.slug === 'svg-to-png')).toBe(false);
  }
});
