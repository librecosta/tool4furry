import { useId } from 'react';
import { Checkbox } from '@base-ui/react/checkbox';
import { CaretRightIcon, CheckIcon, MinusIcon, FileIcon, FolderIcon, FolderOpenIcon, TrashIcon, DownloadSimpleIcon } from '@phosphor-icons/react';
import { IconButton } from '../../ui/Button';
import { Tooltip } from '../../ui/Tooltip';
import type { Locale } from '../../i18n/locale';
import { tr } from '../general/ui';
import { selectionState, type ZipNode } from './tree';
import s from './zip.module.scss';

export function zipSize(bytes: number) {
  return bytes >= 1024 ** 2 ? `${(bytes / 1024 ** 2).toFixed(1)} MiB` : bytes >= 1024 ? `${(bytes / 1024).toFixed(1)} KiB` : `${bytes} B`;
}

type Props = {
  nodes: ZipNode[]; locale: Locale; disabled: boolean;
  folds: ReadonlyMap<string, boolean>; onFold: (path: string, expanded: boolean) => void;
  selected?: ReadonlySet<string>; onSelect?: (paths: string[], checked: boolean) => void;
  onRemove?: (path: string) => void; onDownload?: (path: string) => void;
};

export function ArchiveTree({nodes, locale, disabled, folds, onFold, selected, onSelect, onRemove, onDownload}: Props) {
  const id = useId();
  const branch = (list: ZipNode[], depth: number) => <ul className={depth ? s.children : s.tree}>
    {list.map(node => {
      const folder = !!node.children, expanded = folds.get(node.path) ?? depth < 2;
      const state = selectionState(node.files, selected ?? new Set());
      const action = onRemove ? tr(locale, '移除', 'Remove') : tr(locale, '下载文件', 'Download file');
      return <li key={node.path}>
        <div className={s.fileRow} data-zip-path={node.path} data-folder={folder || undefined}>
          {folder ? <button type="button" className={s.fold} aria-expanded={expanded} aria-controls={`${id}-${node.path}`} aria-label={tr(locale, `${expanded ? '收起' : '展开'} ${node.path}`, `${expanded ? 'Collapse' : 'Expand'} ${node.path}`)} onClick={() => onFold(node.path, expanded)}><CaretRightIcon size={14} aria-hidden="true" /></button> : <span className={s.foldSpace} />}
          {onSelect && <Checkbox.Root className={s.check} checked={state.checked} indeterminate={state.indeterminate} onCheckedChange={checked => onSelect(node.files, checked)} disabled={disabled} aria-label={tr(locale, `选择 ${node.path}`, `Select ${node.path}`)}>
            <Checkbox.Indicator className={s.indicator}>{state.indeterminate ? <MinusIcon size={14} weight="bold" aria-hidden="true" /> : <CheckIcon size={14} weight="bold" aria-hidden="true" />}</Checkbox.Indicator>
          </Checkbox.Root>}
          {folder ? expanded ? <FolderOpenIcon size={20} aria-hidden="true" className={s.fileIcon} /> : <FolderIcon size={20} aria-hidden="true" className={s.fileIcon} /> : <FileIcon size={20} aria-hidden="true" className={s.fileIcon} />}
          <span className={s.fileInfo}><span className={s.fileName} title={node.path}>{node.name}</span>{onRemove && !folder && node.path.includes('/') && <span className={s.path} title={node.path}>{node.path.slice(0, node.path.lastIndexOf('/'))}/</span>}</span>
          <span className={s.size}>{zipSize(node.size)}</span>
          {!folder && <Tooltip content={action}><IconButton label={`${action}：${node.path}`} className={s.iconAction} disabled={disabled} onClick={() => onRemove ? onRemove(node.path) : onDownload?.(node.path)}>{onRemove ? <TrashIcon size={18} aria-hidden="true" /> : <DownloadSimpleIcon size={18} aria-hidden="true" />}</IconButton></Tooltip>}
        </div>
        {folder && <div id={`${id}-${node.path}`} hidden={!expanded}>{expanded && branch(node.children!, depth + 1)}</div>}
      </li>;
    })}
  </ul>;
  return branch(nodes, 0);
}
