import { toBlob, validateOutput } from '../image/browser-codec';
import type { ImageResources } from '../image/resources';
import type { ImageLimits } from '../image/limits';
import { foreground } from './palette';

export const templates = {
  character: [1080, 1350],
  gallery: [1200, 1200],
  story: [1600, 900],
} as const;
export type Template = keyof typeof templates;
export type ShareOptions = {
  template: Template;
  title: string;
  signature: boolean;
  date: string;
  showDate: boolean;
  positions: { title: Anchor; brand: Anchor; date: Anchor };
  frames: Record<Template, Framing>;
  swatches: {
    shape: 'square' | 'rounded' | 'circle';
    labels: 'inside' | 'outside' | 'hidden';
    arrangement: 'equal' | 'spaced' | 'cards' | 'band';
    spacing: 'compact' | 'standard' | 'relaxed';
    limit: 'all' | '5' | '6';
  };
  decoration: 'none' | 'corners' | 'editorial' | 'soft';
};
export type Anchor = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type Framing = { zoom: number; x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };
const paper = { background: '#F7F8F9', ink: '#202428', muted: '#58616B', line: '#CDD2D7', panel: '#ECEFF2' };
export function localDate(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
export function shareDefaults(date = localDate()): ShareOptions {
  return {
    template: 'character', title: '', signature: true, date, showDate: false,
    positions: { title: 0, brand: 6, date: 8 },
    frames: { character: { zoom: 1, x: 0, y: 0 }, gallery: { zoom: 1, x: 0, y: 0 }, story: { zoom: 1, x: 0, y: 0 } },
    swatches: { shape: 'rounded', labels: 'outside', arrangement: 'spaced', spacing: 'standard', limit: 'all' },
    decoration: 'corners',
  };
}
export function visibleColors(colors: readonly string[], options: ShareOptions) {
  return colors.slice(0, options.swatches.limit === 'all' ? 10 : Number(options.swatches.limit));
}
/** Offsets are fractions of the template image box, independent of CSS/DPR. */
export function constrainFraming(source: {width: number; height: number}, box: Rect, frame: Framing): Framing {
  const zoom = Math.max(1, Math.min(4, Number.isFinite(frame.zoom) ? frame.zoom : 1));
  const scale = Math.max(box.w / source.width, box.h / source.height) * zoom;
  const maxX = Math.max(0, (source.width * scale - box.w) / (2 * box.w));
  const maxY = Math.max(0, (source.height * scale - box.h) / (2 * box.h));
  return { zoom, x: Math.max(-maxX, Math.min(maxX, frame.x || 0)), y: Math.max(-maxY, Math.min(maxY, frame.y || 0)) };
}
export function cover(source: {width: number; height: number}, box: Rect, frame: Framing): Rect {
  const f = constrainFraming(source, box, frame);
  const scale = Math.max(box.w / source.width, box.h / source.height) * f.zoom;
  const w = source.width * scale, h = source.height * scale;
  return { x: box.x + (box.w - w) / 2 + f.x * box.w, y: box.y + (box.h - h) / 2 + f.y * box.h, w, h };
}
export function zoomFraming(source: {width: number; height: number}, box: Rect, frame: Framing, zoom: number) {
  const previous = constrainFraming(source, box, frame), ratio = Math.max(1, Math.min(4, zoom)) / previous.zoom;
  return constrainFraming(source, box, { zoom, x: previous.x * ratio, y: previous.y * ratio });
}
export const fontFamily =
  '"DM Sans Variable", "Noto Sans SC Variable", "Segoe UI Emoji", sans-serif';
/** Same measured layout for exported pixels and the scaled PNG preview. */
export function titleLines(
  ctx: Pick<CanvasRenderingContext2D, 'measureText'>,
  text: string,
  width: number,
  max = 2,
) {
  let segments = [
    ...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(
      text.trim(),
    ),
  ].map((x) => x.segment);
  const lines: string[] = [];
  while (segments.length && lines.length < max) {
    let fit = 0;
    while (
      fit < segments.length &&
      ctx.measureText(segments.slice(0, fit + 1).join('')).width <= width
    )
      fit++;
    if (fit === segments.length) {
      lines.push(segments.join('').trim());
      break;
    }
    if (lines.length === max - 1) {
      while (
        fit &&
        ctx.measureText(segments.slice(0, fit).join('') + '…').width > width
      )
        fit--;
      lines.push(segments.slice(0, fit).join('').trimEnd() + '…');
      break;
    }
    let cut = Math.max(1, fit);
    // Prefer a word boundary for Latin text; CJK and long unbroken words still
    // wrap by measured graphemes, never splitting an Emoji sequence.
    if (
      /[A-Za-z0-9]/.test(segments[cut - 1]) &&
      /[A-Za-z0-9]/.test(segments[cut])
    ) {
      const space = segments
        .slice(0, cut)
        .findLastIndex((part) => /^\s$/.test(part));
      if (space > 0) cut = space + 1;
    }
    lines.push(segments.slice(0, cut).join('').trim());
    segments = segments.slice(cut);
    while (segments.length && /^\s$/.test(segments[0])) segments.shift();
  }
  return lines;
}
export function templateLayout(template: Template, count: number, swatches = shareDefaults().swatches) {
  if (count < 1 || count > 10) throw new Error('palette');
  const [width, height] = templates[template];
  const image = template === 'character' ? { x: 0, y: 0, w: 1080, h: 820 }
    : template === 'gallery' ? { x: 32, y: 32, w: 1136, h: 708 }
    : { x: 0, y: 0, w: 1600, h: 580 };
  const info = template === 'character' ? { x: 48, y: 852, w: 984, h: 218 }
    : template === 'gallery' ? { x: 48, y: 766, w: 1104, h: 214 }
    : { x: 48, y: 600, w: 1504, h: 144 };
  const palette = template === 'character' ? { x: 48, y: 1094, w: 984, h: 184 }
    : template === 'gallery' ? { x: 48, y: 1008, w: 1104, h: 144 }
    : { x: 48, y: 764, w: 1504, h: 108 };
  const band = swatches.arrangement === 'band';
  const gap = swatches.arrangement === 'equal' || band ? 0 : { compact: 6, standard: 14, relaxed: 22 }[swatches.spacing];
  const rowHeight = (palette.h - gap) / 2;
  const blockHeight = rowHeight - (swatches.arrangement === 'cards' ? 20 : 0) - (swatches.labels === 'outside' ? Math.min(26, rowHeight * .28) : 0);
  // Do not turn circles/cards into tiny dots merely to force two rows.
  const columns = template === 'story' || band || count <= 6 || blockHeight < 64 ? count : Math.ceil(count / 2);
  const rows = Math.ceil(count / columns);
  const w = (palette.w - (columns - 1) * gap) / columns, h = (palette.h - (rows - 1) * gap) / rows;
  const colors = Array.from({ length: count }, (_, i) => ({ x: palette.x + (i % columns) * (w + gap), y: palette.y + Math.floor(i / columns) * (h + gap), w, h }));
  return { width, height, image, info, palette, colors };
}
let fontKey = '', fontPromise: Promise<void> | undefined;
async function fonts(title = '') {
  const latin = '#0123456789ABCDEF Tool4Furry ' + title,
    chinese = '配色' + title;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const loaded = await Promise.race([
      Promise.all([
        document.fonts.load('600 40px "DM Sans Variable"', latin),
        document.fonts.load('600 40px "Noto Sans SC Variable"', chinese),
      ]),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('fonts')), 10000);
      }),
    ]);
    // Noto uses unicode-range subsets: check the same glyphs we loaded, not
    // unrelated unloaded subsets selected by FontFaceSet.check's default text.
    if (
      loaded.some(
        (faces) =>
          !faces.length || faces.some((face) => face.status !== 'loaded'),
      )
    )
      throw new Error('fonts');
  } finally {
    clearTimeout(timer);
  }
}
let logoPromise: Promise<HTMLImageElement> | undefined;
function loadLogo() {
  if (!logoPromise) logoPromise = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const timer = setTimeout(() => { image.src = ''; reject(new Error('logo')); }, 10000);
    image.onload = () => { clearTimeout(timer); resolve(image); };
    image.onerror = () => { clearTimeout(timer); reject(new Error('logo')); };
    image.src = '/brand/tool4furry-horizontal.svg';
  }).catch(error => { logoPromise = undefined; throw error; });
  return logoPromise;
}
export async function loadShareAssets(title: string, signature: boolean) {
  if (fontKey !== title || !fontPromise) {
    fontKey = title;
    fontPromise = fonts(title).catch(error => { fontPromise = undefined; throw error; });
  }
  const [, logo] = await Promise.all([fontPromise, signature ? loadLogo() : undefined]);
  return { logo };
}
type Assets = Awaited<ReturnType<typeof loadShareAssets>>;
export type InfoItem = Rect & { kind: 'title' | 'brand' | 'date'; lines: string[]; font: number; align: CanvasTextAlign };
/** Three row bands grow to fit their contents. Collisions stack in title/brand/date order. */
export function informationLayout(ctx: Pick<CanvasRenderingContext2D, 'measureText' | 'font'>, options: ShareOptions, box: Rect): InfoItem[] {
  const wide = options.template === 'story', cellWidth = (box.w - 32) / 3;
  const titleFont = wide ? 28 : options.template === 'gallery' ? 32 : 34;
  ctx.font = `600 ${titleFont}px ${fontFamily}`;
  const definitions = [
    { kind: 'title' as const, active: !!options.title.trim(), lines: titleLines(ctx, options.title, cellWidth, wide ? 1 : 2), font: titleFont, h: 0 },
    { kind: 'brand' as const, active: options.signature, lines: [], font: wide ? 12 : 14, h: wide ? 54 : 68 },
    { kind: 'date' as const, active: options.showDate, lines: [options.date], font: wide ? 18 : 20, h: wide ? 22 : 24 },
  ].filter(item => item.active).map(item => ({ ...item, h: item.kind === 'title' ? item.lines.length * titleFont * 1.2 : item.h }));
  const groups = Array.from({length: 9}, (_, anchor) => definitions.filter(item => options.positions[item.kind] === anchor));
  const gap = wide ? 6 : 8, rowGap = 8;
  const heights = Array.from({length: 3}, (_, row) => Math.max(0, ...groups.slice(row * 3, row * 3 + 3).map(items => items.reduce((n, item) => n + item.h, 0) + Math.max(0, items.length - 1) * gap)));
  const extra = Math.max(0, (box.h - heights.reduce((a, b) => a + b, 0) - 2 * rowGap) / 3);
  const output: InfoItem[] = [];
  let top = box.y;
  heights.forEach((height, row) => {
    const bandHeight = height + extra;
    for (let col = 0; col < 3; col++) {
      const items = groups[row * 3 + col], total = items.reduce((n, item) => n + item.h, 0) + Math.max(0, items.length - 1) * gap;
      let y = top + (row === 0 ? 0 : row === 1 ? (bandHeight - total) / 2 : bandHeight - total);
      for (const item of items) {
        output.push({ ...item, x: box.x + col * (cellWidth + 16), y, w: cellWidth, h: item.h, align: col === 0 ? 'left' : col === 1 ? 'center' : 'right' });
        y += item.h + gap;
      }
    }
    top += bandHeight + rowGap;
  });
  return output;
}
export function swatchGeometry(rect: Rect, options: ShareOptions) {
  const { shape, labels, arrangement } = options.swatches;
  const padding = arrangement === 'cards' ? 10 : 0;
  const labelHeight = labels === 'outside' ? Math.min(26, rect.h * .28) : 0;
  const available = { x: rect.x + padding, y: rect.y + padding, w: rect.w - 2 * padding, h: rect.h - 2 * padding - labelHeight };
  const band = arrangement === 'band' && shape !== 'circle';
  const side = Math.min(available.w, available.h);
  const block = band ? available : { x: available.x + (available.w - side) / 2, y: available.y, w: side, h: side };
  return { block, radius: shape === 'circle' ? side / 2 : shape === 'rounded' ? Math.min(14, block.h * .18) : 0, labelHeight, labelY: block.y + block.h + labelHeight / 2 };
}
function decoration(ctx: CanvasRenderingContext2D, options: ShareOptions, layout: ReturnType<typeof templateLayout>) {
  if (options.decoration === 'none') return;
  const {width, height, image} = layout, left = 20, top = image.y + image.h + 18, right = width - 20, bottom = height - 16;
  ctx.save(); ctx.strokeStyle = paper.line; ctx.lineWidth = options.decoration === 'soft' ? 4 : 3;
  ctx.lineCap = options.decoration === 'soft' ? 'round' : 'butt';
  ctx.beginPath(); ctx.moveTo(left, top + 22); ctx.lineTo(left, top); ctx.lineTo(left + 62, top);
  ctx.moveTo(right - 54, bottom); ctx.lineTo(right, bottom); ctx.lineTo(right, bottom - 22); ctx.stroke();
  ctx.setLineDash(options.decoration === 'soft' ? [2, 7] : [6, 5]); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(left + 66, top); ctx.lineTo(left + 136, top); ctx.moveTo(right - 128, bottom); ctx.lineTo(right - 58, bottom); ctx.stroke();
  if (options.decoration === 'editorial') {
    ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(48, layout.palette.y - 12); ctx.lineTo(width - 48, layout.palette.y - 12); ctx.stroke();
  }
  ctx.restore();
}
/** Draw in full template coordinates. Both preview and export call this function. */
export function drawShare(ctx: CanvasRenderingContext2D, image: HTMLCanvasElement, colors: readonly string[], options: ShareOptions, assets: Assets) {
  const palette = visibleColors(colors, options), layout = templateLayout(options.template, palette.length, options.swatches);
  ctx.save();
  try {
    ctx.fillStyle = paper.background; ctx.fillRect(0, 0, layout.width, layout.height);
    const target = cover(image, layout.image, options.frames[options.template]);
    ctx.save();
    try {
      ctx.beginPath(); ctx.rect(layout.image.x, layout.image.y, layout.image.w, layout.image.h); ctx.clip();
      ctx.fillStyle = paper.panel; ctx.fillRect(layout.image.x, layout.image.y, layout.image.w, layout.image.h);
      ctx.drawImage(image, target.x, target.y, target.w, target.h);
    } finally { ctx.restore(); }
    ctx.textBaseline = 'middle';
    for (const item of informationLayout(ctx, options, layout.info)) {
      const x = item.x + (item.align === 'left' ? 0 : item.align === 'center' ? item.w / 2 : item.w);
      ctx.textAlign = item.align;
      if (item.kind === 'brand') {
        if (!assets.logo) throw new Error('logo');
        const w = Math.min(item.w, options.template === 'story' ? 132 : 176), h = w * 72 / 269.93794;
        const left = x - (item.align === 'center' ? w / 2 : item.align === 'right' ? w : 0);
        ctx.drawImage(assets.logo, left, item.y, w, h);
        ctx.font = `400 ${item.font}px ${fontFamily}`; ctx.fillStyle = paper.muted;
        ctx.fillText('Palette Extractor', x, item.y + h + 12);
      } else {
        ctx.fillStyle = item.kind === 'title' ? paper.ink : paper.muted;
        ctx.font = `${item.kind === 'title' ? 600 : 400} ${item.font}px ${fontFamily}`;
        item.lines.forEach((line, i) => ctx.fillText(line, x, item.y + item.font * .6 + i * item.font * 1.2));
      }
    }
    palette.forEach((hex, i) => {
      const r = layout.colors[i], {block, radius, labelHeight, labelY} = swatchGeometry(r, options);
      if (options.swatches.arrangement === 'cards') { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(r.x, r.y, r.w, r.h); }
      ctx.fillStyle = hex; ctx.beginPath(); ctx.roundRect(block.x, block.y, block.w, block.h, radius); ctx.fill();
      if (options.swatches.labels === 'hidden') return;
      const inside = options.swatches.labels === 'inside';
      const label = options.template === 'gallery' && !inside ? `${String(i + 1).padStart(2, '0')}  ${hex}` : hex;
      const available = inside ? block.w * (options.swatches.shape === 'circle' ? .8 : .9) : r.w - 8;
      let font = Math.min(options.template === 'story' ? 21 : 22, inside ? block.h * .26 : labelHeight * .76);
      ctx.font = `600 ${font}px ${fontFamily}`;
      while (font > 8 && ctx.measureText(label).width > available) { font--; ctx.font = `600 ${font}px ${fontFamily}`; }
      ctx.fillStyle = inside ? foreground(hex) : paper.ink; ctx.textAlign = 'center';
      ctx.fillText(label, inside ? block.x + block.w / 2 : r.x + r.w / 2, inside ? block.y + block.h / 2 : labelY);
    });
    decoration(ctx, options, layout);
  } finally { ctx.restore(); }
  return layout;
}
export async function renderPalette(
  image: HTMLCanvasElement | undefined,
  colors: readonly string[],
  options: ShareOptions | undefined,
  resources: ImageResources,
  limits: ImageLimits,
  valid: () => boolean = () => true,
) {
  if (colors.length < 1 || colors.length > 10) throw new Error('palette');
  const assets = await loadShareAssets(options?.title ?? '', options?.signature ?? false);
  if (!valid()) throw new Error('stale');
  const layout = options
    ? templateLayout(options.template, visibleColors(colors, options).length, options.swatches)
    : undefined;
  const width = layout?.width ?? colors.length * 180,
    height = layout?.height ?? 240;
  const canvas = resources.canvas(width, height);
  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('draw');
    ctx.fillStyle = '#F0F1EE';
    ctx.fillRect(0, 0, width, height);
    ctx.textBaseline = 'middle';
    if (options && layout) {
      if (!image?.width || !image.height) throw new Error('draw');
      drawShare(ctx, image, colors, options, assets);
    } else colors.forEach((hex, i) => {
      const r = { x: i * 180, y: 0, w: 180, h: 240 };
      ctx.fillStyle = hex;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = foreground(hex);
      ctx.textAlign = 'center';
      ctx.font = `600 23px ${fontFamily}`;
      ctx.fillText(hex, r.x + r.w / 2, r.y + r.h - 35);
    });
    const blob = await toBlob(canvas, 'image/png');
    if (!valid()) throw new Error('stale');
    const checked = await validateOutput(
      blob,
      'png',
      width,
      height,
      resources,
      limits,
    );
    if (!valid()) throw new Error('stale');
    return checked;
  } finally {
    resources.release(canvas);
  }
}
