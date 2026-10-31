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
};
type Rect = { x: number; y: number; w: number; h: number };
export const fontFamily =
  '"DM Sans Variable", "Noto Sans SC Variable", "Segoe UI Emoji", sans-serif';
export function contain(
  source: { width: number; height: number },
  r: Rect,
): Rect {
  const scale = Math.min(r.w / source.width, r.h / source.height);
  const w = source.width * scale,
    h = source.height * scale;
  return { x: r.x + (r.w - w) / 2, y: r.y + (r.h - h) / 2, w, h };
}
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
export function templateLayout(template: Template, count: number) {
  if (count < 1 || count > 10) throw new Error('palette');
  const [width, height] = templates[template];
  const image: Rect =
    template === 'character'
      ? { x: 56, y: 48, w: 968, h: 780 }
      : template === 'gallery'
        ? { x: 48, y: 170, w: 708, h: 924 }
        : { x: 56, y: 170, w: 1488, h: 500 };
  const colors = Array.from({ length: count }, (_, i): Rect => {
    if (template === 'gallery')
      return {
        x: 812,
        y: 170 + i * (924 / count),
        w: 340,
        h: 924 / count - 10,
      };
    if (template === 'story')
      return { x: (i * width) / count, y: 716, w: width / count, h: 140 };
    const columns = count <= 6 ? count : Math.ceil(count / 2),
      rows = Math.ceil(count / columns),
      w = 968 / columns;
    return {
      x: 56 + (i % columns) * w,
      y: 1090 + Math.floor(i / columns) * (196 / rows),
      w: w - 8,
      h: 196 / rows - 10,
    };
  });
  return { width, height, image, colors };
}
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
export async function renderPalette(
  image: HTMLCanvasElement | undefined,
  colors: readonly string[],
  options: ShareOptions | undefined,
  resources: ImageResources,
  limits: ImageLimits,
  valid: () => boolean = () => true,
) {
  if (colors.length < 1 || colors.length > 10) throw new Error('palette');
  await fonts(options?.title);
  if (!valid()) throw new Error('stale');
  const layout = options
    ? templateLayout(options.template, colors.length)
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
      const target = contain(image, layout.image);
      ctx.fillStyle = '#E1E4E0';
      ctx.fillRect(
        layout.image.x,
        layout.image.y,
        layout.image.w,
        layout.image.h,
      );
      ctx.drawImage(image, target.x, target.y, target.w, target.h);
      ctx.fillStyle = '#29312F';
      ctx.font = `600 40px ${fontFamily}`;
      const top = options.template === 'character' ? 900 : 68;
      titleLines(ctx, options.title, width - 112).forEach((line, i) =>
        ctx.fillText(line, 56, top + i * 52),
      );
      if (options.signature) {
        ctx.font = `400 18px ${fontFamily}`;
        ctx.fillStyle = '#58645E';
        ctx.fillText('Tool4Furry', 56, height - 26);
      }
    }
    colors.forEach((hex, i) => {
      const r = layout?.colors[i] ?? { x: i * 180, y: 0, w: 180, h: 240 };
      ctx.fillStyle = hex;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = foreground(hex);
      ctx.textAlign = 'center';
      ctx.font = `600 ${layout ? 22 : 23}px ${fontFamily}`;
      const label =
        options?.template === 'gallery'
          ? `${String(i + 1).padStart(2, '0')}  ${hex}`
          : hex;
      ctx.fillText(label, r.x + r.w / 2, r.y + r.h - (layout ? 24 : 35));
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
