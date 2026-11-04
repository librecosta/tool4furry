import { useEffect, useRef, useState } from 'react';
import { ArrowLeftIcon, ArrowRightIcon } from '@phosphor-icons/react';
import WorkbenchShell from '../../workbench/WorkbenchShell';
import { FileDropzone } from '../../ui/FileDropzone';
import { Button, IconButton } from '../../ui/Button';
import { FilePreviewDialog } from '../../ui/FilePreviewDialog';
import { ImagePreviewViewport } from '../image/ImagePreviewViewport';
import { imageAccept } from '../image-converter/intake';
import c from '../image-converter/converter.styles.module.scss';
import type { ToolProps } from '../types';
import { ComicSession, emptyComicView, type ComicFormat } from './session';
import { mobileComicBudget, resolveComicBudget } from './limits';
import { chooseArchiveFile, supportsArchiveSave } from './save-file';
import pdfNotice from './pdf-lib.NOTICE.txt?url';
import { ComicGallery } from './ComicGallery';
import { comicMessages } from './messages';
import s from './styles.module.scss';
import { ComicExportSettings } from './ExportSettings';
import { validExportSettings } from './export-settings';

export default function ComicPageOrganizer({locale}: ToolProps) {
  const t = comicMessages[locale];
  const [session, setSession] = useState<ComicSession>();
  const [view, setView] = useState(emptyComicView);
  const [reading, setReading] = useState<string>();
  const [readError, setReadError] = useState(false);
  const [folderSupported, setFolderSupported] = useState<boolean>();
  const [format, setFormat] = useState<ComicFormat>('zip'), [streaming, setStreaming] = useState(false), [original, setOriginal] = useState<{id: string; url: string}>();
  const folder = useRef<HTMLInputElement>(null), previewTrigger = useRef<HTMLElement | null>(null), clearButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const owner = new ComicSession(resolveComicBudget({userAgent: navigator.userAgent, coarsePointer: matchMedia('(pointer: coarse)').matches}));
    setSession(owner); setView(owner.snapshot());
    setFolderSupported('webkitdirectory' in document.createElement('input'));
    setStreaming(supportsArchiveSave());
    const unsubscribe = owner.subscribe(() => setView(owner.snapshot()));
    return () => {unsubscribe(); owner.dispose();};
  }, []);
  useEffect(() => {setReadError(false);}, [reading]);
  useEffect(() => {if (reading && !view.pages.some(page => page.id === reading)) setReading(undefined);}, [reading, view.pages]);
  const ready = view.pages.filter(page => page.status === 'ready');
  const current = ready.find(page => page.id === reading), index = ready.findIndex(page => page.id === reading);
  useEffect(() => {
    if (!current?.source || !session) {setOriginal(undefined); return;}
    const url = session.resources.url(current.source.blob); setOriginal({id: current.id, url});
    return () => session.resources.revoke(url);
  }, [current?.id, session]);
  const pending = view.pages.some(page => page.status === 'checking' || page.status === 'queued');
  const errors = view.pages.filter(page => page.status === 'error').length;
  const rejected = view.intake ? Object.values(view.intake.rejected).reduce((sum, count) => sum + count, 0) : 0;
  const budget = session?.budget ?? mobileComicBudget, limits = budget.input;
  const settings = view.settings, validSettings = validExportSettings(settings), avifIssue = session?.avifIssue();
  const converted = settings.format !== 'original';
  const large = format !== 'pdf' && !converted && validSettings && (session?.archiveBytes() ?? 0) > budget.blobBytes;
  const archive = async () => {
    if (!session || view.packing) return;
    const target = format !== 'pdf' && (large || converted) && streaming ? chooseArchiveFile(session.filename(format), format) : undefined;
    const result = await session.pack(format, target);
    if (result) session?.download(result);
  };
  return <WorkbenchShell mode="form" formWidth="wide" labels={{parameters: t.workspace, close: t.close, showParameters: t.workspace, hideParameters: t.workspace, showTools: t.import, hideTools: t.import, main: t.workspace, toolbar: t.workspace}}>
    <div data-comic-page-organizer inert={view.committing} className={s.stack}>
      <link rel="license" href={pdfNotice}/>
      <FileDropzone label={view.pages.length ? t.add : t.import} hint="PNG / JPEG / WebP / AVIF" disabled={!session} multiple accept={imageAccept} appearance={view.pages.length ? 'compact' : 'expanded'} issueMessages={{type: t.skipped, size: t.skipped, count: t.skipped}} onFilesReceived={files => session?.add(files)}/>
      <input type="file" hidden multiple ref={node => {folder.current = node; node?.setAttribute('webkitdirectory', '');}} aria-label={t.folder} onChange={event => {const input = event.currentTarget; try {if (input.files) session?.add(Array.from(input.files));} finally {input.value = '';}}}/>
      <Button className={s.action} disabled={!session || folderSupported === false} onClick={() => folder.current?.click()}>{t.folder}</Button>
      {folderSupported === false && <p className={s.note}>{t.folderUnavailable}</p>}
      <details><summary>{t.details}</summary><p className={s.note}>{t.limits}</p><p className={s.note}>{limits.files} · ≤ {limits.bytes / 1024 ** 2} MiB / {limits.pixels / 1e6} MP · {limits.totalBytes / 1024 ** 2} MiB</p><p className={s.note}>{t.exportLimits.replace('{blob}', String(budget.blobBytes / 1024 ** 2)).replace('{stream}', String(budget.streamBytes / 1024 ** 2)).replace('{pdf}', String(budget.pdf.pages)).replace('{pixels}', String(budget.pdf.pixels / 1e6))}</p><p className={s.note}>{t.original}</p></details>
      {rejected > 0 && <p role="alert" className={[s.note, s.error].filter(Boolean).join(' ')}>{rejected} · {t.skipped}</p>}
      {!!view.pages.length && <>
        <div className={s.toolbar}><div className={s.row}>
          <Button className={s.action} onClick={() => session?.sort()}>{t.sort}</Button>
          <Button className={s.action} onClick={() => session?.selectAll(view.selected.length !== view.pages.length)}>{view.selected.length === view.pages.length ? t.none : t.all}</Button>
          {view.selected.length > 0 && <Button className={s.action} onClick={() => session?.remove(view.selected)}>{t.removeSelected} ({view.selected.length})</Button>}
          <Button ref={clearButton} className={s.action} onClick={() => session?.clear()}>{t.clear}</Button>
        </div><span role="status" className={s.note}>{view.pages.length === 1 ? t.imageCountOne : t.imageCount.replace('{count}', String(view.pages.length))}</span></div>
        <ComicGallery pages={view.pages} selected={view.selected} labels={t} onMove={(id, target) => session?.move(id, target)}
          onVisible={ids => session?.showThumbnails(ids)}
          onSelect={(id, selected) => session?.select(id, selected)} onRemove={id => session?.remove([id])}
          onRead={(id, trigger) => {previewTrigger.current = trigger; setReading(id);}}/>
        {errors > 0 && <p role="status" className={[s.note, s.error].filter(Boolean).join(' ')}>{errors} · {t.failedExcluded}</p>}
        <section aria-label={t.exportSettings} data-comic-export-panel className={[c.settings, s.exportPanel].filter(Boolean).join(' ')}>
          <ComicExportSettings settings={settings} configure={patch => session?.configure(patch)} pdf={format === 'pdf'} cbz={format === 'cbz'} avifIssue={avifIssue} t={t}/>
          <div data-comic-export-actions className={s.row}>
            <div role="radiogroup" aria-label={t.exportFormat} className={c.modes} onKeyDown={event => {
              if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key) || view.packing) return;
              event.preventDefault(); const values = ['zip','cbz','pdf'] as const, i = values.indexOf(format);
              const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (i + (event.key === 'ArrowLeft' ? 2 : 1)) % 3;
              setFormat(values[next]); (event.currentTarget.children[next] as HTMLElement).focus();
            }}>{(['zip','cbz','pdf'] as const).map(value => <button key={value} type="button" role="radio" aria-checked={format === value} tabIndex={format === value ? 0 : -1} disabled={view.packing} className={[c.mode, c.parameterControl, format === value && c.currentParameterMode].filter(Boolean).join(' ')} onClick={() => setFormat(value)}>{value.toUpperCase()}</button>)}</div>
            <Button className={s.primary} loading={view.packing} disabled={!ready.length || pending || large && !streaming || format !== 'pdf' && (!validSettings || settings.format === 'avif' && !!avifIssue)} onClick={() => void archive()}>{format === 'pdf' ? t.pdf : t.download}</Button>
            {view.packing && <><span role="status" className={s.note}>{t.packing} {view.progress}/{ready.length}</span><Button className={[s.action, s.exportSecondary].filter(Boolean).join(' ')} onClick={() => session?.cancelExport()}>{t.cancel}</Button></>}
          </div>
          {large && <p role={streaming ? 'status' : 'alert'} className={[s.note, !streaming && s.error].filter(Boolean).join(' ')}>{streaming ? t.stream : t.noStream}</p>}
          {view.exported && <p role="status" className={s.note}>{t.saved}</p>}
        </section>
      </>}
      {view.archiveError && <p role={view.archiveError === 'cancelled' ? 'status' : 'alert'} className={[s.note, view.archiveError !== 'cancelled' && s.error].filter(Boolean).join(' ')}>{t[view.archiveError]}</p>}
      <FilePreviewDialog open={!!current} onOpenChange={open => {if (!open) setReading(undefined);}} title={current ? `${view.pages.indexOf(current) + 1}/${view.pages.length} · ${current.file.name}` : t.preview} labels={t}
        finalFocus={() => previewTrigger.current?.isConnected ? previewTrigger.current : clearButton.current}
        toolbar={<div className={s.row}><IconButton label={t.previous} className={s.icon} disabled={index <= 0} onClick={() => setReading(ready[index - 1]?.id)}><ArrowLeftIcon size={20}/></IconButton><IconButton label={t.next} className={s.icon} disabled={index >= ready.length - 1} onClick={() => setReading(ready[index + 1]?.id)}><ArrowRightIcon size={20}/></IconButton></div>}>
        {current?.source && original?.id === current.id && <><ImagePreviewViewport key={current.id} src={original.url} width={current.source.width} height={current.source.height} alt={current.file.name} labels={{...t, error: t.imageError}} onError={() => setReadError(true)}/>{readError && <p role="alert" className={[s.note, s.error].filter(Boolean).join(' ')}>{t.imageError}</p>}</>}
      </FilePreviewDialog>
    </div>
  </WorkbenchShell>;
}
