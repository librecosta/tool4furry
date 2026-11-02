import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { CheckSquareIcon, EyeIcon, FileImageIcon, SquareIcon, TrashIcon } from '@phosphor-icons/react';
import * as stylex from '@stylexjs/stylex';
import { IconButton } from '../../ui/Button';
import { Tooltip } from '../../ui/Tooltip';
import type { ComicPage } from './session';
import type { comicMessages } from './messages';
import { galleryLayout } from './gallery-layout';
import { useGalleryDrag } from './use-gallery-drag';
import { comicStyles as s } from './styles';

type Labels = typeof comicMessages.en;
function GalleryImage({page, labels}: {page: ComicPage; labels: Labels}) {
  const [loaded, setLoaded] = useState<string>(), [failed, setFailed] = useState<string>();
  const available = page.status === 'ready' && page.url && failed !== page.url;
  return <>
    {(!available || loaded !== page.url) && <div {...stylex.props(s.placeholder)}>
      <FileImageIcon size={24} aria-hidden/>
      <span>{page.status !== 'ready' ? labels[page.status] : page.thumbnailError || failed === page.url && !!page.url ? labels.imageError : labels.loading}</span>
    </div>}
    {available && <img src={page.url} alt={page.file.name} loading="lazy" decoding="async" draggable={false}
      onLoad={() => setLoaded(page.url)} onError={() => setFailed(page.url)} {...stylex.props(s.image, loaded !== page.url && s.imageLoading)}/>}
  </>;
}

export function ComicGallery({pages, selected, labels: t, onMove, onSelect, onRemove, onRead, onVisible}: {
  pages: readonly ComicPage[]; selected: readonly string[]; labels: Labels;
  onMove: (id: string, target: number) => void; onSelect: (id: string, selected: boolean) => void;
  onRemove: (id: string) => void; onRead: (id: string, trigger: HTMLElement) => void;
  onVisible: (ids: readonly string[]) => void;
}) {
  const host = useRef<HTMLDivElement>(null), list = useRef<HTMLUListElement>(null);
  const scrollAfterMove = useRef<HTMLElement | null>(null);
  const [width, setWidth] = useState(640), [lifted, setLifted] = useState<string>(), [announcement, setAnnouncement] = useState('');
  const keyboardStart = useRef(0), helpId = useId();
  const visibility = useRef(onVisible); visibility.current = onVisible;
  const orderKey = pages.map(page => page.id).join('|');
  useEffect(() => {
    if (!list.current) return;
    const nodes = [...list.current.querySelectorAll<HTMLElement>('[data-page-id]')], visible = new Set<string>();
    if (typeof IntersectionObserver === 'undefined') {visibility.current(nodes.slice(0, 12).map(node => node.dataset.pageId!)); return;}
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {const id = (entry.target as HTMLElement).dataset.pageId!; if (entry.isIntersecting) visible.add(id); else visible.delete(id);}
      visibility.current([...visible]);
    }, {root: host.current, rootMargin: '80px 0px'});
    nodes.forEach(node => observer.observe(node));
    return () => observer.disconnect();
  }, [orderKey]);
  useLayoutEffect(() => {
    const node = list.current;
    if (!node) return;
    const measure = () => {if (node.clientWidth > 0) setWidth(node.clientWidth);};
    measure();
    const observer = new ResizeObserver(measure); observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {if (lifted && !pages.some(page => page.id === lifted)) setLifted(undefined);}, [lifted, pages]);
  const layout = galleryLayout(pages.map(page => page.source ?? {width: 1, height: 1}), width);
  useLayoutEffect(() => {
    scrollAfterMove.current?.scrollIntoView?.({block: 'nearest'});
    scrollAfterMove.current = null;
  }, [pages]);
  const interaction = useGalleryDrag(host, pages.map(page => page.id), onMove);
  const dragPage = pages.find(page => page.id === interaction.drag?.id);
  const keyDown = (event: KeyboardEvent<HTMLLIElement>, page: ComicPage, index: number) => {
    if (event.target !== event.currentTarget || page.status !== 'ready') return;
    const say = (message: string, index: number) => setAnnouncement(message.replace('{number}', String(index + 1)));
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (lifted === page.id) {setLifted(undefined); say(t.dropped, index);}
      else {keyboardStart.current = index; setLifted(page.id); say(t.lifted, index);}
      return;
    }
    if (event.key === 'Escape' && lifted === page.id) {
      event.preventDefault(); onMove(page.id, keyboardStart.current); setLifted(undefined); say(t.dropped, keyboardStart.current); return;
    }
    if (lifted !== page.id && !event.altKey) return;
    const target = event.key === 'Home' ? 0 : event.key === 'End' ? pages.length - 1
      : ['ArrowLeft','ArrowUp'].includes(event.key) ? index - 1 : ['ArrowRight','ArrowDown'].includes(event.key) ? index + 1 : undefined;
    if (target !== undefined) {
      event.preventDefault(); const next = Math.max(0, Math.min(pages.length - 1, target));
      scrollAfterMove.current = event.currentTarget; onMove(page.id, next); say(t.moved, next);
    }
  };
  return <>
    <span id={helpId} {...stylex.props(s.srOnly)}>{t.keyboard}</span>
    <div ref={host} data-comic-gallery {...stylex.props(s.gallery)} onClickCapture={interaction.clickCapture}>
      <ul ref={list} aria-label={t.pages} {...stylex.props(s.grid)} style={{height: layout.height}}>
        {pages.map((page, index) => {
          const box = layout.boxes[index], checked = selected.includes(page.id), insertion = interaction.drag?.insertion;
          return <li key={page.id} data-page-id={page.id} tabIndex={0} aria-label={`${index + 1}. ${page.file.name}`} aria-roledescription={t.reorder} aria-describedby={helpId}
            onKeyDown={event => keyDown(event, page, index)}
            onBlur={event => {if (lifted === page.id && !event.currentTarget.contains(event.relatedTarget)) setLifted(undefined);}}
            onPointerDown={event => {if (page.status === 'ready') interaction.pointerDown(page.id, event);}}
            onTouchStart={event => {if (page.status === 'ready') interaction.touchStart(page.id, event);}}
            onContextMenu={interaction.contextMenu}
            {...stylex.props(s.page, checked && s.selected, interaction.drag?.id === page.id && s.dragging, lifted === page.id && s.keyboardLifted,
              insertion?.anchor === index && (insertion.side === 'before' ? s.before : s.after))}
            style={{left: box.x, top: box.y, width: box.width, height: box.height}}>
            <GalleryImage page={page} labels={t}/>
            <span data-page-number aria-hidden {...stylex.props(s.number)}>{String(index + 1).padStart(2, '0')}</span>
            <div {...stylex.props(s.overlayActions, box.width < 180 && s.narrowActions)}>
              <Tooltip content={checked ? t.deselect : t.select}><IconButton role="checkbox" aria-checked={checked} label={`${checked ? t.deselect : t.select} ${index + 1}`} variant="ghost" xstyle={[s.overlayButton, checked && s.checked]} onClick={() => onSelect(page.id, !checked)}>{checked ? <CheckSquareIcon size={19} weight="fill"/> : <SquareIcon size={19}/>}</IconButton></Tooltip>
              <Tooltip content={t.preview}><IconButton label={`${t.preview} ${index + 1}`} variant="ghost" xstyle={s.overlayButton} disabled={page.status !== 'ready'} onClick={event => onRead(page.id, event.currentTarget)}><EyeIcon size={18}/></IconButton></Tooltip>
              <Tooltip content={t.remove}><IconButton label={`${t.remove} ${index + 1}`} variant="ghost" xstyle={s.overlayButton} onClick={() => onRemove(page.id)}><TrashIcon size={18}/></IconButton></Tooltip>
            </div>
            <div {...stylex.props(s.info)}><span title={page.file.webkitRelativePath || page.file.name} {...stylex.props(s.name)}>{page.file.name}</span>
              <span {...stylex.props(s.metadata)}>{page.source ? `${page.source.width} × ${page.source.height} · ${(page.file.size / 1024).toFixed(1)} KB` : t[page.status]}</span>
            </div>
          </li>;
        })}
      </ul>
    </div>
    <span role="status" aria-live="polite" {...stylex.props(s.srOnly)}>{announcement}</span>
    {interaction.drag && dragPage?.url && createPortal(<div aria-hidden data-comic-drag-preview {...stylex.props(s.ghost)} style={{left: interaction.drag.x - interaction.drag.offsetX, top: interaction.drag.y - interaction.drag.offsetY, width: interaction.drag.width, height: interaction.drag.height}}><img src={dragPage.url} alt="" draggable={false} {...stylex.props(s.image)}/></div>, document.body)}
  </>;
}
