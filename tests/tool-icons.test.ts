import { readFileSync, readdirSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { getToolIcon, toolIcons } from '../src/site/tool-icons';
import { tools } from '../src/tools/registry';

// Decode the delivered non-interlaced RGBA PNGs to verify actual pixel blocks.
function pixels(id: string, size: number) {
  const bytes = readFileSync(`src/assets/tool-icons/${id}-${size}.png`);
  expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([size, size]);
  expect([...bytes.subarray(24, 29)]).toEqual([8, 6, 0, 0, 0]);
  const chunks: Buffer[] = [];
  let ended = false;
  for (let offset = 8; offset < bytes.length;) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    expect(offset + length + 12).toBeLessThanOrEqual(bytes.length);
    if (type === 'IDAT') chunks.push(bytes.subarray(offset + 8, offset + 8 + length));
    if (type === 'IEND') ended = true;
    offset += length + 12;
  }
  expect(ended).toBe(true);
  const raw = inflateSync(Buffer.concat(chunks));
  const stride = size * 4;
  expect(raw.length).toBe((stride + 1) * size);
  const result = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) {
    const filter = raw[y * (stride + 1)];
    expect(filter).toBeLessThanOrEqual(4);
    for (let x = 0; x < stride; x++) {
      const left = x >= 4 ? result[y * stride + x - 4] : 0;
      const up = y ? result[(y - 1) * stride + x] : 0;
      const corner = y && x >= 4 ? result[(y - 1) * stride + x - 4] : 0;
      const p = left + up - corner;
      const distances = [Math.abs(p - left), Math.abs(p - up), Math.abs(p - corner)];
      const paeth = distances[0] <= distances[1] && distances[0] <= distances[2] ? left : distances[1] <= distances[2] ? up : corner;
      const predictor = [0, left, up, Math.floor((left + up) / 2), paeth][filter];
      result[y * stride + x] = (raw[y * (stride + 1) + x + 1] + predictor) & 255;
    }
  }
  const alpha = result.filter((_, index) => index % 4 === 3);
  expect(alpha.includes(0)).toBe(true);
  expect(alpha.includes(255)).toBe(true);
  return result;
}

describe('delivered pixel tool icons', () => {
  it('maps all 29 Registry IDs to exactly 58 imported PNGs and retains a safe unknown/fixture fallback', () => {
    expect(Object.keys(toolIcons).sort()).toEqual(tools.map(tool => tool.id).sort());
    expect(readdirSync('src/assets/tool-icons').filter(file => file.endsWith('.png')).sort())
      .toEqual(tools.flatMap(tool => [`${tool.id}-32.png`, `${tool.id}-128.png`]).sort());
    for (const tool of tools) for (const size of [32, 128] as const)
      expect(getToolIcon(tool.id)![size]).toContain(`${tool.id}-${size}.png`);
    for (const id of ['unknown', 'fixture-1', '__proto__', 'constructor']) expect(getToolIcon(id)).toBeUndefined();
  });

  it.each(tools.map(tool => tool.id))('%s preserves transparent RGBA and exact 4× nearest-neighbor pixels', id => {
    const small = pixels(id, 32);
    const large = pixels(id, 128);
    const expanded = Buffer.alloc(128 * 128 * 4);
    for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
      const source = (Math.floor(y / 4) * 32 + Math.floor(x / 4)) * 4;
      small.copy(expanded, (y * 128 + x) * 4, source, source + 4);
    }
    expect(large.equals(expanded)).toBe(true);
  });
});
