import { useEffect, useRef, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { ArrowLeftIcon, ArrowRightIcon, EyeIcon, StarIcon, TrashIcon } from '@phosphor-icons/react';
import WorkbenchShell from '../../workbench/WorkbenchShell';
import { FileDropzone } from '../../ui/FileDropzone';
import { Button, IconButton } from '../../ui/Button';
import { CheckboxField } from '../../ui/CheckboxField';
import { Tooltip } from '../../ui/Tooltip';
import { FilePreviewDialog } from '../../ui/FilePreviewDialog';
import { ImagePreviewViewport } from '../image/ImagePreviewViewport';
import { ImageThumbnail } from '../image/ImageThumbnail';
import { mobileImageLimits, resolveImageLimits } from '../image/limits';
import { imageAccept } from '../image-converter/intake';
import type { ToolProps } from '../types';
import { ComicSession, emptyComicView } from './session';
import { comicMessages } from './messages';
import { comicStyles as s } from './styles';

export default function ComicPageOrganizer({locale}: ToolProps) {
  const t = comicMessages[locale];
  const [session, setSession] = useState<ComicSession>();
  const [view, setView] = useState(emptyComicView);
  const [reading, setReading] = useState<string>();
  const [readError, setReadError] = useState(false);
  const [folderSupported, setFolderSupported] = useState<boolean>();
  const folder = useRef<HTMLInputElement>(null), previewTrigger = useRef<HTMLElement | null>(null), clearButton = useRef<HTMLButtonElement>(null);
  const drag = useRef<string | undefined>(undefined);
  useEffect(() => {
    const owner = new ComicSession(resolveImageLimits({userAgent: navigator.userAgent, coarsePointer: matchMedia('(pointer: coarse)').matches}));
    setSession(owner); setView(owner.snapshot());
    setFolderSupported('webkitdirectory' in document.createElement('input'));
    const unsubscribe = owner.subscribe(() => setView(owner.snapshot()));
    return () => {unsubscribe(); owner.dispose();};
  }, []);
  useEffect(() => {setReadError(false);}, [reading]);
  useEffect(() => {if (reading && !view.pages.some(page => page.id === reading)) setReading(undefined);}, [reading, view.pages]);
  const ready = view.pages.filter(page => page.status === 'ready');
  const current = ready.find(page => page.id === reading), index = ready.findIndex(page => page.id === reading);
  const pending = view.pages.some(page => page.status === 'checking' || page.status === 'queued');
  const errors = view.pages.filter(page => page.status === 'error').length;
  const rejected = view.intake ? Object.values(view.intake.rejected).reduce((sum, count) => sum + count, 0) : 0;
  const limits = session?.limits ?? mobileImageLimits;
  const archive = async (format: 'zip' | 'cbz') => {
    const result = await session?.pack(format);
    if (result) session?.download(result);
  };
  return <WorkbenchShell mode="form" formWidth="wide" labels={{parameters: t.workspace, close: t.close, showParameters: t.workspace, hideParameters: t.workspace, showTools: t.import, hideTools: t.import, main: t.workspace, toolbar: t.workspace}}>
    <div data-comic-page-organizer {...stylex.props(s.stack)}>
      <FileDropzone label={view.pages.length ? t.add : t.import} hint="PNG / JPEG / WebP / AVIF" disabled={!session} multiple accept={imageAccept} appearance={view.pages.length ? 'compact' : 'expanded'} issueMessages={{type: t.skipped, size: t.skipped, count: t.skipped}} onFilesReceived={files => session?.add(files)}/>
      <input type="file" hidden multiple ref={node => {folder.current = node; node?.setAttribute('webkitdirectory', '');}} aria-label={t.folder} onChange={event => {const input = event.currentTarget; try {if (input.files) session?.add(Array.from(input.files));} finally {input.value = '';}}}/>
      <Button xstyle={s.action} disabled={!session || folderSupported === false} onClick={() => folder.current?.click()}>{t.folder}</Button>
      {folderSupported === false && <p {...stylex.props(s.note)}>{t.folderUnavailable}</p>}
      <details><summary>{t.details}</summary><p {...stylex.props(s.note)}>{t.limits}</p><p {...stylex.props(s.note)}>{limits.files} · ≤ {limits.bytes / 1024 ** 2} MiB / {limits.pixels / 1e6} MP · {limits.totalBytes / 1024 ** 2} MiB</p><p {...stylex.props(s.note)}>{t.original}</p></details>
      {rejected > 0 && <p role="alert" {...stylex.props(s.note, s.error)}>{rejected} · {t.skipped}</p>}
      {!!view.pages.length && <>
        <div {...stylex.props(s.toolbar)}><div {...stylex.props(s.row)}>
          <Button xstyle={s.action} onClick={() => session?.sort()}>{t.sort}</Button>
          <Button xstyle={s.action} onClick={() => session?.selectAll(view.selected.length !== view.pages.length)}>{view.selected.length === view.pages.length ? t.none : t.all}</Button>
          {view.selected.length > 0 && <Button xstyle={s.action} onClick={() => session?.remove(view.selected)}>{t.removeSelected} ({view.selected.length})</Button>}
          <Button ref={clearButton} xstyle={s.action} onClick={() => session?.clear()}>{t.clear}</Button>
        </div><span role="status" {...stylex.props(s.note)}>{ready.length}/{view.pages.length} · {t.pages}</span></div>
        <p {...stylex.props(s.note)}>{t.sortHint}</p>
        <ul aria-label={t.pages} {...stylex.props(s.grid)}>{view.pages.map((page, i) => <li key={page.id} data-page-id={page.id} draggable={page.status === 'ready'} onDragStart={event => {drag.current = page.id; event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('application/x-t4f-comic-page', page.id);}} onDragEnd={() => {drag.current = undefined;}}
          onDragOver={event => {if (drag.current && event.dataTransfer.types.includes('application/x-t4f-comic-page')) event.preventDefault();}}
          onDrop={event => {if (drag.current && event.dataTransfer.types.includes('application/x-t4f-comic-page')) {event.preventDefault(); session?.move(drag.current, i); drag.current = undefined;}}}
          {...stylex.props(s.page, view.selected.includes(page.id) && s.selected)}>
          <div {...stylex.props(s.toolbar)}><CheckboxField label={`${t.select} ${i + 1}`} checked={view.selected.includes(page.id)} onCheckedChange={checked => session?.select(page.id, checked)}/>{view.cover === page.id && <span {...stylex.props(s.cover)}>{t.cover}</span>}</div>
          <div {...stylex.props(s.thumb)}><ImageThumbnail src={page.url} checking={page.status !== 'ready'}/></div>
          <p title={page.file.webkitRelativePath || page.file.name} {...stylex.props(s.name)}>{page.file.name}</p>
          <p {...stylex.props(s.note, page.status === 'error' && s.error)}>{page.source ? `${page.source.width} × ${page.source.height} · ${(page.file.size / 1024).toFixed(1)} KB` : t[page.status]}</p>
          <div {...stylex.props(s.row)}>
            {page.status === 'ready' && <>
              <Tooltip content={t.preview}><IconButton label={`${t.preview} ${i + 1}`} xstyle={s.icon} onClick={event => {previewTrigger.current = event.currentTarget; setReading(page.id);}}><EyeIcon size={20}/></IconButton></Tooltip>
              <Tooltip content={view.cover === page.id ? t.unsetCover : t.setCover}><IconButton label={`${view.cover === page.id ? t.unsetCover : t.setCover} ${i + 1}`} xstyle={s.icon} onClick={() => session?.setCover(view.cover === page.id ? undefined : page.id)}><StarIcon size={20} weight={view.cover === page.id ? 'fill' : 'regular'}/></IconButton></Tooltip>
            </>}
            <Tooltip content={t.remove}><IconButton label={`${t.remove} ${i + 1}`} xstyle={s.icon} onClick={() => session?.remove([page.id])}><TrashIcon size={20}/></IconButton></Tooltip>
          </div>
          <div {...stylex.props(s.row)}>
            {i > (view.cover ? 1 : 0) && view.cover !== page.id && <Tooltip content={t.earlier}><IconButton label={`${t.earlier} ${i + 1}`} xstyle={s.icon} onClick={() => session?.move(page.id, i - 1)}><ArrowLeftIcon size={18}/></IconButton></Tooltip>}
            {i < view.pages.length - 1 && view.cover !== page.id && <Tooltip content={t.later}><IconButton label={`${t.later} ${i + 1}`} xstyle={s.icon} onClick={() => session?.move(page.id, i + 1)}><ArrowRightIcon size={18}/></IconButton></Tooltip>}
          </div>
        </li>)}</ul>
        {errors > 0 && <p role="status" {...stylex.props(s.note, s.error)}>{errors} · {t.failedExcluded}</p>}
        <div {...stylex.props(s.row)}><Button xstyle={s.primary} disabled={!ready.length || pending || view.packing} onClick={() => void archive('cbz')}>{t.cbz}</Button><Button xstyle={s.action} disabled={!ready.length || pending || view.packing} onClick={() => void archive('zip')}>{t.zip}</Button>{view.packing && <span role="status" {...stylex.props(s.note)}>{t.packing}</span>}</div>
      </>}
      {view.archiveError && <p role="alert" {...stylex.props(s.note, s.error)}>{t[view.archiveError]}</p>}
      <FilePreviewDialog open={!!current} onOpenChange={open => {if (!open) setReading(undefined);}} title={current ? `${index + 1}/${ready.length} · ${current.file.name}` : t.preview} description={t.original} labels={t}
        finalFocus={() => previewTrigger.current?.isConnected ? previewTrigger.current : clearButton.current}
        toolbar={<div {...stylex.props(s.row)}><IconButton label={t.previous} xstyle={s.icon} disabled={index <= 0} onClick={() => setReading(ready[index - 1]?.id)}><ArrowLeftIcon size={20}/></IconButton><IconButton label={t.next} xstyle={s.icon} disabled={index >= ready.length - 1} onClick={() => setReading(ready[index + 1]?.id)}><ArrowRightIcon size={20}/></IconButton></div>}>
        {current?.url && current.source && <><ImagePreviewViewport key={current.id} src={current.url} width={current.source.width} height={current.source.height} alt={current.file.name} labels={{...t, error: t.imageError}} onError={() => setReadError(true)}/>{readError && <p role="alert" {...stylex.props(s.note, s.error)}>{t.imageError}</p>}</>}
      </FilePreviewDialog>
    </div>
  </WorkbenchShell>;
}
