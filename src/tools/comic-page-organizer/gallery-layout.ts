export type GallerySize = Readonly<{width: number; height: number}>;
export type GalleryBox = Readonly<GallerySize & {x: number; y: number}>;
export type GalleryLayout = Readonly<{boxes: readonly GalleryBox[]; height: number}>;

/** Consecutive rows, never columns. Last rows stay at the target height instead
 * of stretching a small batch. Only extreme thumbnails are clipped; originals
 * and the archive remain untouched. All ordinary image proportions are exact. */
export function galleryLayout(sizes: readonly GallerySize[], width: number): GalleryLayout {
  if (!sizes.length || !Number.isFinite(width) || width <= 0) return {boxes: [], height: 0};
  const gap = 10, target = width < 640 ? 178 : 220, maxHeight = width < 640 ? 240 : 260;
  const ratios = sizes.map(size => {
    const ratio = size.width / size.height;
    return Number.isFinite(ratio) && ratio > 0 ? Math.max(.5, Math.min(3, ratio)) : 1;
  });
  const boxes: GalleryBox[] = [];
  const minimumWidth = Math.min(100, width);
  let start = 0, y = 0;
  while (start < sizes.length) {
    let end = start, sum = ratios[start], minimumRatio = ratios[start];
    const height = (last: number, total: number) => Math.max(1, width - gap * (last - start)) / total;
    // Choose the row boundary closest to the intended image height.
    while (end + 1 < sizes.length && height(end, sum) > target) {
      const next = height(end + 1, sum + ratios[end + 1]);
      if (Math.min(minimumRatio, ratios[end + 1]) * next < minimumWidth) break;
      if (next < target && Math.abs(next - target) > Math.abs(height(end, sum) - target)) break;
      sum += ratios[++end]; minimumRatio = Math.min(minimumRatio, ratios[end]);
    }
    const fillHeight = height(end, sum);
    const lastHeight = Math.min(maxHeight, Math.max(target, minimumWidth / minimumRatio));
    const rowHeight = Math.min(fillHeight, end === sizes.length - 1 ? lastHeight : maxHeight);
    let x = 0;
    for (let i = start; i <= end; i++) {
      const imageWidth = Math.min(width - x, ratios[i] * rowHeight);
      boxes.push({x, y, width: imageWidth, height: rowHeight});
      x += imageWidth + gap;
    }
    y += rowHeight + gap;
    start = end + 1;
  }
  return {boxes, height: y - gap};
}

export type GalleryInsertion = Readonly<{boundary: number; anchor: number; side: 'before' | 'after'}>;
/** A boundary is in the original DOM order, before removing the dragged page. */
export function galleryInsertion(boxes: readonly GalleryBox[], x: number, y: number): GalleryInsertion | undefined {
  if (!boxes.length || !Number.isFinite(x) || !Number.isFinite(y)) return;
  const rows: {start: number; end: number; center: number}[] = [];
  boxes.forEach((box, i) => {
    const row = rows.at(-1);
    if (row && Math.abs(box.y - boxes[row.start].y) < 1) row.end = i;
    else rows.push({start: i, end: i, center: box.y + box.height / 2});
  });
  if (y < boxes[0].y) return {boundary: 0, anchor: 0, side: 'before'};
  const last = boxes.at(-1)!;
  if (y > last.y + last.height) return {boundary: boxes.length, anchor: boxes.length - 1, side: 'after'};
  const row = rows.reduce((best, row) => Math.abs(row.center - y) < Math.abs(best.center - y) ? row : best);
  for (let i = row.start; i <= row.end; i++) {
    if (x < boxes[i].x + boxes[i].width / 2) return {boundary: i, anchor: i, side: 'before'};
  }
  return {boundary: row.end + 1, anchor: row.end, side: 'after'};
}

export function insertionTarget(from: number, boundary: number, length: number) {
  return Math.max(0, Math.min(length - 1, boundary > from ? boundary - 1 : boundary));
}

export function galleryScroll(y: number, top: number, bottom: number) {
  const edge = Math.min(48, Math.max(1, (bottom - top) / 3));
  if (y < top + edge) return -18 * Math.min(1, Math.max(0, (top + edge - y) / edge));
  if (y > bottom - edge) return 18 * Math.min(1, Math.max(0, (y - bottom + edge) / edge));
  return 0;
}
