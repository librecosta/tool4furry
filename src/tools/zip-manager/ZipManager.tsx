import zipNotice from '../general/fflate.NOTICE.txt?url';
import { useMemo, useRef, useState } from 'react';
import { FolderPlusIcon } from '@phosphor-icons/react';
import type { ToolProps } from '../types';
import { Button } from '../../ui/Button';
import { FileDropzone } from '../../ui/FileDropzone';
import { TextField } from '../../ui/TextField';
import { Frame, ErrorText, errorText, tr, saveBlob } from '../general/ui';
import { useJob } from '../general/use-job';
import { fail } from '../general/bounds';
import { createZip, inspectZip, extractZip, type ZipItem } from './core';
import { ArchiveTree, zipSize } from './ArchiveTree';
import { checkFiles, filePath, folderStem, selectPaths, zipTree } from './tree';
import { zipDownloadName, zipStem } from './download-name';
import s from './zip.module.scss';

type Mode = 'create' | 'open';
export default function ZipManager({ locale }: ToolProps) {
  const [mode, setMode] = useState<Mode>('create');
  const [files, setFiles] = useState<File[]>([]), [name, setName] = useState('archive');
  const [outputName, setOutputName] = useState('archive');
  const [selection, setSelection] = useState<Set<string>>();
  const [createFolds, setCreateFolds] = useState(new Map<string, boolean>()), [openFolds, setOpenFolds] = useState(new Map<string, boolean>());
  const folderInput = useRef<HTMLInputElement>(null), editedName = useRef(false), active = useRef(false);
  const createJob = useJob<Blob>(locale), inspectJob = useJob<{ file: File; items: ZipItem[] }>(locale);
  const exportJob = useJob<Blob>(locale), singleJob = useJob<void>(locale);
  const busy = createJob.busy || inspectJob.busy || exportJob.busy || singleJob.busy;
  const archive = inspectJob.result?.file, items = inspectJob.result?.items;
  const paths = useMemo(() => items?.map(item => item.name) ?? [], [items]);
  const selected = useMemo(() => selection ?? new Set(paths), [selection, paths]);
  const createTree = useMemo(() => zipTree(files.map(file => ({ name: filePath(file), size: file.size }))), [files]);
  const openTree = useMemo(() => zipTree(items ?? []), [items]);
  const total = files.reduce((sum, file) => sum + file.size, 0), expanded = items?.reduce((sum, item) => sum + item.size, 0) ?? 0;
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
      if (!editedName.current) setName(folderStem(next));
    } catch (error) { createJob.setError(errorText(error, locale)); }
  };
  const load = (added: File[]) => {
    if (active.current || !added.length) return;
    inspectJob.invalidate(); exportJob.invalidate(); singleJob.invalidate();
    setSelection(undefined); setOpenFolds(new Map()); setOutputName(zipStem(added[0].name));
    void perform(inspectJob, async signal => {
      if (added.length !== 1) fail('请一次选择一个 ZIP。', 'Select one ZIP at a time.');
      return { file: added[0], items: await inspectZip(added[0], signal) };
    });
  };
  const clear = () => {
    if (mode === 'create') { createJob.invalidate(); setFiles([]); setName('archive'); editedName.current = false; setCreateFolds(new Map()); }
    else { inspectJob.invalidate(); exportJob.invalidate(); singleJob.invalidate(); setSelection(undefined); setOutputName('archive'); setOpenFolds(new Map()); }
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
    <div className={s.modes} role="group" aria-label={tr(locale, 'ZIP 模式', 'ZIP mode')}>
      {(['create', 'open'] as const).map(value => <Button key={value} className={s.mode} disabled={busy} aria-pressed={mode === value} onClick={() => { if (!active.current) setMode(value); }}>{value === 'create' ? tr(locale, '创建 ZIP', 'Create ZIP') : tr(locale, '打开 ZIP', 'Open ZIP')}</Button>)}
    </div>
    <div className={s.zipWorkspace} data-zip-manager={mode}>
      <div className={s.intake}>
        {mode === 'create' ? <>
          <FileDropzone label={files.length ? tr(locale, '添加文件', 'Add files') : tr(locale, '选择文件或拖放到这里', 'Choose files or drop them here')} multiple disabled={busy} appearance={files.length ? 'compact' : 'expanded'} issueMessages={issueMessages} onFilesReceived={add} />
          <input hidden multiple type="file" aria-label={tr(locale, '添加文件夹', 'Add folder')} disabled={busy} ref={element => {folderInput.current = element; element?.setAttribute('webkitdirectory', '');}} onChange={event => {add(Array.from(event.currentTarget.files ?? [])); event.currentTarget.value = '';}} />
          <Button className={s.lightButton} disabled={busy} onClick={() => folderInput.current?.click()}><FolderPlusIcon size={20} aria-hidden="true" />{tr(locale, '添加文件夹', 'Add folder')}</Button>
          <TextField label={tr(locale, '压缩包名称', 'Archive name')} value={name} disabled={busy} onChange={value => {editedName.current = true; setName(value);}} hint={tr(locale, '下载时自动添加时间戳和 .zip。', 'A timestamp and .zip are added when downloading.')} />
          <div className={s.summary}><p>{files.length} {tr(locale, '个文件', 'files')} · {zipSize(total)}</p><p>{tr(locale, '最多 500 项、单项 32 MiB、累计 96 MiB。保留文件字节打包，不保证减小体积。', 'Up to 500 files, 32 MiB per file and 96 MiB total. Files are packed unchanged; size reduction is not guaranteed.')}</p></div>
        </> : <>
          <FileDropzone label={archive ? tr(locale, '更换 ZIP', 'Replace ZIP') : tr(locale, '选择 ZIP 或拖放到这里', 'Choose a ZIP or drop it here')} accept=".zip,application/zip" disabled={busy} appearance={archive ? 'compact' : 'expanded'} issueMessages={issueMessages} onFilesReceived={load} />
          {archive && <div className={s.summary}><span className={s.archiveName}>{archive.name}</span><p>{tr(locale, '归档大小', 'Archive size')}: {zipSize(archive.size)}</p><p>{items!.length} {tr(locale, '个文件', 'files')} · {tr(locale, '解压后', 'Unpacked')}: {zipSize(expanded)}</p><p role="status">{tr(locale, `已选 ${paths.filter(path => selected.has(path)).length} / ${paths.length} 个文件`, `${paths.filter(path => selected.has(path)).length} / ${paths.length} files selected`)}</p></div>}
          <TextField label={tr(locale, '输出名称', 'Output name')} value={outputName} disabled={busy} onChange={setOutputName} />
          <p className={s.note}>{tr(locale, '所选文件会保留目录路径，重新打包为一个 ZIP 下载，不会直接写入本地文件夹。', 'Selected files keep their folder paths and are repacked into one ZIP download, not written directly to a local folder.')}</p>
          <p className={s.note}>{tr(locale, '读取 ZIP 最大 64 MiB；解压单项 32 MiB、累计 128 MiB，重新打包最多 96 MiB。拒绝加密、不安全路径和异常压缩比。', 'ZIP input: 64 MiB. Extraction: 32 MiB per file, 128 MiB total; repacking: 96 MiB. Encrypted archives, unsafe paths and excessive compression ratios are rejected.')}</p>
        </>}
      </div>
      <section className={s.browser} aria-label={tr(locale, '文件列表', 'File list')}>
        <div className={s.listHeader}><h2 className={s.listTitle}>{mode === 'create' ? tr(locale, '待打包文件', 'Files to archive') : tr(locale, 'ZIP 内容', 'ZIP contents')}</h2>{mode === 'open' && <div className={s.selection}><Button className={s.lightButton} disabled={busy || !paths.length} onClick={() => select(paths, true)}>{tr(locale, '全选', 'Select all')}</Button><Button className={s.lightButton} disabled={busy || !selected.size} onClick={() => select(paths, false)}>{tr(locale, '取消全选', 'Deselect all')}</Button></div>}</div>
        <div className={s.list}>
          {(mode === 'create' ? files.length : paths.length) ? <ArchiveTree nodes={mode === 'create' ? createTree : openTree} locale={locale} disabled={busy} folds={mode === 'create' ? createFolds : openFolds} onFold={toggleFold}
            selected={mode === 'open' ? selected : undefined} onSelect={mode === 'open' ? select : undefined}
            onRemove={mode === 'create' ? path => {
              if (active.current) return;
              createJob.invalidate(); const next = files.filter(file => filePath(file) !== path); setFiles(next);
              if (!editedName.current) setName(folderStem(next));
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
      </section>
      {(busy || error) && <div className={s.feedback}><ErrorText error={error} />{busy && <><p className={s.note} role="status">{tr(locale, '正在处理 ZIP…', 'Processing ZIP…')}</p><Button className={s.lightButton} size="sm" onClick={() => {if (createJob.busy) createJob.invalidate(); if (inspectJob.busy) inspectJob.invalidate(); if (exportJob.busy) exportJob.invalidate(); if (singleJob.busy) singleJob.invalidate();}}>{tr(locale, '取消处理', 'Cancel')}</Button></>}</div>}
      <div className={s.actions} data-zip-actions>
        <Button className={s.action} variant="primary" loading={mode === 'create' ? createJob.busy : exportJob.busy} disabled={busy || (mode === 'create' ? !files.length : !archive || !selected.size)} onClick={() => {
          if (mode === 'create') void perform(createJob, signal => createZip(files.map(file => ({name: filePath(file), blob: file})), signal));
          else if (archive && items) {
            singleJob.setError(undefined);
            void perform(exportJob, async signal => createZip(await extractZip(archive, items, paths.filter(path => selected.has(path)), signal), signal));
          }
        }}>{mode === 'create' ? tr(locale, '创建 ZIP', 'Create ZIP') : tr(locale, '导出所选', 'Export selected')}</Button>
        <Button className={`${s.action} ${s.secondary}`} disabled={busy || !result} onClick={() => {if (!active.current && result) saveBlob(result, zipDownloadName(mode === 'create' ? name : outputName, mode === 'open'));}}>{tr(locale, '下载', 'Download')}</Button>
        <Button className={`${s.action} ${s.secondary}`} onClick={clear}>{tr(locale, '清空', 'Clear')}</Button>
      </div>
    </div>
  </Frame>;
}
