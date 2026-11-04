import { useEffect, useState } from 'react';
import type { Locale } from '../../i18n/locale';
import { ImagePreviewViewport } from '../image/ImagePreviewViewport';
import { tr } from '../general/ui';
import { enlargedSize, type PreviewSession } from './preview-session';
import s from './split.module.scss';

/** A bounded page raster for viewing only; PDF exports continue to use the source document. */
export function PdfPagePreview({ session, page, locale }: { session: PreviewSession; page: number; locale: Locale }) {
  const [image, setImage] = useState<{ session: PreviewSession; page: number; url: string; width: number; height: number }>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController(), canvas = document.createElement('canvas');
    let url: string | undefined;
    setImage(undefined); setFailed(false);
    void (async () => {
      try {
        await session.render(page, canvas, enlargedSize, controller.signal);
        controller.signal.throwIfAborted();
        const width = canvas.width, height = canvas.height;
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
        controller.signal.throwIfAborted();
        if (!blob || !width || !height) throw new Error('Unable to create page preview');
        url = URL.createObjectURL(blob);
        setImage({ session, page, url, width, height });
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      } finally {
        canvas.width = canvas.height = 0;
      }
    })();
    return () => {
      controller.abort();
      canvas.width = canvas.height = 0;
      if (url) URL.revokeObjectURL(url);
    };
  }, [session, page]);
  const current = image?.session === session && image.page === page ? image : undefined;
  const labels = {
    fit: tr(locale, '适应画面', 'Fit to view'),
    actual: tr(locale, '实际大小', 'Actual size'),
    zoomIn: tr(locale, '放大', 'Zoom in'),
    zoomOut: tr(locale, '缩小', 'Zoom out'),
    reset: tr(locale, '重置视图', 'Reset view'),
    viewport: tr(locale, 'PDF 页面预览', 'PDF page preview'),
    instructions: tr(locale, '滚轮或双指缩放，拖动平移；也可使用加减号缩放、方向键平移，按 0 适应画面。', 'Scroll or pinch to zoom, and drag to pan. Use + / - to zoom, arrow keys to pan, and 0 to fit.'),
    loading: tr(locale, '正在加载页面…', 'Loading page…'),
    error: tr(locale, '此页无法预览', 'Page preview unavailable'),
  };
  return <div className={s.enlarged}>
    {current ? <ImagePreviewViewport src={current.url} width={current.width} height={current.height} alt={tr(locale, `第 ${page} 页预览`, `Preview of page ${page}`)} labels={labels} onError={() => {}} />
      : <p className={s.previewStatus} role={failed ? 'alert' : 'status'}>{failed ? labels.error : labels.loading}</p>}
  </div>;
}
