// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { contrast, parseColor } from '../src/tools/color-contrast/core';
import { artStyles, QrDensityError, renderQrSvg } from '../src/tools/qr-code-generator/art/render';
import { createQrMatrix } from '../src/tools/qr-code-generator/matrix/qr-matrix';
import { createDefaultRecipe } from '../src/tools/qr-code-generator/recipe/defaults';
import { artStyleIds } from '../src/tools/qr-code-generator/recipe/types';
import { displayQrText, editQrText, replaceQrText } from '../src/tools/qr-code-generator/qr-input';

describe('canonical QR artwork', () => {
  const recipe = createDefaultRecipe();
  const content = ' 雪🦊 https://example.com/?q=%23&x=1#test <svg/onload=x> ';
  const matrix = createQrMatrix({ ...recipe, content });

  it.each(artStyleIds)('keeps every %s module and the full quiet zone intact', id => {
    const config = { ...recipe, content, artwork: { ...recipe.artwork, id } };
    const art = renderQrSvg(matrix, 513, { kind: 'artistic', recipe: config });
    const svg = new DOMParser().parseFromString(art.svg, 'image/svg+xml');
    expect(svg.querySelector('parsererror, image, script, foreignObject, style, link, a')).toBeNull();
    expect(art.svg).not.toContain(content);
    for (const node of svg.querySelectorAll('*')) {
      for (const attribute of node.attributes)
        expect(attribute.name).not.toMatch(/^(?:on|href|xlink)/i);
    }
    expect(art.svg).not.toMatch(/NaN|Infinity|url\((?!#)/);
    expect(svg.documentElement.getAttribute('viewBox')).toBe('0 0 513 513');
    expect(art.modulePixels).toBeGreaterThanOrEqual(4);
    const group = svg.documentElement.lastElementChild!;
    expect(group.getAttribute('shape-rendering')).toBe('crispEdges');
    const [guard, zone, ...runs] = [...group.children];
    expect(guard.getAttribute('x')).toBe(String(art.quietZoneStart - art.modulePixels));
    expect(guard.getAttribute('width')).toBe(String((matrix.size + 10) * art.modulePixels));
    expect(zone.getAttribute('x')).toBe(String(art.quietZoneStart));
    expect(zone.getAttribute('width')).toBe(String((matrix.size + 8) * art.modulePixels));
    expect(zone.getAttribute('fill')).toBe(artStyles[id].light);
    const colors = Array<string | undefined>(matrix.cells.length).fill(undefined);
    for (const run of runs) {
      const chunks = [...run.getAttribute('d')!.matchAll(/M(\d+) (\d+)h(\d+)v(\d+)h-(\d+)z/g)];
      expect(chunks.map(chunk => chunk[0]).join('')).toBe(run.getAttribute('d'));
      for (const [, x, y, width, height, back] of chunks) {
        const col = (Number(x) - art.matrixStart) / art.modulePixels;
        const row = (Number(y) - art.matrixStart) / art.modulePixels;
        const length = Number(width) / art.modulePixels;
        expect([col, row, length].every(Number.isInteger)).toBe(true);
        expect(col >= 0 && row >= 0 && row < matrix.size && col + length <= matrix.size).toBe(true);
        expect([Number(height), width]).toEqual([art.modulePixels, back]);
        for (let i = col; i < col + length; i++) {
          const index = row * matrix.size + i;
          expect(colors[index]).toBeUndefined();
          colors[index] = run.getAttribute('fill')!;
        }
      }
    }
    const style = artStyles[id];
    colors.forEach((fill, i) => {
      expect(!!fill).toBe(!!matrix.cells[i]);
      if (matrix.cells[i] && matrix.functionalMask[i]) expect(fill).toBe(style.dark);
    });
    for (const dark of [style.dark, ...style.tints])
      expect(contrast(parseColor(dark), parseColor(style.light))).toBeGreaterThan(5);
  });

  it('generates distinct frame geometry and data fills, independent of every terrain setting', () => {
    const renders = artStyleIds.map(id => {
      const config = { ...recipe, content, artwork: { ...recipe.artwork, id } };
      const anotherTerrain = { ...config, terrain: { ...config.terrain, id: 'valley' as const, seed: 14 } };
      expect(createQrMatrix(anotherTerrain)).toEqual(matrix);
      const { svg } = renderQrSvg(matrix, 512, { kind: 'artistic', recipe: config });
      expect(renderQrSvg(matrix, 512, { kind: 'artistic', recipe: anotherTerrain }).svg).toBe(svg);
      const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
      return [...doc.documentElement.firstElementChild!.querySelectorAll('path')].map(node => node.getAttribute('d')).join('');
    });
    expect(new Set(renders).size).toBe(3);
  });

  it('uses integer output coordinates and reports the minimum export size for dense symbols', () => {
    const denseContent = 'x'.repeat(1200);
    const dense = createQrMatrix({ ...recipe, content: denseContent });
    const mode = { kind: 'artistic' as const, recipe: { ...recipe, content: denseContent } };
    expect(() => renderQrSvg(dense, 512, mode)).toThrow(QrDensityError);
    expect(() => renderQrSvg(dense, 128, { kind: 'standard' })).toThrow(QrDensityError);
    expect(renderQrSvg(dense, 513, { kind: 'standard' }).modulePixels).toBe(3);
    expect(renderQrSvg(dense, 2048, mode).modulePixels).toBeGreaterThan(4);
    expect(() => renderQrSvg(matrix, 2049, mode)).toThrow(RangeError);
    expect(() => renderQrSvg(matrix, 512, { kind: 'standard', colors: { dark: '" onload="x', light: '#ffffff' } })).toThrow();
  });
});

it('preserves pasted CRLF and CR through display normalization and subsequent edits', () => {
  const text = replaceQrText('a\r\nb\rc', 2, 3, '多\r\n行');
  expect(text).toBe('a\r\n多\r\n行\rc');
  expect(displayQrText(text)).toBe('a\n多\n行\nc');
  expect(editQrText(text, 'a\n多\n行\n🦊c')).toBe('a\r\n多\r\n行\r🦊c');
});
