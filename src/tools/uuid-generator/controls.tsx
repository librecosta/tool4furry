import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CaretLeftIcon, CaretRightIcon, CopyIcon } from '@phosphor-icons/react';
import { Button, IconButton } from '../../ui/Button';
import { Tooltip } from '../../ui/Tooltip';
import { representations, type GenerationVersion, type Representation } from './core';
import s from './workbench.module.scss';

export type Translate = (zh: string, en: string) => string;

export const versionLabel = (version: GenerationVersion) => version === 'nil' ? 'Nil' : version === 'max' ? 'Max' : 'UUID ' + version;
export function versionPurpose(version: GenerationVersion, t: Translate) {
  return {
    v1: t('使用 Gregorian 时间和随机节点标识。', 'Uses Gregorian time and a random node identifier.'),
    v3: t('使用命名空间、名称和 MD5 生成确定的标识符。', 'Derives a stable identifier from a namespace and name using MD5.'),
    v4: t('适合大多数场景的随机标识符。', 'Random identifiers for most use cases.'),
    v5: t('使用命名空间、名称和 SHA-1 生成确定的标识符。', 'Derives a stable identifier from a namespace and name using SHA-1.'),
    v6: t('按时间排序的 Gregorian 时间型标识符。', 'Gregorian time identifiers arranged for chronological sorting.'),
    v7: t('适合需要按时间排序的标识符。', 'Identifiers suited to chronological sorting.'),
    nil: t('所有 128 位均为 0。', 'All 128 bits are zero.'),
    max: t('所有 128 位均为 1。', 'All 128 bits are one.'),
  }[version];
}

export function formatOptions(t: Translate): { value: Representation; label: string }[] {
  const labels = [t('标准格式', 'Standard'), t('大写', 'Uppercase'), t('无连字符', 'Compact'), 'GUID', 'URN', 'Base64', 'Base64URL'];
  return representations.map((value, index) => ({ value, label: labels[index] }));
}

export function Choices<V extends string | number>({ label, value, items, onChange }: {
  label: string; value: V; items: readonly { value: V; label: ReactNode }[]; onChange: (value: V) => void;
}) {
  return <div className={s.choices} role="group" aria-label={label}>
    {items.map(item => <button type="button" key={item.value} aria-pressed={item.value === value}
      onClick={() => onChange(item.value)}>{item.label}</button>)}
  </div>;
}

export function UuidCopy({ value, label, t, icon = false, disabled, onError }: {
  value?: string | (() => string); label: string; t: Translate; icon?: boolean; disabled?: boolean;
  onError?: (error: unknown) => void;
}) {
  const [status, setStatus] = useState('');
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  async function copy() {
    if (value === undefined) return;
    let text: string;
    try {
      text = typeof value === 'function' ? value() : value;
    } catch (error) {
      onError?.(error);
      return;
    }
    let message: string;
    try {
      await navigator.clipboard.writeText(text);
      message = t('已复制', 'Copied');
    } catch {
      message = t('无法访问剪贴板，请手动复制。', 'Clipboard access failed. Select and copy the text manually.');
    }
    clearTimeout(timer.current);
    setStatus(message);
    setOpen(true);
    timer.current = setTimeout(() => {
      setStatus('');
      setOpen(false);
    }, 1700);
  }
  const glyph = <CopyIcon size={icon ? 16 : 18} aria-hidden="true" />;
  return <Tooltip borderless content={status ? <span role="status">{status}</span> : label}
    open={open} onOpenChange={setOpen}>
    {icon ? <IconButton label={label} variant="ghost" size="sm" className={s.copyIcon} disabled={value === undefined || disabled}
      onClick={() => void copy()}>{glyph}</IconButton>
      : <Button variant="primary" disabled={value === undefined || disabled} onClick={() => void copy()}>{glyph}{label}</Button>}
  </Tooltip>;
}

export const visibleRows = 50;

export function PageControls({ total, page, setPage, t }: {
  total: number; page: number; setPage: (value: number) => void; t: Translate;
}) {
  if (total <= visibleRows) return null;
  const pageCount = Math.ceil(total / visibleRows);
  return <div className={s.pagination} aria-label={t('结果分页', 'Result pages')}>
    <IconButton label={t('上一页', 'Previous page')} variant="ghost" size="sm" disabled={page === 0}
      onClick={() => setPage(page - 1)}><CaretLeftIcon aria-hidden="true" /></IconButton>
    <span aria-live="polite">{page + 1} / {pageCount}</span>
    <IconButton label={t('下一页', 'Next page')} variant="ghost" size="sm" disabled={page + 1 >= pageCount}
      onClick={() => setPage(page + 1)}><CaretRightIcon aria-hidden="true" /></IconButton>
  </div>;
}

export function UuidRows({ values, offset = 0, t }: { values: readonly string[]; offset?: number; t: Translate }) {
  return <ol className={s.rows} aria-label={t('生成结果', 'Generated results')} start={offset + 1}>
    {values.map((value, index) => <li key={offset + index} data-uuid-row>
      <span aria-hidden="true">{String(offset + index + 1).padStart(2, '0')}</span>
      <code>{value}</code>
      <UuidCopy icon value={value} label={t('复制第 ' + (offset + index + 1) + ' 条 UUID', 'Copy UUID ' + (offset + index + 1))} t={t} />
    </li>)}
  </ol>;
}
