import { useId, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { DotsSixVerticalIcon, TrashIcon } from '@phosphor-icons/react';
import { DragDropProvider, type DragEndEvent } from '@dnd-kit/react';
import { isSortable, useSortable } from '@dnd-kit/react/sortable';
import { Accessibility, Feedback, PointerActivationConstraints, PointerSensor } from '@dnd-kit/dom';
import type { Locale } from '../../i18n/locale';
import { IconButton } from '../../ui/Button';
import { Tooltip } from '../../ui/Tooltip';
import { tr, type FileRow } from '../general/ui';
import { mergeStyles as s } from './merge.styles';

// Bind pointer input to the row, while keeping the grip as the keyboard handle.
// Touch scrolling stays native until a stationary long press activates sorting.
const pointer = PointerSensor.configure({
  activatorElements: source => [source.element],
  activationConstraints: event => event.pointerType === 'touch'
    ? [new PointerActivationConstraints.Delay({ value: 250, tolerance: 6 })]
    : [new PointerActivationConstraints.Distance({ value: 5 })],
});
const transition = { duration: 200, easing: 'ease-out', idle: true };

export function PdfFileList({ rows, locale, disabled, sorting, onSortingChange, onChange }: {
  rows: FileRow[]; locale: Locale; disabled: boolean; sorting: boolean;
  onSortingChange: (sorting: boolean) => void; onChange: (rows: FileRow[]) => void;
}) {
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
  if (!rows.length) return null;
  const helpText = tr(locale, '拖动排序，或聚焦手柄后使用上下方向键调整顺序；Escape 取消拖动。',
    'Drag to reorder, or focus a handle and use the Up and Down arrow keys. Escape cancels dragging.');
  return <div data-pdf-file-list>
    <DragDropProvider
      sensors={defaults => [...defaults.filter(sensor => sensor !== PointerSensor), pointer]}
      plugins={defaults => [...defaults,
        Feedback.configure({ dropAnimation: transition }),
        Accessibility.configure({ screenReaderInstructions: { draggable: helpText }, announcements: {
          dragstart: () => tr(locale, '开始调整文件顺序。', 'Reordering files.'),
          dragend: (event: DragEndEvent) => event.canceled ? tr(locale, '已取消排序。', 'Reordering canceled.')
            : tr(locale, '文件顺序已更新。', 'File order updated.'),
        } }),
      ]}
      onBeforeDragStart={event => { if (disabled) event.preventDefault(); }}
      onDragStart={() => onSortingChange(true)}
      onDragEnd={event => {
        const { source } = event.operation;
        if (!event.canceled && !disabled && isSortable(source)) move(String(source.id), source.index);
        onSortingChange(false);
      }}>
      <ul aria-label={tr(locale, 'PDF 文件顺序', 'PDF file order')} {...stylex.props(s.list)}>
        {rows.map((row, index) => <SortablePdfRow key={row.id} row={row} index={index} locale={locale}
          disabled={disabled} sorting={sorting} help={help} helpText={helpText}
          move={to => move(row.id, to)} count={rows.length}
          remove={() => { if (!disabled && !sorting) onChange(rows.filter(item => item.id !== row.id)); }} />)}
      </ul>
    </DragDropProvider>
    <p id={help} {...stylex.props(s.hidden)}>{helpText}</p>
    <p role="status" aria-live="polite" {...stylex.props(s.hidden)}>{announcement}</p>
  </div>;
}

function SortablePdfRow({ row, index, locale, disabled, sorting, help, helpText, move, count, remove }: {
  row: FileRow; index: number; locale: Locale; disabled: boolean; sorting: boolean;
  help: string; helpText: string; move: (to: number) => void; count: number; remove: () => void;
}) {
  const { ref, handleRef, isDragSource } = useSortable({ id: row.id, index, disabled, transition });
  return <li ref={ref} data-pdf-file-id={row.id} data-dragging={isDragSource || undefined}
    aria-disabled={disabled} {...stylex.props(s.row)}>
        <Tooltip content={helpText}>
          <IconButton ref={handleRef} data-pdf-drag-handle label={tr(locale, `调整 ${row.file.name} 的顺序`, `Reorder ${row.file.name}`)}
            disabled={disabled} aria-describedby={help} aria-keyshortcuts="ArrowUp ArrowDown Home End"
            xstyle={[s.icon, s.handle]} onKeyDown={e => {
              if (sorting) return;
              const target = e.key === 'ArrowUp' ? index - 1 : e.key === 'ArrowDown' ? index + 1 : e.key === 'Home' ? 0 : e.key === 'End' ? count - 1 : undefined;
              if (target !== undefined) { e.preventDefault(); move(target); }
            }}>
            <DotsSixVerticalIcon size={20} aria-hidden="true" />
          </IconButton>
        </Tooltip>
        <div {...stylex.props(s.info)}><span data-pdf-file-name {...stylex.props(s.name)}>{row.file.name}</span>
          <p {...stylex.props(s.detail)}>{(row.file.size / 1024).toFixed(1)} KB · {row.detail}</p>
        </div>
        <Tooltip content={tr(locale, '移除文件', 'Remove file')}>
          <IconButton label={tr(locale, `移除 ${row.file.name}`, `Remove ${row.file.name}`)} disabled={disabled || sorting}
            xstyle={s.icon} onClick={remove}>
            <TrashIcon size={20} aria-hidden="true" />
          </IconButton>
        </Tooltip>
    </li>;
}
