import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { inflateSync } from 'node:zlib';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';

const read = path => readFileSync(resolve('public', path));
const svgDocument = path => new JSDOM(read(path).toString(), { contentType: 'image/svg+xml' }).window.document;

// Decode the actual PNG payload, including each ICO frame and the RGB social cover.
function verifyPNG(bytes, width, height = width, channels = 4) {
  expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  expect(bytes.readUInt32BE(16)).toBe(width);
  expect(bytes.readUInt32BE(20)).toBe(height);
  expect([...bytes.subarray(24, 29)]).toEqual([8, channels === 4 ? 6 : 2, 0, 0, 0]); // RGB(A), non-interlaced
  const data = [];
  let ended = false;
  for (let offset = 8; offset < bytes.length;) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    expect(offset + length + 12).toBeLessThanOrEqual(bytes.length);
    if (type === 'IDAT') data.push(bytes.subarray(offset + 8, offset + 8 + length));
    if (type === 'IEND') ended = true;
    offset += length + 12;
  }
  expect(ended).toBe(true);
  const rows = inflateSync(Buffer.concat(data));
  expect(rows.length).toBe(height * (width * channels + 1));
  for (let row = 0; row < height; row++) expect(rows[row * (width * channels + 1)]).toBeLessThanOrEqual(4);
}

describe('approved brand assets', () => {
  it('ships the approved 1200×630 PNG social cover without modification', () => {
    const bytes = read('brand/tool4furry-og.png');
    expect(createHash('sha256').update(bytes).digest('hex')).toBe('d3f4d966ddb879b1e2c9b16bb844e7430af54f3f9877c80185382e98febd27b0');
    verifyPNG(bytes, 1200, 630, 3);
  });

  it('preserves the exact approved Master, including both eyes and transparent negative space', () => {
    const source = read('brand/tool4furry-symbol.svg').toString().replace(/\r\n?/g, '\n');
    expect(createHash('sha256').update(source).digest('hex')).toBe('6ce6b976f144906d24e970c4a5c5ad5fc7330186f8e899385beef8841769f987');
    const master = svgDocument('brand/tool4furry-symbol.svg');
    expect(master.documentElement.getAttribute('viewBox')).toBe('0 0 1254 1254');
    expect([...master.querySelectorAll('path')].map(path => path.id)).toEqual(['outer-mark', 'inner-eye']);
    expect(master.querySelector('#outer-mark').getAttribute('fill-rule')).toBe('evenodd');
    expect(master.querySelectorAll('rect, image, text, script, filter, foreignObject')).toHaveLength(0);
  });

  it('reuses Master geometry and ships ten real outlined DM Sans glyphs', () => {
    const master = svgDocument('brand/tool4furry-symbol.svg');
    const lockup = svgDocument('brand/tool4furry-horizontal.svg');
    for (const path of master.querySelectorAll('path')) {
      const copied = lockup.querySelector(`#symbol #${path.id}`);
      for (const attribute of ['d', 'fill', 'fill-rule'])
        expect(copied.getAttribute(attribute)).toBe(path.getAttribute(attribute));
    }
    const glyphs = [...lockup.querySelectorAll('#wordmark path')];
    expect(glyphs.map(path => path.getAttribute('data-glyph')).join('')).toBe('Tool4Furry');
    expect(glyphs).toHaveLength(10);
    for (const path of glyphs) expect(path.getAttribute('d')).toMatch(/^M.+[HVQLC].+Z$/i);
    expect(lockup.querySelectorAll('text, image, use, script, filter, foreignObject, style')).toHaveLength(0);
    expect(lockup.querySelector('#wordmark').getAttribute('fill')).toBe('currentColor');
  });

  it('ships a 96px PNG and genuine multi-resolution ICO frames', () => {
    verifyPNG(read('brand/tool4furry-favicon.png'), 96);
    const ico = read('favicon.ico');
    expect([...ico.subarray(0, 6)]).toEqual([0, 0, 1, 0, 7, 0]);
    const sizes = [16, 24, 32, 48, 64, 128, 256];
    for (const [index, size] of sizes.entries()) {
      const entry = 6 + index * 16;
      expect(ico[entry] || 256).toBe(size);
      expect(ico[entry + 1] || 256).toBe(size);
      expect(ico.readUInt16LE(entry + 6)).toBe(32);
      const length = ico.readUInt32LE(entry + 8);
      const offset = ico.readUInt32LE(entry + 12);
      expect(offset).toBeGreaterThanOrEqual(6 + sizes.length * 16);
      expect(offset + length).toBeLessThanOrEqual(ico.length);
      verifyPNG(ico.subarray(offset, offset + length), size);
    }
  });
});
