import { fail } from '../general/bounds';
import type { Highlight, HighlightToken } from './highlight-data';
import type { Background, CodeImageSettings, PhotoPlacement, Scale } from './settings';

export const maxEdge = 8192;
export const maxPixels = 40_000_000;
export const jpegMatte = '#ffffff';
const autoCodeWidth = 1060;
const ratios = { '1:1': [1, 1], '4:3': [4, 3], '16:9': [16, 9], '4:5': [4, 5] } as const;

export type FontStyle = { bold: boolean; italic: boolean };
type Metrics = { width: number; ascent: number; descent: number };
export type Measure = (text: string, size: number, style: FontStyle) => Metrics;
export type Box = { x: number; y: number; width: number; height: number };
type Paint = { color: string; opacity?: number };
export type TextPaint = Paint & FontStyle & { text: string; size: number; x: number; y: number };
export type Shape =
  | (Box & Paint & { kind: 'rect'; radius?: number })
  | (Paint & { kind: 'dot'; x: number; y: number; radius: number })
  | (Paint & { kind: 'line'; x: number; y: number; endX: number; endY: number });
type CodeImageLayout = {
  width: number;
  height: number;
  window: Box;
  windowRadius: number;
  windowColor: string;
  shadows: Shape[];
  shapes: Shape[];
  text: TextPaint[];
  vectorSafe: boolean;
};
type PhotoSize = { width: number; height: number };
type Photo = { bitmap: ImageBitmap; placement: PhotoPlacement };
type PlacedPhoto = Photo & ReturnType<typeof placePhoto>;
export type CodeImageScene = CodeImageLayout & {
  background: Background;
  canvasPhoto?: PlacedPhoto;
  windowPhoto?: PlacedPhoto;
  windowOpacity: number;
};

export function outputSize(width: number, height: number, scale: Scale) {
  width *= scale;
  height *= scale;
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1 ||
      Math.max(width, height) > maxEdge || width * height > maxPixels) {
    fail('图片超出 8192 px 边长或 4000 万像素。请降低倍率、缩短代码或调整排版。',
      'The image exceeds 8,192 px per side or 40 megapixels. Reduce the scale or adjust the code layout.');
  }
  return { width, height };
}

function fitError(): never {
  return fail('指定画布放不下完整代码。请放大画布、调低字号或启用换行。',
    'The full code does not fit this canvas. Increase its size, reduce the font size or enable wrapping.');
}

export function lineRanges(input: string) {
  return input.split(/[,，\s]+/u).flatMap(part => {
    const match = /^(\d+)(?:[-–](\d+))?$/.exec(part);
    if (!match) return [];
    const first = Number(match[1]);
    const last = match[2] ? Number(match[2]) : first;
    return Number.isSafeInteger(first) && Number.isSafeInteger(last) && first > 0 && last >= first
      ? [[first, last] as const] : [];
  });
}

type Row = { sourceLine: number; continuation: boolean; width: number; runs: (Omit<TextPaint, 'y'> & { style: number; width: number })[] };
const regular: FontStyle = { bold: false, italic: false };
const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
const fromToken = (style: number): FontStyle => ({ italic: Boolean(style & 1), bold: Boolean(style & 2) });

function rowsFor(lines: HighlightToken[][], settings: CodeImageSettings, measure: Measure, limit: number, rowLimit: number): Row[] {
  const rows: Row[] = [];
  const size = settings.fontSize;
  const tab = measure(' ', size, regular).width * settings.tabWidth;

  lines.forEach((tokens, index) => {
    let row: Row;
    const nextRow = (continuation: boolean) => {
      if (rows.length >= rowLimit) fitError();
      row = { sourceLine: index + 1, continuation, width: 0, runs: [] };
      rows.push(row);
    };
    nextRow(false);
    for (const { text, color, style } of tokens) {
      const fontStyle = fromToken(style);
      const parts = text.split('\t');
      parts.forEach((part, partIndex) => {
        if (partIndex) {
          const target = (Math.floor(row.width / tab + 1e-7) + 1) * tab;
          if (settings.wrap && target > limit) {
            if (tab > limit) fitError();
            nextRow(true);
            row.width = tab;
          } else row.width = target;
        }
        if (!part) return;
        const add = (chunk: string, width: number) => {
          row.runs.push({ text: chunk, color, ...fontStyle, style, size, x: row.width, width });
          row.width += width;
        };
        // Measure complete spans to preserve shaping, even when their characters share a fallback font.
        const width = measure(part, size, fontStyle).width;
        if (row.width + width <= limit || !settings.wrap) {
          add(part, width);
          return;
        }
        let buffer = '', bufferWidth = 0;
        for (const { segment } of segmenter.segment(part)) {
          const proposed = buffer + segment;
          const measured = measure(proposed, size, fontStyle).width;
          if (row.width + measured <= limit) {
            buffer = proposed;
            bufferWidth = measured;
            continue;
          }
          if (buffer) add(buffer, bufferWidth);
          if (row.width) nextRow(true);
          buffer = segment;
          bufferWidth = measure(segment, size, fontStyle).width;
          if (bufferWidth > limit) fitError();
        }
        if (buffer) add(buffer, bufferWidth);
      });
    }
  });

  return rows;
}

export function layoutCode(highlight: Highlight, settings: CodeImageSettings, measure: Measure, photo?: PhotoSize): CodeImageLayout {
  const { fontSize: size, margin, padding, title } = settings;
  const titleSize = 12;
  const hasTitle = settings.titleBar && settings.style !== 'minimal';
  const titleHeight = hasTitle ? 34 : 0;
  const topPadding = hasTitle ? Math.ceil(padding * 0.6) : padding;
  const titleGuard = hasTitle ? measure(title, titleSize, regular).width + 164 : 0;
  const metrics = measure('Mg', size, regular);
  const initialRowHeight = Math.ceil(Math.max(size * settings.lineHeight, metrics.ascent + metrics.descent));
  const markers = [
    { ranges: lineRanges(settings.removed), color: '#e16c78', sign: '-' },
    { ranges: lineRanges(settings.added), color: '#43bd88', sign: '+' },
    { ranges: lineRanges(settings.emphasized), color: '#ac83e3' },
  ].map(marker => ({ ...marker, ranges: marker.ranges.filter(([first]) => first <= highlight.lines.length) }));
  const hasMarks = markers.some(marker => marker.ranges.length);
  const markerGutter = markers.some(marker => marker.sign && marker.ranges.length) ? measure('+', size - 1, regular).width + 8 : 0;
  const numberGutter = settings.lines ? measure(String(settings.firstLine + highlight.lines.length - 1), size - 1, regular).width + 20 : 0;
  const gutter = markerGutter + numberGutter;
  const fixed = settings.size === 'custom';
  const photoAspect = settings.size === 'auto' && photo;
  const horizontal = (margin + padding) * 2 + gutter + 3; // room for slanted glyphs
  const vertical = margin * 2 + padding + topPadding + titleHeight;
  if (fixed) outputSize(settings.width, settings.height, 1);
  const preferredWidth = Math.max(520, titleGuard + margin * 2, horizontal + size * 12);
  const limit = fixed ? settings.width - horizontal : photoAspect && photoAspect.width < photoAspect.height
    ? Math.min(autoCodeWidth, preferredWidth - horizontal) : autoCodeWidth;
  const rowLimit = Math.floor(((fixed ? settings.height : maxEdge) - vertical) / initialRowHeight);
  if (limit < 1 || rowLimit < 1) fitError();

  const rows = rowsFor(highlight.lines, settings, measure, limit, rowLimit);
  for (const row of rows) {
    for (const run of row.runs) {
      const sample = measure(run.text, size, run);
      metrics.ascent = Math.max(metrics.ascent, sample.ascent);
      metrics.descent = Math.max(metrics.descent, sample.descent);
    }
  }
  const rowHeight = Math.ceil(Math.max(initialRowHeight, metrics.ascent + metrics.descent));
  const baseline = (rowHeight + metrics.ascent - metrics.descent) / 2;
  const widest = rows.reduce((max, row) => Math.max(max, row.width), 0);
  const neededW = Math.ceil(Math.max(widest + horizontal, titleGuard + margin * 2));
  const neededH = rows.length * rowHeight + vertical;
  let width = Math.max(460, neededW), height = Math.max(190, neededH);
  if (fixed) {
    if (neededW > settings.width || neededH > settings.height) fitError();
    width = settings.width;
    height = settings.height;
  } else if (photoAspect) {
    const scale = Math.max(width / photoAspect.width, height / photoAspect.height);
    width = Math.round(photoAspect.width * scale);
    height = Math.round(photoAspect.height * scale);
  } else if (settings.size !== 'auto' && settings.size !== 'custom') {
    const [x, y] = ratios[settings.size];
    const unit = Math.ceil(Math.max(width / x, height / y));
    width = unit * x;
    height = unit * y;
  }
  outputSize(width, height, 1);

  const window = photoAspect
    ? { x: (width - neededW) / 2 + margin, y: (height - neededH) / 2 + margin, width: neededW - margin * 2, height: neededH - margin * 2 }
    : { x: margin, y: margin, width: width - margin * 2, height: height - margin * 2 };
  const radius = Math.min(settings.radius, window.width / 2, window.height / 2);
  const shadows: Shape[] = [];
  const shapes: Shape[] = [];
  const text: TextPaint[] = [];
  const muted = highlight.foreground;
  const addText = (value: string, x: number, y: number, size: number, color: string, opacity = 1) =>
    text.push({ text: value, x, y, size, color, opacity, ...regular });
  if (settings.shadow) {
    for (const [offset, opacity] of [[11, 0.045], [9, 0.05], [7, 0.035], [5, 0.029]]) {
      shadows.push({ kind: 'rect', ...window, y: window.y + offset, radius: radius + 1, color: '#141025', opacity });
    }
  }
  if (hasTitle) {
    const centerY = window.y + 19;
    if (settings.style === 'macos') {
      ['#ee827d', '#ecc078', '#8bbd9d'].forEach((color, index) =>
        shapes.push({ kind: 'dot', color, x: window.x + 18 + index * 13, y: centerY, radius: 4 }));
    } else {
      const right = window.x + window.width - 17;
      const stroke = (x: number, y: number, endX: number, endY: number) =>
        shapes.push({ kind: 'line', x, y, endX, endY, color: muted, opacity: 0.73 });
      stroke(right - 45, centerY + 2, right - 35, centerY + 2);
      stroke(right - 26, centerY - 4, right - 18, centerY - 4);
      stroke(right - 18, centerY - 4, right - 18, centerY + 4);
      stroke(right - 18, centerY + 4, right - 26, centerY + 4);
      stroke(right - 26, centerY + 4, right - 26, centerY - 4);
      stroke(right - 6, centerY - 4, right + 2, centerY + 4);
      stroke(right + 2, centerY - 4, right - 6, centerY + 4);
    }
    if (title) {
      const x = settings.style === 'macos' ? window.x + (window.width - measure(title, titleSize, regular).width) / 2 : window.x + 16;
      addText(title, x, centerY + 4, titleSize, muted, 0.68);
    }
  }

  const left = window.x + padding;
  const top = window.y + titleHeight + topPadding;
  rows.forEach((row, index) => {
    const y = top + index * rowHeight;
    const marker = markers.find(item => item.ranges.some(([from, to]) => row.sourceLine >= from && row.sourceLine <= to));
    const opacity = settings.dim && !marker && hasMarks ? 0.38 : 1;
    if (marker) {
      shapes.push({ kind: 'rect', x: left - 6, y, width: window.width - padding * 2 + 12, height: rowHeight, radius: 4, color: marker.color, opacity: 0.16 });
      shapes.push({ kind: 'rect', x: left - 6, y, width: 2, height: rowHeight, color: marker.color, opacity: 0.9 });
      if (marker.sign && !row.continuation) addText(marker.sign, left + 1, y + baseline, size - 1, marker.color);
    }
    if (settings.lines && !row.continuation) {
      const number = String(row.sourceLine + settings.firstLine - 1);
      addText(number, left + gutter - 18 - measure(number, size - 1, regular).width, y + baseline, size - 1, marker?.color ?? muted, opacity * 0.62);
    }
    for (const run of row.runs) {
      const x = left + gutter + run.x;
      text.push({ text: run.text, x, y: y + baseline, size: run.size, bold: run.bold, italic: run.italic, color: run.color, opacity });
      const decoration = (offset: number) => shapes.push({
        kind: 'line', x, y: y + baseline + offset, endX: x + run.width, endY: y + baseline + offset, color: run.color, opacity,
      });
      if (run.style & 4) decoration(2);
      if (run.style & 8) decoration(-size * 0.3);
    }
  });

  return {
    width, height, window, windowRadius: radius, windowColor: highlight.surface, shadows, shapes, text,
    vectorSafe: settings.font !== 'system' && text.every(run => /^[ -~]*$/.test(run.text)),
  };
}

export function gradientLine(width: number, height: number, angle: number) {
  const radians = angle * Math.PI / 180;
  const dx = Math.sin(radians);
  const dy = -Math.cos(radians);
  const distance = (Math.abs(width * dx) + Math.abs(height * dy)) / 2;
  return [width / 2 - dx * distance, height / 2 - dy * distance,
    width / 2 + dx * distance, height / 2 + dy * distance] as const;
}

export function placePhoto(source: PhotoSize, frame: Box, placement: PhotoPlacement) {
  const fit = placement.fit === 'cover' ? Math.max : Math.min;
  const scale = fit(frame.width / source.width, frame.height / source.height) * (placement.zoom / 100);
  const width = source.width * scale;
  const height = source.height * scale;
  const offsetX = (frame.width - width) / 2;
  const offsetY = (frame.height - height) / 2;
  const travelX = Math.abs(offsetX) < 0.5 ? 0 : Math.abs(offsetX);
  const travelY = Math.abs(offsetY) < 0.5 ? 0 : Math.abs(offsetY);
  return {
    bounds: {
      x: frame.x + offsetX + travelX * placement.x / 100,
      y: frame.y + offsetY + travelY * placement.y / 100,
      width, height,
    },
    travelX, travelY,
  };
}

export function composeScene(layout: CodeImageLayout, background: Background, canvas: Photo | undefined, window: Photo | undefined, opacity: number): CodeImageScene {
  return {
    ...layout, background, windowOpacity: opacity / 100,
    canvasPhoto: canvas && { ...canvas, ...placePhoto(canvas.bitmap, { x: 0, y: 0, width: layout.width, height: layout.height }, canvas.placement) },
    windowPhoto: window && { ...window, ...placePhoto(window.bitmap, layout.window, window.placement) },
  };
}
