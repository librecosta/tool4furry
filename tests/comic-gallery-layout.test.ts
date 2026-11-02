// @vitest-environment node
import { expect, it } from 'vitest';
import { galleryInsertion, galleryLayout, galleryScroll, insertionTarget } from '../src/tools/comic-page-organizer/gallery-layout';

const mixed = [1.6, .625, 1, .75, 1.8, .6, 1, 1.4].map(ratio => ({width: ratio * 1000, height: 1000}));
it.each([320, 390, 768, 1200])('lays out %ipx rows in strict input order, with 10px gaps and unchanged ordinary proportions', width => {
  const {boxes, height} = galleryLayout(mixed, width);
  expect(boxes).toHaveLength(mixed.length); expect(height).toBeGreaterThan(0);
  boxes.forEach((box, i) => {
    expect(box.width / box.height).toBeCloseTo(mixed[i].width / mixed[i].height, 8);
    expect(box.x + box.width).toBeLessThanOrEqual(width + .0001);
    expect(box.width).toBeGreaterThan(0); expect(box.height).toBeLessThanOrEqual(width < 640 ? 240 : 260);
    if (i) {
      const previous = boxes[i - 1];
      if (box.y === previous.y) expect(box.x).toBeCloseTo(previous.x + previous.width + 10, 8);
      else {expect(box.x).toBe(0); expect(box.y).toBeCloseTo(previous.y + previous.height + 10, 8);}
    }
  });
});
it('keeps the last partial row small and bounds extreme/invalid thumbnail ratios without touching source sizes', () => {
  const sizes = [{width: 10000, height: 1}, {width: 1, height: 10000}, {width: NaN, height: 0}];
  const before = sizes.map(size => ({...size})), layout = galleryLayout(sizes, 390);
  expect(sizes).toEqual(before);
  expect(layout.boxes.every(box => Object.values(box).every(Number.isFinite))).toBe(true);
  expect(Math.max(...layout.boxes.map(box => box.height))).toBeLessThanOrEqual(240);
  expect(galleryLayout([{width: 100, height: 100}], 1200).boxes[0]).toMatchObject({width: 220, height: 220});
  expect(galleryLayout([], 100).height).toBe(0);
  expect(galleryLayout(mixed, 0).boxes).toEqual([]);
});
it('moves a narrow portrait to the next row when mixing it with a landscape would make its overlays unreadable', () => {
  const {boxes} = galleryLayout([{width: 960, height: 600}, {width: 600, height: 960}, {width: 800, height: 800}], 340);
  expect(boxes[0].width).toBeCloseTo(340);
  expect(boxes[1].y).toBeGreaterThan(boxes[0].y);
  expect(boxes[1].width).toBeGreaterThanOrEqual(100);
  expect(boxes[1].y).toBe(boxes[2].y);
});
it('projects insertion boundaries by the nearest row, including both ends and moving the first page', () => {
  const boxes = [{x: 0, y: 0, width: 100, height: 100}, {x: 110, y: 0, width: 100, height: 100}, {x: 0, y: 110, width: 100, height: 100}];
  expect(galleryInsertion(boxes, 2, 50)).toEqual({boundary: 0, anchor: 0, side: 'before'});
  expect(galleryInsertion(boxes, 90, 50)).toEqual({boundary: 1, anchor: 1, side: 'before'});
  expect(galleryInsertion(boxes, 215, 50)).toEqual({boundary: 2, anchor: 1, side: 'after'});
  expect(galleryInsertion(boxes, 0, -10)?.boundary).toBe(0);
  expect(galleryInsertion(boxes, 0, 220)?.boundary).toBe(3);
  expect(galleryInsertion([], 2, 2)).toBeUndefined();
  expect(galleryInsertion(boxes, NaN, 2)).toBeUndefined();
  expect(insertionTarget(0, 3, 3)).toBe(2);
  expect(insertionTarget(2, 0, 3)).toBe(0);
  expect(insertionTarget(1, 2, 3)).toBe(1);
});
it('only scrolls near edges, at bounded speed in either direction', () => {
  expect(galleryScroll(200, 100, 400)).toBe(0);
  expect(galleryScroll(110, 100, 400)).toBeLessThan(0);
  expect(galleryScroll(390, 100, 400)).toBeGreaterThan(0);
  expect(Math.abs(galleryScroll(-1000, 100, 400))).toBe(18);
  expect(galleryScroll(1000, 100, 400)).toBe(18);
});
