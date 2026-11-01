import { useEffect, useRef, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import WorkbenchShell from '../../workbench/WorkbenchShell';
import { Button } from '../../ui/Button';
import { FileDropzone } from '../../ui/FileDropzone';
import { FileTaskList } from '../../ui/FileTaskList';
import { sortedFolderFiles } from '../image-converter/intake';
import { MetadataSession, emptyMetadataState, type MetadataTask, type MetadataState } from './session';
import { fieldNames } from './read-metadata';
import { messages } from './messages';
import { s } from './styles';
import { MetadataTaskRow, previewButtonId } from './MetadataTaskRow';
import { SourcePreview } from './SourcePreview';
import type { ToolProps } from '../types';
import notice from './exifr.NOTICE.txt?url';

const bytes = (value: number) => value < 1024 ** 2 ? `${(value / 1024).toFixed(1)} KB` : `${(value / 1024 ** 2).toFixed(2)} MB`;
export default function ExifMetadata({locale}: ToolProps) {
  const t = messages[locale], [owner, setOwner] = useState<MetadataSession>(), [view, setView] = useState<MetadataState>(emptyMetadataState);
  const folderInput = useRef<HTMLInputElement>(null), [folderSupported, setFolderSupported] = useState<boolean>();
  const [packing, setPacking] = useState(false), [zipError, setZipError] = useState(false);
  const [previewId, setPreviewId] = useState<string>();
  const previewTrigger = useRef('');
  useEffect(() => {
    const session = new MetadataSession(); setOwner(session); setView(session.snapshot());
    setFolderSupported('webkitdirectory' in document.createElement('input'));
    const off = session.subscribe(() => setView(session.snapshot()));
    return () => { off(); session.dispose(); };
  }, []);
  const hasFiles = view.tasks.length > 0, selected = view.tasks.find(task => task.id === view.selectedId);
  const pending = view.tasks.some(task => ['queued', 'processing'].includes(task.status));
  const unfinished = pending || view.tasks.some(task => task.status === 'stale');
  const ready = view.tasks.filter(task => task.status === 'ready').length, failed = view.tasks.filter(task => task.status === 'error').length;
  const canClean = view.tasks.some(task => task.source && ['stale', 'error'].includes(task.status));
  const error = (code?: MetadataTask['error']) => code === 'input' ? t.inputError : code === 'timeout' ? t.timeout : code === 'budget' ? t.budget : t.cleanError;
  const status = (task: MetadataTask) => task.status === 'queued' ? task.phase === 'inspect' ? t.inspectWaiting : t.cleanWaiting :
    task.status === 'processing' ? task.phase === 'inspect' ? t.inspecting : t.cleaning : task.status === 'stale' ? t.pending :
    task.status === 'ready' ? task.output?.changed ? t.done : t.unchanged : task.phase === 'inspect' ? t.inputFailed : t.cleanFailed;
  const mutate = (action: () => void) => { setZipError(false); action(); };
  const rows = selected?.source ? [
    {key: 'format', label: t.format, before: selected.source.info.format.toUpperCase(), after: selected.source.info.format.toUpperCase()},
    {key: 'dimensions', label: t.dimensions, before: `${selected.source.width} × ${selected.source.height}`, after: `${selected.source.width} × ${selected.source.height}`},
    {key: 'size', label: t.size, before: `${selected.source.blob.size.toLocaleString(locale)} B`, after: selected.output ? `${selected.output.blob.size.toLocaleString(locale)} B` : ''},
    {key: 'blocks', label: t.blocks, before: selected.before?.blocks.join(', ') || t.none, after: selected.output?.after.blocks.join(', ') || t.none},
    ...selected.before?.fields.map(field => ({key: field.key, label: fieldNames[field.key][locale === 'zh' ? 0 : 1], before: field.value,
      after: selected.output?.after.fields.find(item => item.key === field.key)?.value ?? t.removed, private: field.private})) ?? [],
  ] : [];
  return <WorkbenchShell mode="form" formWidth="wide" labels={{parameters: t.details, main: t.title, toolbar: t.tasks, close: t.clear, showParameters: t.details, hideParameters: t.details, showTools: t.tasks, hideTools: t.tasks}}>
    <link rel="license" href={notice}/>
    <div data-exif-metadata {...stylex.props(s.stack)}>
      <div {...stylex.props(hasFiles ? s.intake : s.emptyIntake)}>
        <FileDropzone id="metadata-source" label={hasFiles ? t.append : t.pick} hint={hasFiles ? undefined : 'JPEG / PNG / WebP'} disabled={!owner} multiple accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" appearance={hasFiles ? 'compact' : 'expanded'} issueMessages={{type: t.inputError, count: t.inputError, size: t.inputError}} onFilesReceived={files => mutate(() => owner?.add(files))}/>
        <input type="file" hidden multiple ref={node => {folderInput.current = node; node?.setAttribute('webkitdirectory', '');}} aria-label={t.folder} onChange={event => {const input = event.currentTarget; try {const files = Array.from(input.files ?? []); mutate(() => owner?.add(sortedFolderFiles(files)));} finally {input.value = '';}}}/>
        <Button variant="ghost" xstyle={s.action} disabled={!owner || folderSupported === false} onClick={() => folderInput.current?.click()}>{t.folder}</Button>
        {hasFiles && <Button variant="ghost" xstyle={s.action} onClick={() => mutate(() => owner?.clear())}>{t.clear}</Button>}
      </div>
      {folderSupported === false && <p {...stylex.props(s.note)}>{t.folderUnavailable}</p>}
      <details {...stylex.props(s.help)}><summary>{t.limits}</summary><p>{t.limitText}</p>{owner && <p>≤ {owner.limits.files} · {bytes(owner.limits.bytes)} {t.perFile} · {owner.limits.pixels / 1e6} MP · {owner.limits.edge}px · {bytes(owner.limits.totalBytes)}</p>}</details>
      {view.issues.length > 0 && <p role="alert" {...stylex.props(s.error)}>{t.rejected} {view.issues.join('、')}</p>}
      {hasFiles && <div data-metadata-workspace {...stylex.props(s.workspace)}>
        <section aria-label={t.tasks} {...stylex.props(s.stack)}>
          <div {...stylex.props(s.row)}><h2 {...stylex.props(s.heading)}>{t.tasks}</h2><span role="status" {...stylex.props(s.note)}>{t.completed}: {ready} · {t.failed}: {failed}</span></div>
          <div {...stylex.props(s.row)}>
            <Button variant="ghost" xstyle={s.main} disabled={!canClean || pending} onClick={() => mutate(() => owner?.clean())}>{t.cleanAll}</Button>
            {ready > 0 && <Button variant="ghost" xstyle={s.action} disabled={unfinished || packing} onClick={() => {setPacking(true); setZipError(false); void owner?.zip().catch(() => setZipError(true)).finally(() => setPacking(false));}}>{packing ? t.packing : t.zip}</Button>}
          </div>
          {ready > 0 && failed > 0 && <p {...stylex.props(s.note)}>{t.partialZip}</p>}
          {zipError && <p role="alert" {...stylex.props(s.error)}>{t.zipError}</p>}
          <FileTaskList label={t.tasks}>{owner && view.tasks.map(task => <MetadataTaskRow key={task.id}
            task={task} owner={owner} selected={task.id === view.selectedId} t={t} status={status(task)} error={task.error ? error(task.error) : undefined}
            onMutate={mutate} onPreview={() => { previewTrigger.current = previewButtonId(task.id); setPreviewId(task.id); }}
          />)}</FileTaskList>
        </section>
        <section id="metadata-details" aria-label={t.details} {...stylex.props(s.stack)}>
          <h2 {...stylex.props(s.heading)}>{t.details}</h2>
          {!selected?.source && <p {...stylex.props(selected?.error ? s.error : s.note)}>{selected?.error ? error(selected.error) : selected ? t.waitingDetails : t.emptyDetails}</p>}
          {selected?.before?.partial && <p {...stylex.props(s.note)}>{t.partial}</p>}
          {rows.length > 0 && <div {...stylex.props(s.tableScroll)}><table aria-label={t.details} {...stylex.props(s.table)}>
            <colgroup><col {...stylex.props(s.fieldColumn)}/><col/>{selected?.output && <col/>}</colgroup>
            <thead {...stylex.props(s.tableHead)}><tr><th scope="col" {...stylex.props(s.cell)}>{t.field}</th><th scope="col" {...stylex.props(s.cell)}>{selected?.output ? t.before : t.original}</th>{selected?.output && <th scope="col" {...stylex.props(s.cell)}>{t.after}</th>}</tr></thead>
            <tbody>{rows.map(row => <tr key={row.key} {...stylex.props(s.tableRow)}><th scope="row" {...stylex.props(s.cell, s.field)}>{row.label}{'private' in row && row.private && <span {...stylex.props(s.private)}> {t.private}</span>}</th><td {...stylex.props(s.cell)}>{row.before}</td>{selected?.output && <td {...stylex.props(s.cell)}>{row.after}</td>}</tr>)}</tbody>
          </table></div>}
          {selected?.before && !selected.before.fields.length && <p {...stylex.props(s.note)}>{t.noFields}</p>}
        </section>
      </div>}
      <SourcePreview task={view.tasks.find(task => task.id === previewId)} owner={owner} t={t}
        onClose={() => setPreviewId(undefined)} finalFocus={() => document.getElementById(previewTrigger.current) ?? document.getElementById('metadata-source-button')}/>
    </div>
  </WorkbenchShell>;
}
