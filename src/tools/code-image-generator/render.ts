import { fail } from '../general/bounds';
import { toBlob } from '../image/browser-codec';
import { inspectImage } from '../image/inspect-image';
import { gradientLine, jpegMatte, maxEdge, maxPixels, outputSize, type Box, type CodeImageScene, type Shape } from './core';
import { blobDataURL, canvasFont, embeddedFont, fontName } from './fonts';
import type { FontId, OutputFormat, Scale } from './settings';

function frame(canvas: HTMLCanvasElement, width: number, height: number) {
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) fail('浏览器无法创建画布。', 'The browser could not create a canvas.');
  return context;
}

export function paintCanvas(canvas: HTMLCanvasElement, scene: CodeImageScene, font: FontId, scaledWidth: number, scaledHeight: number, matte?: string) {
  const { width, height, background, canvasPhoto, window, windowRadius, windowOpacity, windowPhoto } = scene;
  const ctx = frame(canvas, scaledWidth, scaledHeight);
  ctx.scale(scaledWidth / width, scaledHeight / height);
  if (matte) {
    ctx.fillStyle = matte;
    ctx.fillRect(0, 0, width, height);
  }
  if (canvasPhoto) {
    const { bitmap, bounds } = canvasPhoto;
    ctx.drawImage(bitmap, bounds.x, bounds.y, bounds.width, bounds.height);
  }
  if (background.kind === 'linear' || background.kind === 'radial') {
    const gradient = background.kind === 'linear'
      ? ctx.createLinearGradient(...gradientLine(width, height, background.angle))
      : ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.hypot(width, height) / 2);
    gradient.addColorStop(0, background.first);
    gradient.addColorStop(1, background.second);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }
  if (background.kind === 'solid') {
    ctx.fillStyle = background.first;
    ctx.fillRect(0, 0, width, height);
  }
  const roundWindow = () => ctx.roundRect(window.x, window.y, window.width, window.height, windowRadius);
  if (scene.shadows.length) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    roundWindow();
    ctx.clip('evenodd');
    scene.shadows.forEach(shape => paintShape(ctx, shape));
    ctx.restore();
  }
  if (windowOpacity > 0) {
    ctx.save();
    ctx.globalAlpha = windowOpacity;
    ctx.beginPath();
    roundWindow();
    if (windowPhoto) {
      const { bitmap, bounds } = windowPhoto;
      ctx.clip();
      ctx.drawImage(bitmap, bounds.x, bounds.y, bounds.width, bounds.height);
    } else {
      ctx.fillStyle = scene.windowColor;
      ctx.fill();
    }
    ctx.restore();
  }
  scene.shapes.forEach(shape => paintShape(ctx, shape));
  ctx.direction = 'ltr';
  ctx.textBaseline = 'alphabetic';
  ctx.fontKerning = 'none';
  for (const run of scene.text) {
    ctx.font = canvasFont(font, run.size, run);
    ctx.fillStyle = run.color;
    ctx.globalAlpha = run.opacity ?? 1;
    ctx.fillText(run.text, run.x, run.y);
  }
}

function paintShape(ctx: CanvasRenderingContext2D, shape: Shape) {
  ctx.globalAlpha = shape.opacity ?? 1;
  ctx.fillStyle = ctx.strokeStyle = shape.color;
  ctx.beginPath();
  if (shape.kind === 'rect') {
    ctx.roundRect(shape.x, shape.y, shape.width, shape.height, shape.radius ?? 0);
    ctx.fill();
  } else if (shape.kind === 'dot') {
    ctx.arc(shape.x, shape.y, shape.radius, 0, 2 * Math.PI);
    ctx.fill();
  } else {
    ctx.moveTo(shape.x, shape.y);
    ctx.lineTo(shape.endX, shape.endY);
    ctx.stroke();
  }
}

const xml = (text: string) => text.replace(/[&<>"']/g, character =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]!);
const n = (number: number) => String(+number.toFixed(4));
const paint = (key: string, color: string, opacity = 1) => `${key}="${xml(color)}" opacity="${n(opacity)}"`;
const svgBox = ({ x, y, width, height }: Box) =>
  `x="${n(x)}" y="${n(y)}" width="${n(width)}" height="${n(height)}"`;

function svgShape(shape: Shape) {
  if (shape.kind === 'rect') {
    return `<rect ${svgBox(shape)} rx="${n(shape.radius ?? 0)}" ${paint('fill', shape.color, shape.opacity)}/>`;
  }
  if (shape.kind === 'dot') {
    return `<circle cx="${n(shape.x)}" cy="${n(shape.y)}" r="${n(shape.radius)}" ${paint('fill', shape.color, shape.opacity)}/>`;
  }
  return `<line x1="${n(shape.x)}" y1="${n(shape.y)}" x2="${n(shape.endX)}" y2="${n(shape.endY)}" ${paint('stroke', shape.color, shape.opacity)}/>`;
}

async function svgBackground({ background, width, height, canvasPhoto }: CodeImageScene) {
  const whole = (fill: string) => `<rect width="${width}" height="${height}" fill="${xml(fill)}"/>`;
  if (background.kind === 'solid') return whole(background.first);
  if (background.kind === 'linear' || background.kind === 'radial') {
    const stops = `<stop stop-color="${xml(background.first)}"/><stop offset="1" stop-color="${xml(background.second)}"/>`;
    // Use the same gradient geometry as Canvas.
    const [x1, y1, x2, y2] = gradientLine(width, height, background.angle);
    const gradient = background.kind === 'linear'
      ? `<linearGradient id="background" gradientUnits="userSpaceOnUse" x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}">${stops}</linearGradient>`
      : `<radialGradient id="background" gradientUnits="userSpaceOnUse" cx="${width / 2}" cy="${height / 2}" r="${n(Math.hypot(width, height) / 2)}">${stops}</radialGradient>`;
    return '<defs>' + gradient + '</defs>' + whole('url(#background)');
  }
  return canvasPhoto ? svgPhoto(canvasPhoto) : '';
}

async function svgPhoto({ bitmap, bounds }: NonNullable<CodeImageScene['canvasPhoto']>, attributes = '') {
  const scale = Math.min(1, 4096 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  try {
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    frame(canvas, width, height).drawImage(bitmap, 0, 0, width, height);
    const data = await blobDataURL(await toBlob(canvas, 'image/png'));
    return `<image ${svgBox(bounds)} preserveAspectRatio="none" href="${data}"${attributes}/>`;
  } finally {
    canvas.width = canvas.height = 0;
  }
}

async function svgWindow({ width, height, window, windowRadius, windowColor, windowOpacity, windowPhoto, shadows }: CodeImageScene) {
  const outline = `${svgBox(window)} rx="${n(windowRadius)}"`;
  const shadow = !shadows.length ? '' :
    `<defs><mask id="window-shadow" maskUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${height}">` +
    `<rect width="${width}" height="${height}" fill="white"/><rect ${outline} fill="black"/></mask></defs>` +
    `<g mask="url(#window-shadow)">${shadows.map(svgShape).join('')}</g>`;
  if (windowOpacity === 0) return shadow;
  if (!windowPhoto) return shadow + `<rect ${outline} ${paint('fill', windowColor, windowOpacity)}/>`;
  const clip = `<defs><clipPath id="window-photo"><rect ${outline}/></clipPath></defs>`;
  return shadow + clip + await svgPhoto(windowPhoto, ` clip-path="url(#window-photo)" opacity="${n(windowOpacity)}"`);
}

export async function renderSvg(scene: CodeImageScene, font: FontId) {
  if (!scene.vectorSafe || font === 'system') {
    fail('当前文字需要系统回退字体。SVG 需使用本地字体与基本拉丁字符，可改用 PNG。',
      'SVG requires a bundled font and basic Latin text. Use PNG if the artwork needs other characters or system fonts.');
  }
  const [face, background, window] = await Promise.all([embeddedFont(font), svgBackground(scene), svgWindow(scene)]);
  const runs = scene.text.map(run => `<text x="${n(run.x)}" y="${n(run.y)}" font-size="${run.size}" font-weight="${run.bold ? 700 : 400}" font-style="${run.italic ? 'italic' : 'normal'}" ${paint('fill', run.color, run.opacity)}>${xml(run.text)}</text>`).join('');
  return new Blob([
    `<svg xmlns="http://www.w3.org/2000/svg" width="${scene.width}" height="${scene.height}" viewBox="0 0 ${scene.width} ${scene.height}" overflow="hidden">`,
    `<metadata>${xml(face.notice)}</metadata><style>${face.css}</style>`, background, window, scene.shapes.map(svgShape).join(''),
    `<g xml:space="preserve" font-family="${xml(fontName(font))}" direction="ltr" style="font-kerning:none;font-variant-ligatures:none;font-feature-settings:'liga' 0,'calt' 0">${runs}</g></svg>`,
  ], { type: 'image/svg+xml' });
}

const imageLimits = { bytes: maxPixels * 5 + 1024 ** 2, pixels: maxPixels, edge: maxEdge, files: 1, totalBytes: maxPixels * 5 + 1024 ** 2 };

export async function renderRaster(scene: CodeImageScene, font: FontId, scale: Scale, format: Exclude<OutputFormat, 'svg'>, quality: number) {
  const { width, height } = outputSize(scene.width, scene.height, scale);
  const type = `image/${format}`;
  const canvas = document.createElement('canvas');
  try {
    paintCanvas(canvas, scene, font, width, height, format === 'jpeg' ? jpegMatte : undefined);
    const blob = await toBlob(canvas, type, quality);
    if (blob.type !== type) fail('浏览器无法编码所选格式。', 'This browser cannot encode the selected format.');
    const info = await inspectImage(blob, imageLimits.bytes, imageLimits);
    if (info.format !== format || info.width !== width || info.height !== height) {
      fail('图片格式或尺寸验证失败。请调整设置后重试。', 'The encoded format or dimensions could not be verified. Try different settings.');
    }
    return blob;
  } finally {
    canvas.width = canvas.height = 0;
  }
}

export async function webpSupported() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  try { return (await toBlob(canvas, 'image/webp')).type === 'image/webp'; }
  catch { return false; }
  finally { canvas.width = canvas.height = 0; }
}
