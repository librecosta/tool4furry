import type { Measure, FontStyle } from './core';
import type { FontId } from './settings';

export const families = {
  jetbrains: 'JetBrains Mono', fira: 'Fira Code', plex: 'IBM Plex Mono', system: 'System Mono',
};
type FontFile = { url: string; weight: string; style: string };
type FontAssets = { files: FontFile[]; notice: string };
function fontAssets(parts: { default: string }[], notice: string): FontAssets {
  return {
    files: parts.map(({ default: url }, index) => ({
      url, weight: index % 2 ? '700' : '400', style: index < 2 ? 'normal' : 'italic',
    })),
    notice,
  };
}
const bundles = {
  jetbrains: () => Promise.all([
    import('@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2?url'),
    import('@fontsource/jetbrains-mono/files/jetbrains-mono-latin-700-normal.woff2?url'),
    import('@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-italic.woff2?url'),
    import('@fontsource/jetbrains-mono/files/jetbrains-mono-latin-700-italic.woff2?url'),
    import('@fontsource/jetbrains-mono/LICENSE?raw'),
  ]).then(parts => fontAssets(parts.slice(0, -1), parts.at(-1)!.default)),
  fira: () => Promise.all([
    import('@fontsource/fira-code/files/fira-code-latin-400-normal.woff2?url'),
    import('@fontsource/fira-code/files/fira-code-latin-700-normal.woff2?url'),
    import('@fontsource/fira-code/LICENSE?raw'),
  ]).then(parts => fontAssets(parts.slice(0, -1), parts.at(-1)!.default)),
  plex: () => Promise.all([
    import('@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2?url'),
    import('@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-700-normal.woff2?url'),
    import('@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-italic.woff2?url'),
    import('@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-700-italic.woff2?url'),
    import('@fontsource/ibm-plex-mono/LICENSE?raw'),
  ]).then(parts => fontAssets(parts.slice(0, -1), parts.at(-1)!.default)),
};
export const fontName = (id: FontId) => 'T4F ' + families[id];
const fallback = 'ui-monospace, Consolas, monospace, "Noto Sans SC Variable", "Microsoft YaHei", "PingFang SC", "Segoe UI Emoji", "Apple Color Emoji"';
const promises = new Map<Exclude<FontId, 'system'>, Promise<FontAssets>>();
const features = '"liga" 0, "calt" 0';

async function loadFont(id: Exclude<FontId, 'system'>) {
  const assets = await bundles[id]();
  const faces = await Promise.all(assets.files.map(({ url, weight, style }) =>
    new FontFace(fontName(id), `url("${url}") format("woff2")`, { weight, style, featureSettings: features }).load()));
  faces.forEach(face => document.fonts.add(face));
  return assets;
}

function getFont(id: Exclude<FontId, 'system'>) {
  let pending = promises.get(id);
  if (!pending) {
    pending = loadFont(id).catch(error => { promises.delete(id); throw error; });
    promises.set(id, pending);
  }
  return pending;
}

export async function prepareFont(font: FontId, text: string) {
  const han = [...new Set(text.match(/\p{Script=Han}/gu) ?? [])].join('');
  await Promise.all([
    font !== 'system' && getFont(font),
    han && document.fonts.load('16px "Noto Sans SC Variable"', han),
  ]);
}

export function canvasFont(id: FontId, size: number, { bold, italic }: FontStyle) {
  const family = id === 'system' ? fallback : `"${fontName(id)}", ${fallback}`;
  return `${italic ? 'italic' : 'normal'} ${bold ? '700' : '400'} ${size}px ${family}`;
}

export function canvasMeasure(ctx: CanvasRenderingContext2D, font: FontId): Measure {
  ctx.fontKerning = 'none';
  ctx.direction = 'ltr';
  return (text, size, style) => {
    const setting = canvasFont(font, size, style);
    if (ctx.font !== setting) ctx.font = setting;
    const metrics = ctx.measureText(text);
    return { width: metrics.width, ascent: Math.max(metrics.fontBoundingBoxAscent || 0, metrics.actualBoundingBoxAscent || 0),
      descent: Math.max(metrics.fontBoundingBoxDescent || 0, metrics.actualBoundingBoxDescent || 0) };
  };
}

export async function blobDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function embeddedFont(id: Exclude<FontId, 'system'>) {
  const { files, notice } = await getFont(id);
  const css = await Promise.all(files.map(async ({ url, weight, style }) => {
    const reply = await fetch(url);
    if (!reply.ok) throw new Error('Could not embed the font');
    const font = await blobDataURL(new Blob([await reply.arrayBuffer()], { type: 'font/woff2' }));
    return `@font-face{font-family:"${fontName(id)}";src:url(${font}) format("woff2");font-style:${style};font-weight:${weight}}`;
  }));
  return { css: css.join(''), notice };
}
