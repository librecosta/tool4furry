import zipNotice from '../general/fflate.NOTICE.txt?url';
import { useId, useState } from 'react';
import { FileIcon, TrashIcon } from '@phosphor-icons/react';
import type { ToolProps } from '../types';
import { Button, IconButton } from '../../ui/Button';
import { FileDropzone } from '../../ui/FileDropzone';
import { TextField } from '../../ui/TextField';
import { CheckboxField } from '../../ui/CheckboxField';
import { SelectField } from '../../ui/SelectField';
import { Tooltip } from '../../ui/Tooltip';
import { Frame, ErrorText, errorText, tr, saveBlob } from '../general/ui';
import { useJob } from '../general/use-job';
import { boundedFiles } from '../general/bounds';
import { packZip } from '../image-converter/zip';
import { zipDownloadName } from '../zip-manager/download-name';
import { renamePlan, RenamePlanError, defaultRules, type Rules } from './core';
import form from '../../workbench/form-tool-layout.module.scss';
import s from './renamer.module.scss';

export default function BatchFileRenamer({ locale }: ToolProps) {
  const [files, setFiles] = useState<File[]>([]), [rules, setRules] = useState(defaultRules);
  const [advanced, setAdvanced] = useState(false);
  const nameId = useId(), errorId = useId();
  const job = useJob<Blob>(locale);
  let plan: ReturnType<typeof renamePlan> = [], error;
  try { plan = renamePlan(files.length ? files.map(file => file.name) : ['example.ext'], rules); }
  catch (e) { if (e instanceof RenamePlanError) plan = e.plan; error = errorText(e, locale); }
  const update = (next: Rules) => { job.invalidate(); setRules(next); };
  const total = files.reduce((sum, file) => sum + file.size, 0);
  const size = total < 1024 ? `${total} B` : total < 1024 ** 2 ? `${(total / 1024).toFixed(1)} KiB` : `${(total / 1024 ** 2).toFixed(1)} MiB`;
  const field = (key: 'start' | 'digits', zh: string, en: string) =>
    <TextField label={tr(locale, zh, en)} value={rules[key]} inputMode="numeric" disabled={job.busy || !rules.sequence} onChange={value => update({ ...rules, [key]: value })} />;
  return <Frame locale={locale}>
    <span hidden data-zip-license={zipNotice} />
    <div data-batch-renamer data-form-layout={files.length ? 'split' : 'stack'} className={[form.container, form.fileForm, !!files.length && form.columns, !!files.length && form.expanded].filter(Boolean).join(' ')}>
      <section data-file-workspace className={form.fileWorkspace} aria-label={tr(locale, '文件工作区', 'File workspace')}>
        <FileDropzone label={files.length ? tr(locale, '添加文件', 'Add files') : tr(locale, '选择文件或拖放到这里', 'Choose files or drop them here')} multiple disabled={job.busy} appearance={files.length ? 'compact' : 'expanded'}
          issueMessages={{ type: tr(locale, '不支持的文件类型', 'Unsupported file type'), size: tr(locale, '文件过大', 'File is too large'), count: tr(locale, '文件过多', 'Too many files') }}
          onFilesReceived={added => {
            if (job.busy || !added.length) return;
            job.invalidate();
            try { const next = [...files, ...added]; boundedFiles(next); setFiles(next); }
            catch (e) { job.setError(errorText(e, locale)); }
          }} />
        {!!files.length && <>
          <p className={s.note}>{files.length} {tr(locale, '个文件', 'files')} · {size}</p>
          <ul className={s.renamePreview} aria-label={tr(locale, '命名预览', 'Rename preview')}>
            {files.map((file, i) => <li key={i} className={s.fileRow} data-rename-row data-invalid={!!plan[i]?.issue || undefined}>
              <FileIcon size={22} aria-hidden="true" className={s.icon} />
              <div className={s.names}><span className={s.original} title={file.name}>{file.name}</span><span className={s.output} title={plan[i]?.name}><span aria-hidden="true">→ </span>{plan[i]?.name || '—'}</span>{plan[i]?.issue && <span className={s.rowError}>{plan[i].issue === 'duplicate' ? tr(locale, '名称冲突', 'Name conflict') : tr(locale, '名称无效', 'Invalid filename')}</span>}</div>
              <Tooltip content={tr(locale, '移除', 'Remove')}><IconButton label={tr(locale, `移除：${file.name}`, `Remove: ${file.name}`)} className={s.remove} disabled={job.busy} onClick={() => { job.invalidate(); setFiles(files.filter((_, n) => n !== i)); }}><TrashIcon size={18} aria-hidden="true" /></IconButton></Tooltip>
            </li>)}
          </ul>
        </>}
      </section>
      <aside data-form-settings className={`${form.settingsPanel} ${s.renameSettings}`} aria-label={tr(locale, '设置与操作', 'Settings and actions')}>
        <div className={form.settingsHeader}>
          <h2 className={form.settingsTitle}>{tr(locale, '重命名设置', 'Rename settings')}</h2>
          <div role="group" aria-label={tr(locale, '命名模式', 'Naming mode')} className={form.segmented}>
            {([false, true] as const).map(value => <button key={String(value)} type="button" disabled={job.busy} aria-pressed={advanced === value} className={[form.segment, advanced === value && form.segmentSelected].filter(Boolean).join(' ')} onClick={() => setAdvanced(value)}>{value ? tr(locale, '高级', 'Advanced') : tr(locale, '快速', 'Quick')}</button>)}
          </div>
        </div>
        <div className={s.composerGroup}>
          <div role="group" aria-label={tr(locale, '文件名模板', 'Filename template')} className={s.composer} data-filename-composer>
            <input id={nameId} className={s.nameInput} aria-label={tr(locale, '统一名称', 'Name')} placeholder={tr(locale, '输入名称（可留空）', 'Name (optional)')} size={Math.max(1, Math.min(24, Array.from(rules.name || tr(locale, '输入名称（可留空）', 'Name (optional)')).length))} value={rules.name} disabled={job.busy} aria-invalid={!!error || undefined} aria-describedby={error ? errorId : undefined} onChange={event => update({...rules, name: event.target.value})} />
            {!!rules.name && rules.sequence && <span className={s.separator} data-filename-separator aria-hidden="true">{rules.separator}</span>}
            {rules.sequence && <span className={s.numberToken} data-filename-number aria-label={tr(locale, '序号', 'Sequence')}>{plan[0]?.number || '—'}</span>}
            <span className={s.extension} data-filename-extension>{files.length ? plan[0]?.extension : '.ext'}</span>
          </div>
          {error && <div id={errorId}><ErrorText error={error} /></div>}
        </div>
        <CheckboxField label={tr(locale, '添加序号', 'Add sequence')} checked={rules.sequence} disabled={job.busy} onCheckedChange={value => update({ ...rules, sequence: value })} />
        {advanced && <div className={s.advanced} data-renamer-advanced>
          <div className={s.numberFields}>{field('start', '起始序号', 'Start number')}{field('digits', '序号位数', 'Number padding')}</div>
          <SelectField appearance="quiet" label={tr(locale, '连接符', 'Separator')} value={rules.separator || 'none'} disabled={job.busy || !rules.sequence} onValueChange={value => update({...rules, separator: value === 'none' ? '' : value as Rules['separator']})} options={[{value: '-', label: '-'}, {value: '_', label: '_'}, {value: ' ', label: tr(locale, '空格', 'Space')}, {value: 'none', label: tr(locale, '无连接符', 'None')}]} />
        </div>}
        <ErrorText error={job.error} />
        <div className={form.actions} data-renamer-actions>
          <Button className={`${form.action} ${s.action}`} variant="primary" loading={job.busy} disabled={job.busy || !files.length || !!error} onClick={() => void job.run(signal => packZip(files.map((file, i) => ({ name: plan[i].name, blob: file })), signal))}>{tr(locale, '生成 ZIP', 'Create ZIP')}</Button>
          <Button className={`${form.action} ${s.action} ${s.secondary}`} disabled={job.busy || !job.result} onClick={() => { if (!job.busy && job.result) saveBlob(job.result, zipDownloadName('renamed-files')); }}>{tr(locale, '下载', 'Download')}</Button>
          <Button className={`${form.action} ${s.action} ${s.secondary}`} onClick={() => { job.invalidate(); setFiles([]); setRules(defaultRules); setAdvanced(false); }}>{tr(locale, '清空', 'Clear')}</Button>
        </div>
      </aside>
    </div>
  </Frame>;
}
