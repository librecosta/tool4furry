// CSS-pixel geometry for the image viewer; independent of encoding and media resources.
export interface PreviewSize {
  width: number;
  height: number;
}
export interface PreviewView {
  scale: number;
  x: number;
  y: number;
}
export interface PreviewPoint {
  x: number;
  y: number;
}
export const fitScale = (image: PreviewSize, viewport: PreviewSize) =>
  Math.min(viewport.width / image.width, viewport.height / image.height);
export const zoomRange = (fit: number) => ({
  min: Math.min(fit, 1) / 4,
  max: Math.max(8, fit * 4),
});
export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));
export function constrain(
  view: PreviewView,
  image: PreviewSize,
  viewport: PreviewSize,
): PreviewView {
  const x = Math.max(0, (image.width * view.scale - viewport.width) / 2);
  const y = Math.max(0, (image.height * view.scale - viewport.height) / 2);
  return { ...view, x: clamp(view.x, -x, x), y: clamp(view.y, -y, y) };
}
export function zoomAt(
  view: PreviewView,
  scale: number,
  point: PreviewPoint,
): PreviewView {
  const ratio = scale / view.scale;
  return {
    scale,
    x: point.x - (point.x - view.x) * ratio,
    y: point.y - (point.y - view.y) * ratio,
  };
}
