import { useId, useRef, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { DotsSixVerticalIcon, TrashIcon } from '@phosphor-icons/react';
import type { Locale } from '../../i18n/locale';
import { IconButton } from '../../ui/Button';
import { Tooltip } from '../../ui/Tooltip';
import { tr, type FileRow } from '../general/ui';
import { useFileDrag } from './use-file-drag';
import { mergeStyles as s } from './merge.styles';

export function PdfFileList({ rows, locale, disabled, onChange }: {
  rows: FileRow[]; locale: Locale; disabled: boolean; onChange: (rows: FileRow[]) => void;
}) {
  const host = useRef<HTMLUListElement>(null);
  const help = useId();
  const [announcement, setAnnouncement] = useState('');
  const move = (id: string, to: number) => {
    const from = rows.findIndex(row => row.id === id);
    if (disabled || from < 0 || to < 0 || to >= rows.length || to === from) return;
    const next = [...rows];
    const [row] = next.splice(from, 1); next.splice(to, 0, row);
    onChange(next);
    setAnnouncement(tr(locale, `${row.file.name} 已移至第 ${to + 1} 项，共 ${rows.length} 项。`,
      `${row.file.name} moved to position ${to + 1} of ${rows.length}.`));
  };
  const gesture = useFileDrag(host, rows.map(row => row.id), disabled, move);
  const from = rows.findIndex(row => row.id === gesture.drag?.id);
  const boundary = gesture.drag?.boundary ?? -1;
  const insertion = from >= 0 && boundary !== from && boundary !== from + 1 ? boundary : -1;
  if (!rows.length) return null;
  const helpText = tr(locale, '拖动排序，或聚焦手柄后使用上下方向键调整顺序；Escape 取消拖动。',
    'Drag to reorder, or focus a handle and use the Up and Down arrow keys. Escape cancels dragging.');
  return <div data-pdf-file-list>
    <ul ref={host} aria-label={tr(locale, 'PDF 文件顺序', 'PDF file order')} onClickCapture={gesture.clickCapture} {...stylex.props(s.list)}>
      {rows.map((row, index) => <li key={row.id} data-pdf-file-id={row.id}
        data-dragging={gesture.drag?.id === row.id || undefined} aria-disabled={disabled}
        data-insert={insertion === index ? 'before' : insertion === rows.length && index === rows.length - 1 ? 'after' : undefined}
        onPointerDown={e => gesture.pointerDown(row.id, e)} onTouchStart={e => gesture.touchStart(row.id, e)}
        onContextMenu={gesture.contextMenu}
        {...stylex.props(s.row, insertion === index && s.before, insertion === rows.length && index === rows.length - 1 && s.after)}>
        <Tooltip content={helpText}>
          <IconButton data-pdf-drag-handle label={tr(locale, `调整 ${row.file.name} 的顺序`, `Reorder ${row.file.name}`)}
            disabled={disabled} aria-describedby={help} aria-keyshortcuts="ArrowUp ArrowDown Home End"
            xstyle={[s.icon, s.handle]} onKeyDown={e => {
              const target = e.key === 'ArrowUp' ? index - 1 : e.key === 'ArrowDown' ? index + 1 : e.key === 'Home' ? 0 : e.key === 'End' ? rows.length - 1 : undefined;
              if (target !== undefined) { e.preventDefault(); move(row.id, target); }
            }}>
            <DotsSixVerticalIcon size={20} aria-hidden="true" />
          </IconButton>
        </Tooltip>
        <div {...stylex.props(s.info)}><span data-pdf-file-name {...stylex.props(s.name)}>{row.file.name}</span>
          <p {...stylex.props(s.detail)}>{(row.file.size / 1024).toFixed(1)} KB · {row.detail}</p>
        </div>
        <Tooltip content={tr(locale, '移除文件', 'Remove file')}>
          <IconButton label={tr(locale, `移除 ${row.file.name}`, `Remove ${row.file.name}`)} disabled={disabled}
            xstyle={s.icon} onClick={() => { if (!disabled) onChange(rows.filter(item => item.id !== row.id)); }}>
            <TrashIcon size={20} aria-hidden="true" />
          </IconButton>
        </Tooltip>
      </li>)}
    </ul>
    <p id={help} {...stylex.props(s.hidden)}>{helpText}</p>
    <p role="status" aria-live="polite" {...stylex.props(s.hidden)}>{announcement}</p>
  </div>;
}
