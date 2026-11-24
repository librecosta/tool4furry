import { useEffect, useRef, type RefObject } from 'react';
import type { EditorView } from '@codemirror/view';

type Point = [editor: number, preview: number];

export function interpolate(points: Point[], offset: number, from: 0 | 1) {
  if (!points.length) return 0;
  const to = from === 0 ? 1 : 0;
  let left = 0, right = points.length - 1;
  if (offset <= points[left][from]) return points[left][to];
  if (offset >= points[right][from]) return points[right][to];
  while (right - left > 1) {
    const mid = Math.floor((left + right) / 2);
    if (points[mid][from] <= offset) left = mid;
    else right = mid;
  }
  const a = points[left], b = points[right];
  return a[to] + (b[to] - a[to]) * (offset - a[from]) / (b[from] - a[from]);
}

export function scrollPoints(view: EditorView, preview: HTMLElement, article: HTMLElement): Point[] {
  const editor = view.scrollDOM, previewRect = preview.getBoundingClientRect();
  const editorMax = editor.scrollHeight - editor.clientHeight;
  const previewMax = preview.scrollHeight - preview.clientHeight;
  if (editorMax <= 0 || previewMax <= 0) return [];
  const previewTop = previewRect.top + preview.clientTop - preview.scrollTop;
  const editorTop = view.documentTop - editor.getBoundingClientRect().top - editor.clientTop + editor.scrollTop;
  const points: Point[] = [[0, 0]];
  for (const block of article.querySelectorAll<HTMLElement>('[data-md-line]')) {
    const line = Number(block.dataset.mdLine);
    if (line < 1 || line > view.state.doc.lines) continue;
    const editorY = editorTop + view.lineBlockAt(view.state.doc.line(line).from).top;
    const previewY = block.getBoundingClientRect().top - previewTop;
    const last = points[points.length - 1];
    if (editorY > last[0] && previewY > last[1] && editorY < editorMax && previewY < previewMax) {
      points.push([editorY, previewY]);
    }
  }
  points.push([editorMax, previewMax]);
  return points;
}

/** Measure after CodeMirror and the rendered article have finished laying out. */
export function useScrollSync(
  enabled: boolean, viewRef: RefObject<EditorView | null>, previewRef: RefObject<HTMLDivElement | null>,
  articleRef: RefObject<HTMLDivElement | null>, html: string | undefined,
) {
  const invalidate = useRef(() => {});
  useEffect(() => {
    const view = viewRef.current, preview = previewRef.current, article = articleRef.current;
    if (!enabled || !view || !preview || !article) return;
    const panels = [view.scrollDOM, preview] as const;
    const expected: [number | null, number | null] = [null, null];
    let points: Point[] = [], frame = 0, leader: 0 | 1 | null = null, dirty = true;
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (dirty) {
          points = scrollPoints(view, preview, article);
          dirty = false;
        }
        if (leader === null || !points.length) { leader = null; return; }
        const target = leader === 0 ? 1 : 0;
        const y = interpolate(points, panels[leader].scrollTop, leader);
        leader = null;
        if (Math.abs(y - panels[target].scrollTop) < 1) return;
        panels[target].scrollTop = y;
        expected[target] = panels[target].scrollTop;
      });
    };
    const measure = () => { dirty = true; schedule(); };
    const scroll = (side: 0 | 1) => {
      const targetScroll = expected[side];
      expected[side] = null;
      if (targetScroll !== null && Math.abs(targetScroll - panels[side].scrollTop) < 1) return;
      leader = side;
      schedule();
    };
    const fromEditor = () => scroll(0), fromPreview = () => scroll(1);
    const observer = new ResizeObserver(measure);
    for (const element of [...panels, article]) observer.observe(element);
    panels[0].addEventListener('scroll', fromEditor, { passive: true });
    panels[1].addEventListener('scroll', fromPreview, { passive: true });
    article.addEventListener('load', measure, true);
    article.addEventListener('error', measure, true);
    invalidate.current = measure;
    schedule();
    return () => {
      invalidate.current = () => {};
      cancelAnimationFrame(frame);
      observer.disconnect();
      panels[0].removeEventListener('scroll', fromEditor);
      panels[1].removeEventListener('scroll', fromPreview);
      article.removeEventListener('load', measure, true);
      article.removeEventListener('error', measure, true);
    };
  }, [enabled, viewRef, previewRef, articleRef, html]);
  return invalidate;
}
