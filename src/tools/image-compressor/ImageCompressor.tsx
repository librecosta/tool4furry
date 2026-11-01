import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import * as stylex from '@stylexjs/stylex';
import WorkbenchShell from '../../workbench/WorkbenchShell';
import { FileDropzone } from '../../ui/FileDropzone';
import { Button } from '../../ui/Button';
import { SelectField } from '../../ui/SelectField';
import { SliderField } from '../../ui/SliderField';
import { TextField } from '../../ui/TextField';
import { FileTaskList, type FileTaskItem } from '../../ui/FileTaskList';
import { ImageTaskMedia } from '../image/ImageTaskMedia';
import { ImageComparisonDialog } from '../image/ImageComparisonDialog';
import type { ImageOutputFormat } from '../image/types';
import type { ToolProps } from '../types';
import { imageAccept, sortedFolderFiles } from '../image-converter/intake';
import { converterStyles as c } from '../image-converter/converter.styles';
import { CompressorSession, type CompressionTask, type CompressionView } from './session';
import { quickSettings, recommendedSettings, sameCompressionSettings, supportsTarget, validSettings, type CompressionSettings, type CompressionStrength } from './compress';
import { messages, comparisonLabels } from './messages';
import { s } from './styles';

export const bytesLabel = (bytes: number) => Math.abs(bytes) < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 ** 2).toFixed(2)} MB`;
export default function ImageCompressor({locale}: ToolProps) {
  const t = messages[locale];
  const [session, setSession] = useState<CompressorSession>();
  const [view, setView] = useState<CompressionView>({tasks: [], settings: {...recommendedSettings}, issues: [], version: 0});
  const [advanced, setAdvanced] = useState(false), [strength, setStrength] = useState<CompressionStrength>('balanced');
  const drafts = useRef({quick: {...recommendedSettings}, advanced: {...recommendedSettings}});
  const [target, setTarget] = useState('200'), [unit, setUnit] = useState('KB'), [edge, setEdge] = useState(''), [background, setBackground] = useState('#FFFFFF');
  const [invalid, setInvalid] = useState(false), [zipError, setZipError] = useState(false), [packing, setPacking] = useState(false), [previewId, setPreviewId] = useState<string>();
  const folderInput = useRef<HTMLInputElement>(null), [folderSupported, setFolderSupported] = useState<boolean>();
  useEffect(() => {
    const owner = new CompressorSession(); setSession(owner); setView(owner.snapshot());
    setFolderSupported('webkitdirectory' in document.createElement('input'));
    const off = owner.subscribe(() => setView(owner.snapshot()));
    return () => { off(); owner.dispose(); };
  }, []);
  const settings = view.settings, hasFiles = view.tasks.length > 0;
  const configure = (patch: Partial<CompressionSettings>) => {
    if (!session) return;
    const next = {...session.snapshot().settings, ...patch};
    if (session.configure(next)) drafts.current[advanced ? 'advanced' : 'quick'] = next;
    setZipError(false);
  };
  const switchMode = (next: boolean) => {
    if (next === advanced) return;
    session?.configure(drafts.current[next ? 'advanced' : 'quick']);
    setAdvanced(next); setInvalid(false); setZipError(false);
  };
  const targetBytes = Number(target) * (unit === 'KB' ? 1024 : 1024 ** 2);
  const draft = {...settings, longestEdge: edge === '' ? undefined : Number(edge),
    ...(settings.mode === 'target' ? {targetBytes: Math.round(targetBytes)} : {}),
    ...(settings.format === 'jpeg' ? {background} : {})};
  const validDraft = (edge === '' || /^\d+$/.test(edge)) &&
    (settings.mode !== 'target' || /^(?:\d+(?:\.\d+)?|\.\d+)$/.test(target) && targetBytes >= 1024 && targetBytes <= 128 * 1024 ** 2) && validSettings(draft);
  const draftDirty = advanced && (!validDraft || !sameCompressionSettings(settings, draft));
  const commit = () => {
    if (!advanced) return true;
    setInvalid(!validDraft);
    if (validDraft) configure(draft);
    return validDraft;
  };
  const enter = (event: KeyboardEvent<HTMLInputElement>) => { if (event.key === 'Enter') { event.preventDefault(); commit(); } };
  const changeFormat = (format: ImageOutputFormat) => {
    configure(advanced ? {format, mode: supportsTarget(format) ? settings.mode : 'quality'} : quickSettings(format, strength));
    setInvalid(false);
  };
  const pending = view.tasks.some(task => ['validating', 'queued', 'processing'].includes(task.status));
  const archivePending = view.tasks.some(task => ['validating', 'queued', 'processing', 'stale'].includes(task.status));
  const ready = view.tasks.filter(task => task.status === 'ready' && task.result).length;
  const failed = view.tasks.filter(task => task.status === 'error').length;
  const canStart = view.tasks.some(task => task.source && ['stale', 'error'].includes(task.status));
  const startLabel = view.tasks.length === 1 ? t.compressOne : t.compressAll.replace('{count}', String(view.tasks.length));
  const errorMessage = (code?: string) => code === 'avifDevice' ? t.avifDevice : code === 'avifBudget' ? t.avifBudget : code === 'avifLoad' ? t.avifLoad :
    code === 'avifTimeout' || code === 'timeout' ? t.timeout : code === 'bytes' ? t.budget : code === 'cancelled' ? t.cancelled : t.failed;
  const label = (task: CompressionTask) => {
    if (task.result && task.status === 'ready') {
      const size = task.result.saved > 0 ? t.reduced : task.result.saved < 0 ? t.larger : t.unchanged;
      return task.result.targetMet ? size : `${size} · ${t.missed}`;
    }
    return task.status === 'ready' ? t.reduced : t[task.status];
  };
  const taskItems: FileTaskItem[] = view.tasks.map(task => ({
    id: task.id, name: task.file.name, status: task.status, statusLabel: label(task),
    media: <ImageTaskMedia source={task.sourceUrl} output={!draftDirty ? task.result?.url : undefined} checking={task.status === 'validating'} labels={t}/>,
    metadata: <span {...stylex.props(s.fileDetails)}><span>{bytesLabel(task.file.size)}{task.source ? ` · ${task.source.width}×${task.source.height}` : ''}</span>
      {task.result && <span {...stylex.props(s.output)}>→ {task.result.format.toUpperCase()} · {task.result.width}×{task.result.height} · {bytesLabel(task.result.blob.size)} · {Math.abs(task.result.saved / task.file.size * 100).toFixed(1)}% {task.result.saved > 0 ? t.saved : t.increase}</span>}</span>,
    error: task.error ? errorMessage(task.error) : undefined,
    actions: [
      ...(task.source ? [{kind: 'preview' as const, label: t.preview, id: `compressor-preview-${task.id}`, onClick: () => setPreviewId(task.id)}] : []),
      ...(task.result ? [{kind: 'download' as const, label: t.download, disabled: draftDirty, onClick: () => session?.download(task.id)}] : []),
      ...(task.status === 'error' ? [{kind: 'retry' as const, label: t.retry, disabled: draftDirty, onClick: () => { if (commit()) session?.retry(task.id); }}] : []),
      {kind: 'remove', label: t.remove, onClick: () => session?.remove(task.id)},
    ],
  }));
  const preview = view.tasks.find(task => task.id === previewId);
  return <WorkbenchShell mode="form" formWidth="wide" labels={{parameters: t.settings, main: t.title, toolbar: t.tasks, close: t.close, showParameters: t.settings, hideParameters: t.settings, showTools: t.import, hideTools: t.import}}>
    <div data-image-compressor {...stylex.props(s.stack)}>
      <div {...stylex.props(hasFiles ? s.intake : s.emptyIntake)}>
        <FileDropzone id="compressor-source" label={hasFiles ? t.append : t.import} hint={hasFiles ? undefined : 'PNG / JPEG / WebP / AVIF'} disabled={!session} multiple accept={imageAccept} appearance={hasFiles ? 'compact' : 'expanded'} issueMessages={{count: t.failed, size: t.failed, type: t.failed}} onFilesReceived={files => session?.add(files)}/>
        <input type="file" hidden multiple ref={node => {folderInput.current = node; node?.setAttribute('webkitdirectory', '');}} aria-label={t.folder} onChange={event => {const input = event.currentTarget; try {if (input.files) session?.add(sortedFolderFiles(Array.from(input.files)));} finally {input.value = '';}}}/>
        <Button variant="ghost" xstyle={s.action} disabled={!session || folderSupported === false} onClick={() => folderInput.current?.click()}>{t.folder}</Button>
        {hasFiles && <Button variant="ghost" xstyle={s.action} onClick={() => {session?.clear(); setPreviewId(undefined);}}>{t.clear}</Button>}
      </div>
      {folderSupported === false && <p {...stylex.props(s.note)}>{t.folderUnavailable}</p>}
      <details {...stylex.props(s.help)}><summary>{t.limits}</summary><p>{t.limitText}</p>{session && <p>≤ {session.limits.files} · {bytesLabel(session.limits.bytes)} {t.perFile} · {session.limits.pixels / 1e6} MP · {session.limits.edge}px · {bytesLabel(session.limits.totalBytes)}</p>}</details>
      {view.issues.length > 0 && <p role="alert" {...stylex.props(s.error)}>{t.rejected} {view.issues.join('、')}</p>}
      {hasFiles && <div data-compressor-workspace {...stylex.props(s.workspace)}>
        <section aria-label={t.tasks} {...stylex.props(s.stack)}>
          <div {...stylex.props(s.row)}><h2 {...stylex.props(s.heading)}>{t.tasks}</h2><span role="status" {...stylex.props(s.note)}>{t.completed}: {ready} · {t.failedCount}: {failed}</span></div>
          <FileTaskList label={t.tasks} items={taskItems}/>
        </section>
        <section aria-label={t.settings} data-compressor-parameters={advanced ? 'advanced' : 'quick'} {...stylex.props(s.settings)}>
          <div {...stylex.props(s.panelHeading)}><h2 {...stylex.props(s.heading)}>{t.settings}</h2>
            <div role="group" aria-label={t.parameterModes} {...stylex.props(c.modes)}>{([false, true] as const).map(value => <button key={String(value)} type="button" aria-pressed={advanced === value} {...stylex.props(c.mode, c.parameterControl, advanced === value && c.currentParameterMode)} onClick={() => switchMode(value)}>{value ? t.advanced : t.quick}</button>)}</div>
          </div>
          <SelectField appearance="quiet" label={t.format} value={settings.format} onValueChange={value => changeFormat(value as ImageOutputFormat)} options={['webp', 'jpeg', 'png', 'avif'].map(value => ({value, label: value.toUpperCase(), disabled: value === 'avif' && !session?.avifSupported}))}/>
          {!session?.avifSupported && <p {...stylex.props(s.note)}>{t.avifDevice}</p>}
          {!advanced && settings.format !== 'png' && <fieldset {...stylex.props(c.group)}><legend {...stylex.props(c.legend)}>{t.strength}</legend>
            <div {...stylex.props(s.strengths)}>{(['light', 'balanced', 'strong'] as const).map(value => <button type="button" key={value} aria-pressed={strength === value} {...stylex.props(c.mode, c.parameterControl, s.strength, strength === value && c.currentParameterMode)} onClick={() => {setStrength(value); configure(quickSettings(settings.format, value));}}>{t[value]}</button>)}</div>
            <p {...stylex.props(s.note)}>{t.qualityLabel}: {settings.quality}%</p>
          </fieldset>}
          {advanced && <>
            {settings.format !== 'png' && <fieldset {...stylex.props(c.group)}><legend {...stylex.props(c.legend)}>{t.strategy}</legend><div {...stylex.props(s.row)}>{(['quality', 'target'] as const).map(mode => <button type="button" key={mode} disabled={mode === 'target' && !supportsTarget(settings.format)} aria-pressed={settings.mode === mode} {...stylex.props(c.mode, c.parameterControl, settings.mode === mode && c.currentParameterMode)} onClick={() => {configure({mode}); setInvalid(false);}}>{t[mode]}</button>)}</div></fieldset>}
            {settings.format !== 'png' && <SliderField label={settings.mode === 'target' ? t.maxQuality : t.qualityLabel} value={settings.quality} onValueChange={quality => configure({quality})} min={1} max={100} unit="%" accent="lavender"/>}
            {settings.mode === 'target' && <div {...stylex.props(s.unit)}><TextField label={t.targetLabel} value={target} onChange={value => {setTarget(value); setInvalid(false);}} inputMode="decimal" onBlur={commit} onKeyDown={enter}/><SelectField appearance="quiet" label={t.unit} value={unit} onValueChange={value => {setUnit(value); setTarget(String(settings.targetBytes / (value === 'KB' ? 1024 : 1024 ** 2)));}} options={[{value: 'KB', label: 'KB'}, {value: 'MB', label: 'MB'}]}/></div>}
            <TextField label={t.longest} hint={t.longestHint} value={edge} onChange={value => {setEdge(value); setInvalid(false);}} inputMode="numeric" onBlur={commit} onKeyDown={enter}/>
            {settings.format === 'jpeg' && <TextField label={t.background} value={background} onChange={value => {setBackground(value); setInvalid(false);}} onBlur={commit} onKeyDown={enter} maxLength={7} spellCheck={false}/>}
          </>}
          {settings.mode === 'target' && <p {...stylex.props(s.note)}>{t.targetHint}</p>}
          {settings.format === 'avif' && <p {...stylex.props(s.note)}>{t.avifHint}</p>}
          {settings.format === 'png' && <p {...stylex.props(s.note)}>{t.pngHint}</p>}
          {invalid && <p role="alert" {...stylex.props(s.error)}>{t.invalid}</p>}
          <div {...stylex.props(s.delivery)}><Button variant="ghost" xstyle={s.main} disabled={!session || !canStart || pending} onClick={() => {if (commit()) session?.start();}}>{startLabel}</Button>
            {pending && <Button variant="ghost" xstyle={s.action} onClick={() => session?.cancel()}>{t.cancel}</Button>}
            {ready > 0 && <Button variant="ghost" xstyle={s.action} disabled={archivePending || packing || draftDirty} onClick={() => {setPacking(true); setZipError(false); void session?.zip().catch(() => setZipError(true)).finally(() => setPacking(false));}}>{packing ? t.packing : t.zip}</Button>}
          </div>
          {failed > 0 && ready > 0 && <p {...stylex.props(s.note)}>{t.zipPartial}</p>}
          {zipError && <p role="alert" {...stylex.props(s.error)}>{t.zipError}</p>}
        </section>
      </div>}
      {preview?.source && <ImageComparisonDialog open onOpenChange={open => {if (!open) setPreviewId(undefined);}} name={preview.file.name} labels={comparisonLabels[locale]} finalFocus={() => document.getElementById(`compressor-preview-${preview.id}`) ?? document.getElementById('compressor-source-button')}
        source={{url: preview.sourceUrl, width: preview.source.width, height: preview.source.height, format: preview.source.info.format, onError: () => session?.previewFailed(preview.id)}}
        output={preview.result && !draftDirty ? {url: preview.result.url, width: preview.result.width, height: preview.result.height, format: preview.result.format, onError: () => session?.previewFailed(preview.id)} : undefined}/>}
    </div>
  </WorkbenchShell>;
}
