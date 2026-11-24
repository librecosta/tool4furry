import { displayTime, relativeTime, sheetLayout, VideoError, type SheetSettings } from './core';
import type { GalleryFrame, VideoInfo } from './protocol';

export async function contactSheet(frames: readonly GalleryFrame[], settings: SheetSettings, name: string, info: VideoInfo, signal: AbortSignal) {
  const { width, height, cols, row, gap, header, imageHeight } = sheetLayout(frames.length, settings);
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  try {
    const ctx = canvas.getContext('2d', { alpha: false, colorSpace: 'srgb' });
    if (!ctx) throw new VideoError('sheet');
    ctx.fillStyle = '#f2f0ed';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#29252a';
    ctx.font = 'bold 19px sans-serif';
    ctx.fillText(name, gap, 29, width - 2 * gap);
    ctx.fillStyle = '#5a515e';
    ctx.font = '13px sans-serif';
    ctx.fillText([info.width + ' × ' + info.height, displayTime(info.duration), String(frames.length)].join('  ·  '), gap, 53, width - 2 * gap);
    for (const [index, frame] of frames.entries()) {
      signal.throwIfAborted();
      const bitmap = await createImageBitmap(frame.thumbnail ?? frame.image);
      try {
        signal.throwIfAborted();
        const scale = Math.min(settings.thumbnail / bitmap.width, imageHeight / bitmap.height);
        const w = bitmap.width * scale, h = bitmap.height * scale;
        const x = gap + index % cols * (settings.thumbnail + gap);
        const y = header + Math.floor(index / cols) * row;
        ctx.fillStyle = '#e7e2e1';
        ctx.fillRect(x, y, settings.thumbnail, imageHeight);
        ctx.drawImage(bitmap, x + (settings.thumbnail - w) / 2, y + (imageHeight - h) / 2, w, h);
        if (settings.timestamps) {
          ctx.fillStyle = '#3f3743';
          ctx.font = '12px monospace';
          ctx.fillText(displayTime(relativeTime(frame.timestamp, info.origin)), x, y + imageHeight + 16);
        }
      } finally { bitmap.close(); }
    }
    const mime = 'image/' + settings.format;
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, mime, .92));
    signal.throwIfAborted();
    if (!blob?.size || blob.type !== mime) throw new VideoError('encode');
    return blob;
  } finally {
    canvas.width = canvas.height = 0;
  }
}
