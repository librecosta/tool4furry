import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { ArrowClockwiseIcon, CheckCircleIcon, CopyIcon, FileIcon, TrashIcon, XCircleIcon, XIcon } from '@phosphor-icons/react';
import type { ToolProps } from '../types';
import { Button, IconButton } from '../../ui/Button';
import { FileDropzone } from '../../ui/FileDropzone';
import { FileTaskList } from '../../ui/FileTaskList';
import { FieldFrame, useField } from '../../ui/Field';
import { Tooltip } from '../../ui/Tooltip';
import { Frame, tr, saveBlob } from '../general/ui';
import { algorithms, comparison, checksumText, checksumDownloadName, type HashAlgorithm, type HashFailure } from './core';
import { HashQueue, type HashTask } from './queue';
import notice from './hash-wasm.NOTICE.txt?url';
import form from '../../workbench/form-tool-layout.module.scss';
import row from '../../ui/FileTaskList.module.scss';
import controls from '../../ui/controls.module.scss';
import s from './hash.module.scss';

const size = (bytes: number) => bytes < 1024 ? `${bytes} B` : bytes < 1024 ** 2 ? `${(bytes / 1024).toFixed(1)} KiB` : bytes < 1024 ** 3 ? `${(bytes / 1024 ** 2).toFixed(1)} MiB` : `${(bytes / 1024 ** 3).toFixed(1)} GiB`;
const failures: Record<HashFailure, [string, string]> = {
  unsupported: ['当前浏览器不支持 Worker 或 WebAssembly。', 'This browser does not support Workers or WebAssembly.'],
  initialization: ['哈希模块初始化失败，请重试。', 'The hash module could not initialize. Try again.'],
  read: ['无法读取文件，请重新添加或重试。', 'The file could not be read. Add it again or retry.'],
  resource: ['计算失败，当前设备可能无法分配所需资源。', 'Hashing failed. The device may not have enough resources.'],
  worker: ['计算线程无法启动或意外停止，请重试。', 'The hashing worker could not start or stopped unexpectedly. Try again.'],
};
function status(task: HashTask, locale: ToolProps['locale']) {
  return task.status === 'processing' ? `${Math.floor(task.progress * 100)}%` : {
    queued: tr(locale, '等待中', 'Waiting'), ready: tr(locale, '完成', 'Completed'),
    error: tr(locale, '失败', 'Failed'), cancelled: tr(locale, '已取消', 'Cancelled'),
  }[task.status];
}
/** Tool-specific selection/copy adapter, using the existing list and row visual assets. */
function HashTaskRow({ task, selected, locale, queue, copy }: { task: HashTask; selected: boolean; locale: ToolProps['locale']; queue: HashQueue; copy: (text: string) => void }) {
  const copyLabel = tr(locale, `复制哈希：${task.file.name}`, `Copy hash: ${task.file.name}`);
  const removeLabel = tr(locale, `移除：${task.file.name}`, `Remove: ${task.file.name}`);
  return <li data-task-id={task.id} data-task-status={task.status} data-selected={selected || undefined} className={`${row.item} ${s.hashRow}`} onClick={event => {
    if (!(event.target as Element).closest('button, a, input')) queue.select(task.id);
  }}>
    <div className={row.media} aria-hidden="true"><FileIcon size={22} /></div>
    <div className={row.heading}><button className={s.select} type="button" title={task.file.name} aria-pressed={selected} onClick={() => queue.select(task.id)}>{task.file.name}</button><span className={`${row.status} ${task.status === 'error' ? row.error : ''}`} role="status">{status(task, locale)}</span></div>
    <div className={`${row.metadataRow} ${s.metadata}`}>
      <span className={s.note}>{size(task.file.size)} · {algorithms[task.algorithm].label}</span>
      {task.digest && <code className={s.rowDigest} title={task.digest}>{task.digest}</code>}
      {task.error && <span role="alert" className={s.error}>{tr(locale, ...failures[task.error])}</span>}
      {task.status === 'processing' && <div className={row.progress} role="progressbar" aria-label={task.file.name} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.floor(task.progress * 100)}><span className={row.bar} style={{width: `${task.progress * 100}%`}} /></div>}
    </div>
    <div className={row.actions}>
      <Tooltip content={tr(locale, '复制哈希', 'Copy hash')}><IconButton variant="ghost" size="sm" className={row.action} label={copyLabel} disabled={!task.digest || task.status !== 'ready'} onClick={() => { if (task.digest) copy(task.digest); }}><CopyIcon size={18} aria-hidden="true" /></IconButton></Tooltip>
      {['error','cancelled'].includes(task.status) && <Tooltip content={tr(locale, '重试', 'Retry')}><IconButton variant="ghost" size="sm" className={row.action} label={tr(locale, `重试：${task.file.name}`, `Retry: ${task.file.name}`)} onClick={() => queue.retry(task.id)}><ArrowClockwiseIcon size={18} aria-hidden="true" /></IconButton></Tooltip>}
      <Tooltip content={tr(locale, '移除', 'Remove')}><IconButton variant="ghost" size="sm" className={row.action} label={removeLabel} onClick={() => queue.remove(task.id)}><TrashIcon size={18} aria-hidden="true" /></IconButton></Tooltip>
    </div>
  </li>;
}
function HashComparison({ task, locale, onChange }: { task: HashTask; locale: ToolProps['locale']; onChange: (value: string) => void }) {
  const label = tr(locale, '哈希比对（可选）', 'Compare hash (optional)');
  const ids = useField({ label });
  const state = comparison(task.digest, task.expected, task.algorithm);
  const invalid = state === 'invalid';
  const result = state === 'match' ? tr(locale, '一致', 'Match')
    : state === 'mismatch' ? tr(locale, '不一致', 'Mismatch')
    : invalid ? tr(locale, '哈希格式无效', 'Invalid hash format') : '';
  return <FieldFrame label={label} ids={ids}>
    <div className={s.compareControl}>
      <input id={ids.id} className={[controls.input, s.compareInput, invalid && controls.invalid].filter(Boolean).join(' ')}
        value={task.expected} onChange={event => onChange(event.target.value)} spellCheck={false} autoComplete="off"
        aria-invalid={invalid || undefined} aria-describedby={result ? ids.hintId : undefined} />
      {state === 'match' && <CheckCircleIcon data-hash-indicator="match" className={`${s.indicator} ${s.match}`} size={20} aria-hidden="true" />}
      {state === 'mismatch' && <XCircleIcon data-hash-indicator="mismatch" className={`${s.indicator} ${s.error}`} size={20} aria-hidden="true" />}
    </div>
    <span id={ids.hintId} role="status" aria-live="polite" aria-atomic="true" className={s.srOnly} data-hash-comparison>{result}</span>
  </FieldFrame>;
}
export default function FileHash({ locale }: ToolProps) {
  const [queue] = useState(() => new HashQueue());
  const state = useSyncExternalStore(queue.subscribe, queue.getSnapshot, queue.getSnapshot);
  const [message, setMessage] = useState('');
  const feedback = useRef(0);
  const algorithmGroup = useId();
  useEffect(() => { queue.activate(); return () => { feedback.current++; queue.dispose(); }; }, [queue]);
  const resetFeedback = () => { feedback.current++; setMessage(''); };
  const copy = async (text: string, count?: number) => {
    const token = ++feedback.current;
    try {
      await navigator.clipboard.writeText(text);
      if (token === feedback.current) setMessage(count === undefined ? tr(locale, '已复制', 'Copied') : tr(locale, `已复制 ${count} 个已完成结果`, `Copied ${count} completed results`));
    } catch { if (token === feedback.current) setMessage(tr(locale, '复制失败，请手动选择复制。', 'Copy failed. Select and copy the text manually.')); }
  };
  const { items, algorithm } = state;
  const selected = items.find(item => item.id === state.selectedId);
  const completed = items.filter(item => item.status === 'ready' && item.algorithm === algorithm && item.digest);
  const checklist = () => checksumText(algorithm, completed.map(item => ({ name: item.file.name, digest: item.digest! })));
  const busy = items.some(item => ['queued','processing'].includes(item.status));
  const retry = items.some(item => ['error','cancelled'].includes(item.status));
  return <Frame locale={locale}>
    <span hidden data-hash-license={notice} />
    <div data-file-hash data-form-layout={items.length ? 'split' : 'stack'} className={[form.container, form.fileForm, !!items.length && form.columns, !!items.length && form.expanded].filter(Boolean).join(' ')}>
      <section data-file-workspace className={form.fileWorkspace} aria-label={tr(locale, '文件工作区', 'File workspace')}>
        <FileDropzone multiple label={items.length ? tr(locale, '添加文件', 'Add files') : tr(locale, '选择文件或拖放到这里', 'Choose files or drop them here')} appearance={items.length ? 'compact' : 'expanded'} issueMessages={{type: tr(locale, '无法读取文件', 'Unable to read file'), size: tr(locale, '无法读取文件', 'Unable to read file'), count: tr(locale, '无法添加文件', 'Unable to add files')}} onFilesReceived={files => { resetFeedback(); queue.add(files); }} />
        {!!items.length && <>
          <div className={s.summary}><p className={s.note}>{items.length} {tr(locale, '个文件', 'files')} · {size(items.reduce((total, item) => total + item.file.size, 0))}</p>
            <div className={s.taskActions}>
              {busy && <Tooltip content={tr(locale, '取消计算', 'Cancel hashing')}><IconButton variant="ghost" size="sm" label={tr(locale, '取消计算', 'Cancel hashing')} onClick={() => queue.cancel()}><XIcon size={18} aria-hidden="true" /></IconButton></Tooltip>}
              {retry && <Tooltip content={tr(locale, '重试未完成项', 'Retry unfinished')}><IconButton variant="ghost" size="sm" label={tr(locale, '重试未完成项', 'Retry unfinished')} onClick={() => queue.retry()}><ArrowClockwiseIcon size={18} aria-hidden="true" /></IconButton></Tooltip>}
            </div>
          </div>
          <div className={s.listScroll}><FileTaskList label={tr(locale, '文件哈希结果', 'File hash results')}>{items.map(task => <HashTaskRow key={task.id} task={task} selected={task.id === state.selectedId} locale={locale} queue={queue} copy={text => void copy(text)} />)}</FileTaskList></div>
        </>}
      </section>
      <aside data-form-settings className={form.settingsPanel} aria-label={tr(locale, '设置与操作', 'Settings and actions')}>
        <header className={form.settingsHeader}><h2 className={form.settingsTitle}>{tr(locale, '哈希设置', 'Hash settings')}</h2></header>
        <fieldset className={s.algorithmGroup}>
          <legend className={s.algorithmLegend}>{tr(locale, '算法', 'Algorithm')}</legend>
          <div className={s.algorithms}>
            {(Object.keys(algorithms) as HashAlgorithm[]).map(value => <label key={value} className={s.algorithmOption}>
              <input type="radio" name={algorithmGroup} value={value} checked={algorithm === value} onChange={() => { resetFeedback(); queue.setAlgorithm(value); }} />
              <span>{algorithms[value].label}</span>
            </label>)}
          </div>
        </fieldset>
        {selected && <section className={s.details} aria-label={tr(locale, '文件校验详情', 'Verification details')}>
          <strong className={s.filename} title={selected.file.name}>{selected.file.name}</strong>
          <div className={s.digestRow} data-hash-value>
            <code className={s.fullDigest} data-hash-digest>{selected.digest}</code>
            <Tooltip content={tr(locale, '复制哈希', 'Copy hash')}><IconButton variant="ghost" size="sm" className={s.copyDigest} label={tr(locale, '复制哈希', 'Copy hash')} disabled={!selected.digest} onClick={() => { if (selected.digest) void copy(selected.digest); }}><CopyIcon size={18} aria-hidden="true" /></IconButton></Tooltip>
          </div>
          <HashComparison task={selected} locale={locale} onChange={value => queue.setExpected(selected.id, value)} />
        </section>}
        <div className={form.actions} data-hash-actions>
          <Button className={`${form.action} ${s.action}`} variant="primary" disabled={!completed.length} onClick={() => void copy(checklist(), completed.length)}>{tr(locale, '复制结果', 'Copy results')}</Button>
          <Button className={`${form.action} ${s.action} ${s.secondary}`} disabled={!completed.length} onClick={() => {
            saveBlob(new Blob([checklist()], {type:'text/plain;charset=utf-8'}), checksumDownloadName(algorithm));
            feedback.current++;
            setMessage(tr(locale, `已导出 ${completed.length} 个已完成结果`, `Exported ${completed.length} completed results`));
          }}>{tr(locale, '下载 TXT', 'Download TXT')}</Button>
          <Button className={`${form.action} ${s.action} ${s.secondary}`} disabled={!items.length} onClick={() => { resetFeedback(); queue.clear(); }}>{tr(locale, '清空', 'Clear')}</Button>
        </div>
        {!!message && <span role="status">{message}</span>}
      </aside>
    </div>
  </Frame>;
}
