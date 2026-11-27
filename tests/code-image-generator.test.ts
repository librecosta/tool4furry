import { describe, expect, it } from 'vitest';
import { composeScene, gradientLine, layoutCode, lineRanges, outputSize, placePhoto, type Measure } from '../src/tools/code-image-generator/core';
import { createCodeNamer } from '../src/tools/code-image-generator/delivery';
import { highlightCode } from '../src/tools/code-image-generator/highlight';
import { plainHighlight } from '../src/tools/code-image-generator/highlight-data';
import { defaultPhotoPlacement, defaults, defaultWindowLayers, languageForFile, presets, sampleCode, themes } from '../src/tools/code-image-generator/settings';

const measure: Measure = (text, size) => ({
  width: [...text].reduce((sum, char) => sum + (/\p{Script=Han}/u.test(char) ? size : size / 2), 0),
  ascent: size * 0.75, descent: size * 0.25,
});
const specimens = {
  typescript: sampleCode, javascript: 'const answer = `yes ${1 + 2}`;',
  jsx: 'const node = <div className="greeting">Hello</div>;',
  tsx: 'const node: ReactNode = <Component text="Hello" />;',
  go: 'package main\nfunc main() { fmt.Println("Hi") }',
  rust: 'fn main() { println!("Hello"); }',
  python: 'def greet(name):\n    return f"Hi {name}"',
  c: '#include <stdio.h>\nint main(void) { return 0; }',
  cpp: 'template <typename T> int greet(T input) { return 1; }',
  csharp: 'public static string Greet(string name) => $"Hello {name}";',
  java: 'public record Greeting(String name) {}',
  kotlin: 'fun greet(name: String) = "Hello $name"',
  swift: 'func greet(_ name: String) -> String { return "Hello \\(name)" }',
  html: '<p style="color: red">Hello</p>',
  css: 'p:first-child { color: #fff; }',
  scss: '$primary: red; p { color: $primary; }',
  json: '{"hello":"world","count":1}',
  yaml: 'hello: world\ncount: 1',
  toml: '[sample]\nhello = "world"',
  sql: "SELECT name FROM people WHERE id = 1;",
  bash: '#!/bin/bash\nfor i in 1 2; do echo "$i"; done',
  powershell: 'Get-Item -Path $env:TEMP | Select-Object Name',
  markdown: '## Heading\n\n**Hello**\n\n```typescript\nconst x = 1;\n```',
  text: 'just plain text',
} as const;

describe('Code Image Shiki tokens', () => {
  it.each(Object.entries(specimens) as [keyof typeof specimens, string][])('loads %s and preserves Unicode and empty source lines', async (language, code) => {
    const text = code + '\n\n// 中文 🧑🏽‍💻\t\n';
    const result = await highlightCode(text, language, 'github-dark');
    expect(result.fallback, language).not.toBe(true);
    expect(result.lines.map(line => line.map(token => token.text).join('')).join('\n')).toBe(text);
    if (language !== 'text') expect(new Set(result.lines.flat().map(token => token.color)).size).toBeGreaterThan(1);
  });
  it.each(Object.keys(themes) as (keyof typeof themes)[])('loads syntax theme %s', async theme => {
    const image = await highlightCode(sampleCode, 'typescript', theme);
    expect(image.fallback).toBeUndefined();
    expect(image.surface).toMatch(/^#/);
    expect(new Set(image.lines.flat().map(token => token.color)).size).toBeGreaterThan(3);
  });
  it('matches file suffixes case-insensitively and keeps unfamiliar sources editable', () => {
    expect(languageForFile('舞台.TSX')).toBe('tsx');
    expect(languageForFile('data.yml')).toBe('yaml');
    expect(languageForFile('Dockerfile')).toBe('text');
  });
});

describe('Code Image layout and delivery', () => {
  it('preserves positioned tabs, Unicode graphemes, wrapped logical line marks and distinct line labels', () => {
    const source = 'a\tZ\n中文🧑🏽‍💻 ' + 'ABCDEFG '.repeat(26);
    const settings = { ...defaults, size: 'custom', width: 350, height: 650, firstLine: 101,
      emphasized: '', added: '1', removed: '2', dim: true } as const;
    const scene = layoutCode(plainHighlight(source), settings, measure);
    const firstLine = scene.text.find(run => run.text === 'a')!;
    const afterTab = scene.text.find(run => run.text === 'Z')!;
    expect(afterTab.x - firstLine.x).toBe(4 * settings.fontSize / 2);
    expect(scene.text.filter(run => run.text === '102')).toHaveLength(1);
    expect(scene.text.filter(run => run.text === '+')).toHaveLength(1);
    expect(scene.text.filter(run => run.text === '-')).toHaveLength(1);
    expect(scene.shapes.filter(shape => shape.color === '#e16c78' && shape.kind === 'rect' && shape.width === 2).length).toBeGreaterThan(1);
    expect(scene.text.map(run => run.text).join('')).toContain('中文🧑🏽‍💻');
    expect(scene.vectorSafe).toBe(false);
    expect(lineRanges('1, 3–7, 2-1, 0, 八，10')).toEqual([[1, 1], [3, 7], [10, 10]]);
  });
  it('varies window chrome and provides eight independent artwork presets', () => {
    const tokens = plainHighlight(sampleCode);
    const results = Object.values(presets).map(preset =>
      composeScene(layoutCode(tokens, { ...defaults, ...preset }, measure), preset.background, undefined, undefined, defaultWindowLayers));
    expect(new Set(results.map(scene => JSON.stringify(scene))).size).toBe(8);
    const mac = layoutCode(tokens, defaults, measure);
    const windows = layoutCode(tokens, { ...defaults, style: 'windows' }, measure);
    const minimal = layoutCode(tokens, { ...defaults, style: 'minimal' }, measure);
    expect(mac.shapes.filter(shape => shape.kind === 'dot')).toHaveLength(3);
    expect(windows.shapes.filter(shape => shape.kind === 'line')).toHaveLength(7);
    expect(minimal.text.some(run => run.text === 'greet.ts')).toBe(false);
    expect(mac.text.some(run => run.text === 'greet.ts')).toBe(true);
    expect(layoutCode(tokens, { ...defaults, background: { ...defaults.background, kind: 'transparent' } }, measure).text).toEqual(mac.text);
  });
  it('enforces logical and raster dimensions without clipping the original code', () => {
    const text = plainHighlight(sampleCode);
    const scene = layoutCode(text, { ...defaults, size: '4:5' }, measure);
    expect(scene.width * 5).toBe(scene.height * 4);
    expect(outputSize(scene.width, scene.height, 3)).toEqual({ width: scene.width * 3, height: scene.height * 3 });
    expect(outputSize(8000, 5000, 1)).toEqual({ width: 8000, height: 5000 });
    expect(() => outputSize(8192, 8192, 1)).toThrow(/40 megapixels/);
    expect(() => outputSize(2100, 200, 4)).toThrow(/8,192/);
    expect(() => layoutCode(text, { ...defaults, size: 'custom', width: 240, height: 160 }, measure)).toThrow(/does not fit/);
    expect(() => layoutCode(plainHighlight('x\n'.repeat(1000)), defaults, measure)).toThrow();
  });
  it('uses proportional cover and consistent orientation for linear backgrounds', () => {
    const frame = { x: 0, y: 0, width: 400, height: 400 };
    const photo = { width: 900, height: 300 };
    const cover = placePhoto(photo, frame, { ...defaultPhotoPlacement, fit: 'cover' }).bounds;
    expect(cover.x).toBeCloseTo(-400);
    expect(cover.y).toBeCloseTo(0);
    expect(cover.width).toBeCloseTo(1200);
    expect(cover.height).toBeCloseTo(400);
    const contain = placePhoto(photo, frame, { ...defaultPhotoPlacement, y: -100 });
    expect(contain.bounds.width / contain.bounds.height).toBeCloseTo(3);
    expect(contain.bounds.x).toBeCloseTo(0);
    expect(contain.bounds.y).toBeCloseTo(0);
    expect(placePhoto(photo, frame, { ...defaultPhotoPlacement, fit: 'cover', zoom: 150, x: 100, y: -100 }).bounds)
      .toEqual({ x: 0, y: -200, width: 1800, height: 600 });
    expect(gradientLine(600, 400, 180).map(value => Math.round(value) || 0)).toEqual([300, 0, 300, 400]);
  });
  it.each([[1600, 900], [900, 1600]])('matches a %d × %d photo in auto mode while honoring explicit canvas sizes', (width, height) => {
    const photo = { width, height };
    const text = plainHighlight(sampleCode);
    const auto = layoutCode(text, defaults, measure, photo);
    expect(Math.abs(auto.height - auto.width * height / width)).toBeLessThan(1);
    expect(auto.window.x * 2 + auto.window.width).toBe(auto.width);
    expect(auto.window.y * 2 + auto.window.height).toBe(auto.height);
    expect(auto.window.width).toBeLessThan(auto.width);
    expect(auto.window.height).toBeLessThan(auto.height);
    const square = layoutCode(text, { ...defaults, size: '1:1' }, measure, photo);
    expect(square.width).toBe(square.height);
    expect(layoutCode(text, { ...defaults, size: 'custom', width: 700, height: 500 }, measure, photo))
      .toMatchObject({ width: 700, height: 500, window: { x: defaults.margin, y: defaults.margin } });
  });
  it('composes two independent photo placements without fading the code or window decorations', () => {
    const layout = layoutCode(plainHighlight(sampleCode), defaults, measure);
    const canvas = { bitmap: { width: 100, height: 200 } as ImageBitmap, placement: defaultPhotoPlacement };
    const window = { bitmap: { width: 300, height: 100 } as ImageBitmap,
      placement: { ...defaultPhotoPlacement, fit: 'cover', x: 32 } as const };
    const background = { ...defaults.background, kind: 'image' } as const;
    const layers = { ...defaultWindowLayers, photoVisible: true, photoOpacity: 35, baseOpacity: 72 };
    const scene = composeScene(layout, background, canvas, window, layers);
    expect(scene.canvasPhoto?.bitmap).toBe(canvas.bitmap);
    expect(scene.windowPhoto?.bitmap).toBe(window.bitmap);
    expect(scene.canvasPhoto?.bounds).toEqual(placePhoto(canvas.bitmap, { x: 0, y: 0, width: layout.width, height: layout.height }, canvas.placement).bounds);
    expect(scene.windowPhoto?.bounds).toEqual(placePhoto(window.bitmap, layout.window, window.placement).bounds);
    expect(scene.windowPhoto?.opacity).toBe(0.35);
    expect(scene.windowBaseOpacity).toBe(0.72);
    expect(scene.text).toBe(layout.text);
    expect(scene.shapes).toBe(layout.shapes);
    expect(composeScene(layout, background, canvas, window, { ...layers, baseVisible: false }))
      .toMatchObject({ windowBaseOpacity: 0, windowPhoto: { opacity: 0.35 } });
    expect(composeScene(layout, background, canvas, window, { ...layers, photoVisible: false }))
      .toMatchObject({ windowBaseOpacity: 0.72, windowPhoto: undefined });
    expect(composeScene(layout, background, canvas, window, { ...layers, photoOpacity: 0 }))
      .toMatchObject({ windowBaseOpacity: 0.72, windowPhoto: undefined });
  });
  it('prevents same-millisecond collisions and keeps lawful Unicode titles', () => {
    const time = new Date(2026, 10, 26, 22, 55, 30, 128);
    const name = createCodeNamer();
    expect(name('示例🌌.ts', 'other.ts', 'png', time)).toBe('示例🌌-20261126-225530-128.png');
    expect(name('示例🌌.ts', 'other.ts', 'png', time)).toBe('示例🌌-20261126-225530-128-2.png');
    expect(name('', '', 'jpeg', time)).toBe('code-20261126-225530-128-3.jpg');
    expect(name('', 'source.py', 'svg', time)).toBe('source-20261126-225530-128-4.svg');
    expect(name('Release 1.2', '', 'webp', time)).toBe('Release 1.2-20261126-225530-128-5.webp');
  });
});
