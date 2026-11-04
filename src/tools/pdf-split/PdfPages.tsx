import { useEffect, useRef, useState } from 'react';
import { EyeIcon } from '@phosphor-icons/react';
import type { Locale } from '../../i18n/locale';
import { Button, IconButton } from '../../ui/Button';
import { Tooltip } from '../../ui/Tooltip';
import { FilePreviewDialog } from '../../ui/FilePreviewDialog';
import { ErrorText, tr } from '../general/ui';
import { enlargedSize, previewBatchSize, thumbnailSize, type PreviewSession } from './preview-session';
import s from './split.module.scss';

function PageCanvas({ session, page, large = false, locale }: { session: PreviewSession; page: number; large?: boolean; locale: Locale }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<'waiting' | 'ready' | 'error'>('waiting');
  useEffect(() => {
    const element = canvas.current!, controller = new AbortController();
    let started = false;
    setStatus('waiting');
    const draw = () => {
      if (started || controller.signal.aborted) return;
      started = true;
      void session.render(page, element, large ? enlargedSize : thumbnailSize, controller.signal).then(() => {
        if (!controller.signal.aborted) setStatus('ready');
      }, () => {
        if (!controller.signal.aborted) setStatus('error');
      });
    };
    const observer = !large && typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) { observer?.disconnect(); draw(); } }, { rootMargin: '100px' }) : undefined;
    if (observer) observer.observe(element); else draw();
    return () => { observer?.disconnect(); controller.abort(); element.width = element.height = 0; };
  }, [session, page, large]);
  return <div className={large ? s.enlarged : s.paper} data-pdf-preview-state={status}>
    <canvas ref={canvas} aria-label={tr(locale, `第 ${page} 页预览`, `Preview of page ${page}`)} className={s.canvas} data-ready={status === 'ready' || undefined} />
    {status !== 'ready' && <span className={s.previewStatus} role={status === 'error' ? 'status' : undefined}>{status === 'error' ? tr(locale, '此页无法预览', 'Page preview unavailable') : tr(locale, '正在加载页面…', 'Loading page…')}</span>}
  </div>;
}

export function PdfPages({ file, count, pages, valid, onToggle, locale }: { file: File; count: number; pages: readonly number[]; valid: boolean; onToggle: (index: number) => void; locale: Locale }) {
  const [loaded, setLoaded] = useState<{ file: File; session?: PreviewSession; error?: string }>();
  const [view, setView] = useState<'all' | 'selected'>('all');
  const [batch, setBatch] = useState(0);
  const [enlarged, setEnlarged] = useState<number>();
  const focus = useRef<HTMLButtonElement | null>(null);
  const session = loaded?.file === file ? loaded.session : undefined;
  useEffect(() => {
    const controller = new AbortController();
    let owner: PreviewSession | undefined;
    setLoaded(undefined); setEnlarged(undefined); setBatch(0); setView('all');
    void import('./preview-engine').then(module => module.openPreview(file, controller.signal)).then(value => {
      owner = value;
      if (controller.signal.aborted) void value.destroy().catch(() => {});
      else setLoaded({ file, session: value });
    }, () => {
      if (!controller.signal.aborted) setLoaded({ file, error: tr(locale, '无法加载 PDF 预览；仍可按页码提取原 PDF。', 'Unable to load the preview. You can still extract pages from the original PDF.') });
    });
    return () => { controller.abort(); void owner?.destroy().catch(() => {}); };
  }, [file, locale]);
  const visible = view === 'selected' ? (valid ? pages : []) : Array.from({ length: count }, (_, i) => i);
  const lastBatch = Math.max(0, Math.ceil(visible.length / previewBatchSize) - 1);
  const current = Math.min(batch, lastBatch);
  const shown = visible.slice(current * previewBatchSize, (current + 1) * previewBatchSize);
  return <section className={s.pages} aria-label={tr(locale, '页面预览与选择', 'Page preview and selection')}>
    <div className={s.selectionBar}>
      <div className={s.choices} role="group" aria-label={tr(locale, '显示页面', 'Show pages')}>
        {(['all', 'selected'] as const).map(value => <Button key={value} size="sm" className={[s.choice, view === value && s.selectedChoice].filter(Boolean).join(' ')} aria-pressed={view === value} onClick={() => { setView(value); setBatch(0); }}>{value === 'all' ? tr(locale, '全部', 'All') : tr(locale, '已选', 'Selected')}</Button>)}
      </div>
      <p className={s.note} role="status">{tr(locale, `已选 ${valid ? pages.length : 0} / ${count} 页`, `Selected ${valid ? pages.length : 0} / ${count} pages`)}</p>
    </div>
    {loaded?.file === file && <ErrorText error={loaded.error} />}
    <div className={s.pageScroll}>
      <ul className={s.grid}>
        {shown.map(index => <li key={index} className={s.page} data-page-number={index + 1} data-selected={valid && pages.includes(index) || undefined}>
          <button type="button" className={s.pageSelect} aria-pressed={valid && pages.includes(index)} aria-label={tr(locale, `选择第 ${index + 1} 页`, `Select page ${index + 1}`)} onClick={() => onToggle(index)}>
            {session ? <PageCanvas session={session} page={index + 1} locale={locale} /> : <div className={s.paper}><span className={s.previewStatus}>{loaded?.error ? tr(locale, '无法预览', 'Preview unavailable') : tr(locale, '正在加载预览…', 'Loading preview…')}</span></div>}
            <span className={s.pageNumber}>{tr(locale, `第 ${index + 1} 页`, `Page ${index + 1}`)}</span>
          </button>
          <Tooltip content={tr(locale, '放大预览', 'Enlarge preview')}><IconButton size="sm" label={tr(locale, `预览第 ${index + 1} 页`, `Preview page ${index + 1}`)} disabled={!session} className={s.eye} onClick={event => { focus.current = event.currentTarget; setEnlarged(index + 1); }}><EyeIcon size={18} aria-hidden /></IconButton></Tooltip>
        </li>)}
      </ul>
      {!shown.length && <p className={s.note}>{tr(locale, '尚未选择页面。', 'No pages selected.')}</p>}
    </div>
    {lastBatch > 0 && <div className={s.pagination}>
      <Button size="sm" disabled={current === 0} onClick={() => setBatch(current - 1)}>{tr(locale, '上一批', 'Previous')}</Button><span className={s.note}>{current + 1} / {lastBatch + 1}</span><Button size="sm" disabled={current === lastBatch} onClick={() => setBatch(current + 1)}>{tr(locale, '下一批', 'Next')}</Button>
    </div>}
    <FilePreviewDialog open={!!enlarged && !!session} onOpenChange={open => { if (!open) setEnlarged(undefined); }} title={tr(locale, `第 ${enlarged ?? 1} 页`, `Page ${enlarged ?? 1}`)} description={file.name} finalFocus={() => focus.current} labels={{ close: tr(locale, '关闭', 'Close'), maximize: tr(locale, '全屏', 'Fullscreen'), restore: tr(locale, '还原', 'Restore') }}>
      {enlarged && session && <PageCanvas key={`${enlarged}-large`} session={session} page={enlarged} large locale={locale} />}
    </FilePreviewDialog>
  </section>;
}
