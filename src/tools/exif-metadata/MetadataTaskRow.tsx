import { ArrowClockwiseIcon, BroomIcon, DownloadSimpleIcon, EyeIcon, TrashIcon } from '@phosphor-icons/react';
import { IconButton } from '../../ui/Button';
import { Tooltip } from '../../ui/Tooltip';
import controls from '../../ui/controls.module.scss';
import { ImageThumbnail } from '../image/ImageThumbnail';
import { useOwnedUrl } from '../image-converter/use-owned-url';
import type { MetadataSession, MetadataTask } from './session';
import type { messages } from './messages';
import s from './styles.module.scss';

export const previewButtonId = (id: string) => `metadata-preview-${id}`;

/** The row owns only its original thumbnail URL; cleanup results stay in the session. */
export function MetadataTaskRow({ task, owner, selected, t, status, error, onMutate, onPreview }: {
  task: MetadataTask; owner: MetadataSession; selected: boolean; t: (typeof messages)['zh'];
  status: string; error?: string; onMutate: (action: () => void) => void; onPreview: () => void;
}) {
  const sourceUrl = useOwnedUrl(task.source?.blob, owner.resources);
  return <li data-task-id={task.id} data-task-status={task.status} data-selected={selected} className={[s.task, selected && s.current].filter(Boolean).join(' ')}>
    <button type="button" aria-label={task.file.name} aria-describedby={`${task.id}-status`} aria-pressed={selected}
      aria-controls="metadata-details" className={[controls.button, s.select].filter(Boolean).join(' ')} onClick={() => owner.select(task.id)}>
      <span aria-hidden="true" className={s.thumbnail}><ImageThumbnail src={sourceUrl} checking={!task.source}/></span>
      <span className={s.identity}>
        <span title={task.file.name} className={s.filename}>{task.file.name}</span>
        <span id={`${task.id}-status`} className={[s.state, task.status === 'ready' && s.success, task.status === 'error' && s.error].filter(Boolean).join(' ')}>{status}</span>
      </span>
    </button>
    <div className={s.actions}>
      <Tooltip content={t.preview}><IconButton id={previewButtonId(task.id)} label={`${t.preview}: ${task.file.name}`} variant="ghost" className={[s.icon, selected && s.selectedIcon].filter(Boolean).join(' ')} disabled={!task.source} onClick={onPreview}><EyeIcon size={18}/></IconButton></Tooltip>
      {task.status === 'stale' && <Tooltip content={t.clean}><IconButton label={`${t.clean}: ${task.file.name}`} variant="ghost" className={[s.icon, selected && s.selectedIcon].filter(Boolean).join(' ')} onClick={() => onMutate(() => owner.clean(task.id))}><BroomIcon size={18}/></IconButton></Tooltip>}
      {task.status === 'ready' && task.output && <Tooltip content={t.download}><IconButton label={`${t.download}: ${task.file.name}`} variant="ghost" className={[s.icon, selected && s.selectedIcon].filter(Boolean).join(' ')} onClick={() => owner.download(task.id)}><DownloadSimpleIcon size={18}/></IconButton></Tooltip>}
      {task.status === 'error' && <Tooltip content={t.retry}><IconButton label={`${t.retry}: ${task.file.name}`} variant="ghost" className={[s.icon, selected && s.selectedIcon].filter(Boolean).join(' ')} onClick={() => onMutate(() => owner.retry(task.id))}><ArrowClockwiseIcon size={18}/></IconButton></Tooltip>}
      <Tooltip content={t.remove}><IconButton label={`${t.remove}: ${task.file.name}`} variant="ghost" className={[s.icon, selected && s.selectedIcon].filter(Boolean).join(' ')} onClick={() => onMutate(() => owner.remove(task.id))}><TrashIcon size={18}/></IconButton></Tooltip>
    </div>
    {error && <p role="alert" className={[s.rowError, s.error].filter(Boolean).join(' ')}>{error}</p>}
  </li>;
}
