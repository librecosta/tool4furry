import zipNotice from '../general/fflate.NOTICE.txt?url';
import { useMemo, useRef, useState } from 'react';
import { FolderPlusIcon } from '@phosphor-icons/react';
import type { ToolProps } from '../types';
import { Button } from '../../ui/Button';
import { FileDropzone } from '../../ui/FileDropzone';
import { Frame, ErrorText, errorText, tr, saveBlob } from '../general/ui';
import { useJob } from '../general/use-job';
import { fail } from '../general/bounds';
import { createZip, inspectZip, extractZip, type ZipItem } from './core';
import { ArchiveTree, zipSize } from './ArchiveTree';
import { checkFiles, filePath, folderStem, selectPaths, zipTree } from './tree';
import { zipDownloadName } from './download-name';
import s from './zip.module.scss';
import form from '../../workbench/form-tool-layout.module.scss';

type Mode = 'create' | 'open';
export default function ZipManager({ locale }: ToolProps) {
  const [mode, setMode] = useState<Mode>('create');
  const [files, setFiles] = useState<File[]>([]);
  const [selection, setSelection] = useState<Set<string>>();
  const [createFolds, setCreateFolds] = useState(new Map<string, boolean>()), [openFolds, setOpenFolds] = useState(new Map<string, boolean>());
  const folderInput = useRef<HTMLInputElement>(null), active = useRef(false);
  const createJob = useJob<Blob>(locale), inspectJob = useJob<{ file: File; items: ZipItem[] }>(locale);
  const exportJob = useJob<Blob>(locale), singleJob = useJob<void>(locale);
  const busy = createJob.busy || inspectJob.busy || exportJob.busy || singleJob.busy;
  const archive = inspectJob.result?.file, items = inspectJob.result?.items;
  const paths = useMemo(() => items?.map(item => item.name) ?? [], [items]);
  const selected = useMemo(() => selection ?? new Set(paths), [selection, paths]);
  const createTree = useMemo(() => zipTree(files.map(file => ({ name: filePath(file), size: file.size }))), [files]);
  const openTree = useMemo(() => zipTree(items ?? []), [items]);
  const total = files.reduce((sum, file) => sum + file.size, 0);
  const selectedCount = paths.filter(path => selected.has(path)).length;
  const hasInput = mode === 'create' ? !!files.length : !!archive;
  // A cancelled native operation retains the shared slot until it actually settles.
  const perform = async <T,>(job: ReturnType<typeof useJob<T>>, work: (signal: AbortSignal) => Promise<T>) => {
    if (active.current) return;
    active.current = true;
    try { await job.run(work); } finally { active.current = false; }
  };
  const add = (added: File[]) => {
    if (active.current || !added.length) return;
    const next = [...files, ...added];
    try {
      checkFiles(next); createJob.invalidate(); setFiles(next);
    } catch (error) { createJob.setError(errorText(error, locale)); }
  };
  const load = (added: File[]) => {
    if (active.current || !added.length) return;
    inspectJob.invalidate(); exportJob.invalidate(); singleJob.invalidate();
    setSelection(undefined); setOpenFolds(new Map());
    void perform(inspectJob, async signal => {
      if (added.length !== 1) fail('请一次选择一个 ZIP。', 'Select one ZIP at a time.');
      return { file: added[0], items: await inspectZip(added[0], signal) };
    });
  };
  const clear = () => {
    if (mode === 'create') { createJob.invalidate(); setFiles([]); setCreateFolds(new Map()); }
    else { inspectJob.invalidate(); exportJob.invalidate(); singleJob.invalidate(); setSelection(undefined); setOpenFolds(new Map()); }
  };
  const select = (names: string[], checked: boolean) => {
    if (active.current) return;
    exportJob.invalidate(); singleJob.setError(undefined); setSelection(selectPaths(selected, names, checked));
  };
  const toggleFold = (path: string, expanded: boolean) => {
    const change = (previous: Map<string, boolean>) => new Map(previous).set(path, !expanded);
    (mode === 'create' ? setCreateFolds : setOpenFolds)(change);
  };
  const result = mode === 'create' ? createJob.result : exportJob.result;
  const error = mode === 'create' ? createJob.error : inspectJob.error ?? exportJob.error ?? singleJob.error;
  const issueMessages = { type: tr(locale, '不支持的文件类型', 'Unsupported file type'), size: tr(locale, '文件过大', 'File is too large'), count: tr(locale, '请一次选择一个 ZIP', 'Select one ZIP at a time') };
  return <Frame locale={locale}>
    <span hidden data-zip-license={zipNotice} />
    <div data-zip-manager={mode} data-form-layout={hasInput ? 'split' : 'stack'} className={[form.container, form.fileForm, hasInput && form.columns, hasInput && form.expanded].filter(Boolean).join(' ')}>
      <section data-file-workspace className={form.fileWorkspace} aria-label={tr(locale, '文件工作区', 'File workspace')}>
        <div className={[form.fileIntake, mode === 'create' && !!files.length && form.compactIntake].filter(Boolean).join(' ')}>
          {mode === 'create' ? <>
            <FileDropzone label={files.length ? tr(locale, '添加文件', 'Add files') : tr(locale, '选择文件或拖放到这里', 'Choose files or drop them here')} multiple disabled={busy} appearance={files.length ? 'compact' : 'expanded'} issueMessages={issueMessages} onFilesReceived={add} />
            <input hidden multiple type="file" aria-label={tr(locale, '添加文件夹', 'Add folder')} disabled={busy} ref={element => {folderInput.current = element; element?.setAttribute('webkitdirectory', '');}} onChange={event => {add(Array.from(event.currentTarget.files ?? [])); event.currentTarget.value = '';}} />
            <Button className={s.lightButton} disabled={busy} onClick={() => folderInput.current?.click()}><FolderPlusIcon size={20} aria-hidden="true" />{tr(locale, '添加文件夹', 'Add folder')}</Button>
          </> : <>
            <FileDropzone label={archive ? tr(locale, '更换 ZIP', 'Replace ZIP') : tr(locale, '选择 ZIP 或拖放到这里', 'Choose a ZIP or drop it here')} accept=".zip,application/zip" disabled={busy} appearance={archive ? 'compact' : 'expanded'} issueMessages={issueMessages} onFilesReceived={load} />
          </>}
        </div>
        {mode === 'create' && !!files.length && <p className={s.summary}>{files.length} {tr(locale, '个文件', 'files')} · {zipSize(total)}</p>}
        {mode === 'open' && archive && <p className={s.summary}><span title={archive.name}>{archive.name}</span> · {paths.length} {tr(locale, '个文件', 'files')} · {zipSize(archive.size)}</p>}
        {hasInput && <section className={s.zipFileBrowser} aria-label={tr(locale, '文件列表', 'File list')}>
          <h2 className={s.listTitle}>{mode === 'create' ? tr(locale, '待打包文件', 'Files to archive') : tr(locale, 'ZIP 内容', 'ZIP contents')}</h2>
          <div className={s.list}>
            {(mode === 'create' ? files.length : paths.length) ? <ArchiveTree nodes={mode === 'create' ? createTree : openTree} locale={locale} disabled={busy} folds={mode === 'create' ? createFolds : openFolds} onFold={toggleFold}
              selected={mode === 'open' ? selected : undefined} onSelect={mode === 'open' ? select : undefined}
              onRemove={mode === 'create' ? path => {
                if (active.current) return;
                createJob.invalidate(); setFiles(files.filter(file => filePath(file) !== path));
              } : undefined}
              onDownload={mode === 'open' ? path => {
                if (!archive || !items) return;
                exportJob.setError(undefined);
                void perform(singleJob, async signal => {
                  const [entry] = await extractZip(archive, items, [path], signal);
                  if (!signal.aborted) saveBlob(entry.blob, entry.name.split('/').at(-1)!);
                });
              } : undefined} /> : <p className={s.empty}>{mode === 'create' ? tr(locale, '添加文件后在这里查看目录。', 'Add files to see their folders here.') : tr(locale, '打开 ZIP 后在这里浏览内容。', 'Open a ZIP to browse its contents here.')}</p>}
          </div>
        </section>}
      </section>
      <aside data-form-settings className={form.settingsPanel} aria-label={tr(locale, '设置与操作', 'Settings and actions')}>
        <div className={form.settingsHeader}>
          <h2 className={form.settingsTitle}>{tr(locale, 'ZIP 操作', 'ZIP actions')}</h2>
          <div className={form.segmented} role="group" aria-label={tr(locale, 'ZIP 模式', 'ZIP mode')}>
            {(['create', 'open'] as const).map(value => <button type="button" key={value} className={[form.segment, mode === value && form.segmentSelected].filter(Boolean).join(' ')} disabled={busy} aria-pressed={mode === value} onClick={() => { if (!active.current) setMode(value); }}>{value === 'create' ? tr(locale, '创建 ZIP', 'Create ZIP') : tr(locale, '打开 ZIP', 'Open ZIP')}</button>)}
          </div>
        </div>
        {mode === 'open' && archive && <div className={s.selection}>
          <p className={s.note} role="status">{tr(locale, `已选 ${selectedCount} / ${paths.length}`, `Selected ${selectedCount} / ${paths.length}`)}</p>
          <div className={s.selectionActions}><Button className={s.lightButton} disabled={busy || !paths.length} onClick={() => select(paths, true)}>{tr(locale, '全选', 'Select all')}</Button><Button className={s.lightButton} disabled={busy || !selected.size} onClick={() => select(paths, false)}>{tr(locale, '取消全选', 'Deselect all')}</Button></div>
        </div>}
        {(busy || error) && <div className={s.feedback}><ErrorText error={error} />{busy && <><p className={s.note} role="status">{tr(locale, '正在处理 ZIP…', 'Processing ZIP…')}</p><Button className={s.lightButton} size="sm" onClick={() => {if (createJob.busy) createJob.invalidate(); if (inspectJob.busy) inspectJob.invalidate(); if (exportJob.busy) exportJob.invalidate(); if (singleJob.busy) singleJob.invalidate();}}>{tr(locale, '取消处理', 'Cancel')}</Button></>}</div>}
        <div className={form.actions} data-zip-actions>
          <Button className={`${form.action} ${s.action}`} variant="primary" loading={mode === 'create' ? createJob.busy : exportJob.busy} disabled={busy || (mode === 'create' ? !files.length : !archive || !selected.size)} onClick={() => {
            if (mode === 'create') void perform(createJob, signal => createZip(files.map(file => ({name: filePath(file), blob: file})), signal));
            else if (archive && items) {
              singleJob.setError(undefined);
              void perform(exportJob, async signal => createZip(await extractZip(archive, items, paths.filter(path => selected.has(path)), signal), signal));
            }
          }}>{mode === 'create' ? tr(locale, '创建 ZIP', 'Create ZIP') : tr(locale, '导出所选', 'Export selected')}</Button>
          <Button className={`${form.action} ${s.action} ${s.secondary}`} disabled={busy || !result} onClick={() => {if (!active.current && result) saveBlob(result, zipDownloadName(mode === 'create' ? folderStem(files) : archive?.name ?? 'archive', mode === 'open'));}}>{tr(locale, '下载', 'Download')}</Button>
          <Button className={`${form.action} ${s.action} ${s.secondary}`} onClick={clear}>{tr(locale, '清空', 'Clear')}</Button>
        </div>
      </aside>
    </div>
  </Frame>;
}
