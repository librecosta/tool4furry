import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { EyeIcon, FileImageIcon, TrashIcon } from '@phosphor-icons/react';
import { IconButton } from '../../ui/Button';
import { Tooltip } from '../../ui/Tooltip';
import type { Locale } from '../../i18n/locale';
import { errorText, tr } from '../general/ui';
import { galleryLayout } from '../comic-page-organizer/gallery-layout';
import { useGalleryDrag } from '../comic-page-organizer/use-gallery-drag';
import type { ImagePage } from './collection';
import s from './images.module.scss';

function Thumbnail({page, locale}: {page: ImagePage; locale: Locale}) {
  const [loaded, setLoaded] = useState<string>(), [failed, setFailed] = useState<string>();
  const available = page.url && failed !== page.url;
  return <>
    {(!available || loaded !== page.url) && <div className={s.placeholder}><FileImageIcon size={24} aria-hidden /><span>
      {page.status === 'error' ? errorText(page.error, locale) : page.thumbnailError || failed === page.url && !!page.url ? tr(locale, '缩略图不可用，可尝试预览或生成 PDF。', 'Thumbnail unavailable. You can still try the preview or PDF.') : tr(locale, '正在加载图片…', 'Loading image…')}
    </span></div>}
    {available && <img src={page.url} alt={page.file.name} loading="lazy" decoding="async" draggable={false} className={s.image} data-loading={loaded !== page.url || undefined} onLoad={() => setLoaded(page.url)} onError={() => setFailed(page.url)} />}
  </>;
}
export function ImageGallery({pages, locale, disabled, onMove, onRemove, onPreview, onVisible}: {
  pages: readonly ImagePage[]; locale: Locale; disabled: boolean;
  onMove: (id: string, target: number) => void; onRemove: (id: string) => void;
  onPreview: (id: string, trigger: HTMLButtonElement) => void; onVisible: (ids: readonly string[]) => void;
}) {
  const host = useRef<HTMLDivElement>(null), list = useRef<HTMLUListElement>(null), help = useId();
  const [width, setWidth] = useState(640), [lifted, setLifted] = useState<string>(), [announcement, setAnnouncement] = useState('');
  const start = useRef(0), scrollAfterMove = useRef<HTMLElement | null>(null);
  const visible = useRef(onVisible); visible.current = onVisible;
  const order = pages.map(p => p.id), key = order.join('|');
  const interaction = useGalleryDrag(host, disabled ? [] : order, onMove);
  useLayoutEffect(() => {
    const element = list.current!;
    const measure = () => {if (element.clientWidth > 0) setWidth(element.clientWidth);};
    measure(); const observer = new ResizeObserver(measure); observer.observe(element); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const nodes = [...list.current!.querySelectorAll<HTMLElement>('[data-page-id]')], ids = new Set<string>();
    if (typeof IntersectionObserver === 'undefined') {visible.current(nodes.slice(0, 12).map(n => n.dataset.pageId!)); return;}
    const observer = new IntersectionObserver(entries => {
      for (const e of entries) {const id = (e.target as HTMLElement).dataset.pageId!; if (e.isIntersecting) ids.add(id); else ids.delete(id);}
      visible.current([...ids]);
    }, {root: host.current, rootMargin: '80px 0px'});
    nodes.forEach(n => observer.observe(n)); return () => observer.disconnect();
  }, [key]);
  useEffect(() => {if (disabled || !pages.some(p => p.id === lifted)) setLifted(undefined);}, [disabled, pages, lifted]);
  useLayoutEffect(() => {scrollAfterMove.current?.scrollIntoView?.({block: 'nearest'}); scrollAfterMove.current = null;}, [pages]);
  const layout = galleryLayout(pages.map(p => p.source ?? {width: 1, height: 1}), width);
  const keyboard = (event: KeyboardEvent<HTMLLIElement>, page: ImagePage, index: number) => {
    if (disabled || event.target !== event.currentTarget) return;
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (lifted === page.id) setLifted(undefined); else {start.current = index; setLifted(page.id);}
      return;
    }
    if (event.key === 'Escape' && lifted === page.id) {event.preventDefault(); onMove(page.id, start.current); setLifted(undefined); return;}
    if (lifted !== page.id && !event.altKey) return;
    const target = event.key === 'Home' ? 0 : event.key === 'End' ? pages.length - 1 : ['ArrowLeft','ArrowUp'].includes(event.key) ? index - 1 : ['ArrowRight','ArrowDown'].includes(event.key) ? index + 1 : undefined;
    if (target !== undefined) {
      event.preventDefault(); const next = Math.max(0, Math.min(pages.length - 1, target));
      scrollAfterMove.current = event.currentTarget; onMove(page.id, next);
      setAnnouncement(tr(locale, `图片已移至第 ${next + 1} 位。`, `Image moved to position ${next + 1}.`));
    }
  };
  const dragged = pages.find(p => p.id === interaction.drag?.id);
  return <>
    <span id={help} className={s.srOnly}>{tr(locale, '按空格提起图片，方向键或 Home/End 移动，再按空格放下；Escape 取消。触屏可长按后拖动。', 'Press Space to pick up an image, use arrows or Home/End to move, then Space to drop. Escape cancels. On touch, hold an image, then drag.')}</span>
    <div ref={host} data-images-pdf-gallery className={s.imagesPdfGallery} onClickCapture={interaction.clickCapture}>
      <ul ref={list} className={s.grid} aria-label={tr(locale, 'PDF 图片页序', 'PDF image order')} style={{height: layout.height}}>
        {pages.map((page, index) => {
          const box = layout.boxes[index], insertion = interaction.drag?.insertion;
          return <li key={page.id} tabIndex={0} data-page-id={page.id} data-page-status={page.status} className={[s.page, interaction.drag?.id === page.id && s.dragging, lifted === page.id && s.lifted, insertion?.anchor === index && (insertion.side === 'before' ? s.before : s.after)].filter(Boolean).join(' ')} style={{left: box.x, top: box.y, width: box.width, height: box.height}}
            aria-label={`${index + 1}. ${page.file.name}`} aria-roledescription={tr(locale, '可排序图片', 'Sortable image')} aria-describedby={help}
            onKeyDown={e => keyboard(e, page, index)} onBlur={e => {if (!e.currentTarget.contains(e.relatedTarget)) setLifted(undefined);}}
            onPointerDown={e => {if (!disabled) interaction.pointerDown(page.id, e);}} onTouchStart={e => {if (!disabled) interaction.touchStart(page.id, e);}} onContextMenu={interaction.contextMenu}>
            <Thumbnail page={page} locale={locale} />
            <span aria-hidden className={s.number}>{String(index + 1).padStart(2, '0')}</span>
            <div className={s.overlays}>
              <Tooltip content={tr(locale, '放大预览', 'Enlarge preview')}><IconButton label={tr(locale, `预览第 ${index + 1} 张图片`, `Preview image ${index + 1}`)} variant="ghost" className={s.icon} disabled={disabled || page.status !== 'ready'} onClick={e => onPreview(page.id, e.currentTarget)}><EyeIcon size={18} aria-hidden /></IconButton></Tooltip>
              <Tooltip content={tr(locale, '移除图片', 'Remove image')}><IconButton label={tr(locale, `移除第 ${index + 1} 张图片`, `Remove image ${index + 1}`)} variant="ghost" className={s.icon} disabled={disabled} onClick={() => onRemove(page.id)}><TrashIcon size={18} aria-hidden /></IconButton></Tooltip>
            </div>
            <div className={s.info}><span className={s.name} title={page.file.name}>{page.file.name}</span><span>{page.source ? `${page.source.width} × ${page.source.height} · ` : ''}{(page.file.size / 1024).toFixed(1)} KB</span></div>
          </li>;
        })}
      </ul>
    </div>
    <span role="status" aria-live="polite" className={s.srOnly}>{announcement}</span>
    {interaction.drag && dragged?.url && createPortal(<div aria-hidden data-images-pdf-ghost className={s.ghost} style={{left: interaction.drag.x - interaction.drag.offsetX, top: interaction.drag.y - interaction.drag.offsetY, width: interaction.drag.width, height: interaction.drag.height}}><img src={dragged.url} alt="" draggable={false} className={s.image}/></div>, document.body)}
  </>;
}
