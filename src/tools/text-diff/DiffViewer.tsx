import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Locale } from '../../i18n/locale';
import { Button } from '../../ui/Button';
import { CheckboxField } from '../../ui/CheckboxField';
import { tr } from '../general/ui';
import type { DiffResult } from './core';
import { displayRows, endingLabel } from './report';
import form from '../../workbench/form-tool-layout.module.scss';
import s from './diff.module.scss';

const rowHeight = 28;
export function DiffViewer({ locale, result, busy, error, ignore, setIgnore, changesOnly, setChangesOnly, actions, message }: {
  locale: Locale; result?: DiffResult; busy: boolean; error?: string;
  ignore: boolean; setIgnore: (value: boolean) => void;
  changesOnly: boolean; setChangesOnly: (value: boolean) => void;
  actions: ReactNode; message: string;
}) {
  const rows = useMemo(() => result ? displayRows(result, changesOnly) : [], [result, changesOnly]);
  const scroll = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, height: 420 });
  useEffect(() => {
    if (scroll.current) scroll.current.scrollTop = 0;
    setPosition(previous => ({ ...previous, top: 0 }));
  }, [rows]);
  useEffect(() => {
    const element = scroll.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => setPosition({ top: element.scrollTop, height: element.clientHeight }));
    observer.observe(element);
    return () => observer.disconnect();
  }, [rows.length > 0]);
  const virtual = rows.length > 500;
  const start = virtual ? Math.min(Math.max(0, Math.floor(position.top / rowHeight) - 10), Math.max(0, rows.length - 1)) : 0;
  const end = virtual ? Math.min(rows.length, start + Math.ceil(position.height / rowHeight) + 20) : rows.length;
  const summary = result
    ? result.changes ? tr(locale, `+${result.added} 新增 · −${result.removed} 删除`, `+${result.added} added · −${result.removed} removed`)
      : result.eof.changed ? tr(locale, '行内容相同，末尾换行不同', 'Same line content; EOF newline differs')
        : result.endings.old !== result.endings.new && result.oldCount && result.newCount
          ? tr(locale, '行内容相同，换行格式不同', 'Same line content; line endings differ')
          : tr(locale, '没有发现差异', 'No differences')
    : busy ? tr(locale, '正在比较…', 'Comparing…') : '';
  const eof = (value: boolean) => tr(locale, value ? '有' : '无', value ? 'yes' : 'no');
  return (
    <section className={s.viewer} aria-label={tr(locale, '差异结果', 'Differences')} aria-busy={busy} data-diff-viewer>
      <header className={s.header}>
        <h2>{tr(locale, '差异结果', 'Differences')}</h2>
        <div className={s.actions}>{actions}</div>
      </header>
      <div className={s.toolbar}>
        <div className={form.segmented} role="group" aria-label={tr(locale, '差异视图', 'Difference view')}>
          {[false, true].map(value => <Button key={String(value)} variant="ghost" className={[form.segment, changesOnly === value && form.segmentSelected].filter(Boolean).join(' ')} aria-pressed={changesOnly === value} onClick={() => setChangesOnly(value)}>
            {value ? tr(locale, '仅变化', 'Changes only') : tr(locale, '全部', 'All')}
          </Button>)}
        </div>
        <CheckboxField label={tr(locale, '忽略行尾空白', 'Ignore trailing whitespace')} checked={ignore} onCheckedChange={setIgnore} />
        <span className={s.summary} role="status">{summary}</span>
      </div>
      {error && <p role="alert" className={s.error}>{error}</p>}
      {rows.length > 0 ? <div role="table" aria-label={tr(locale, '逐行差异', 'Line differences')} aria-rowcount={rows.length + 1} aria-colcount={4} className={s.table}>
        <div role="row" className={s.columns}>
          <span role="columnheader">{tr(locale, '原文', 'Old')}</span>
          <span role="columnheader">{tr(locale, '新文', 'New')}</span>
          <span role="columnheader" aria-label={tr(locale, '增删标识', 'Change')} />
          <span role="columnheader">{tr(locale, '内容', 'Text')}</span>
        </div>
        <div ref={scroll} className={s.scroll} role="rowgroup" tabIndex={0} aria-label={tr(locale, '滚动差异行', 'Scroll difference lines')} onScroll={event => setPosition({ top: event.currentTarget.scrollTop, height: event.currentTarget.clientHeight })}>
          <div className={s.rows}>
            {virtual && <div aria-hidden="true" style={{ height: start * rowHeight }} />}
            {rows.slice(start, end).map((row, offset) => row.kind === 'gap'
              ? <div key={start + offset} role="row" aria-rowindex={start + offset + 2} className={s.gap}><span role="cell" aria-colspan={4}>… {tr(locale, `已隐藏 ${row.count} 行未变化内容`, `${row.count} unchanged lines hidden`)} …</span></div>
              : <div key={start + offset} role="row" aria-rowindex={start + offset + 2} className={[s.row, s[row.line.type], !row.text.trim() && s.blank].filter(Boolean).join(' ')} data-diff-type={row.line.type} data-old-line={row.oldNumber} data-new-line={row.newNumber}>
                <span role="cell" className={s.number}>{row.oldNumber}</span>
                <span role="cell" className={s.number}>{row.newNumber}</span>
                <span role="cell" className={s.sign} aria-label={row.line.type === 'added' ? tr(locale, '新增', 'Added') : row.line.type === 'removed' ? tr(locale, '删除', 'Removed') : undefined}>{row.line.type === 'added' ? '+' : row.line.type === 'removed' ? '−' : ''}</span>
                <span role="cell" className={s.text} title={row.text}>{row.text}</span>
              </div>)}
            {virtual && <div aria-hidden="true" style={{ height: (rows.length - end) * rowHeight }} />}
          </div>
        </div>
      </div> : !error && !busy && <p className={s.empty}>{result?.oldCount || result?.newCount ? tr(locale, '当前视图没有变化行。', 'No changed lines in this view.') : tr(locale, '输入文本，即可在这里查看差异。', 'Enter text to see the differences here.')}</p>}
      {result?.eof.changed && <p className={s.meta} data-eof-change>{tr(locale, '末尾换行（原文 → 新文）', 'EOF newline (original → revised)')}: {eof(result.eof.old)} → {eof(result.eof.new)}</p>}
      {result && result.oldCount > 0 && result.newCount > 0 && result.endings.old !== 'none' && result.endings.new !== 'none' && result.endings.old !== result.endings.new && <p className={s.meta}>{tr(locale, '换行符', 'Line endings')}: {endingLabel(result.endings.old, locale)} → {endingLabel(result.endings.new, locale)}</p>}
      {message && <p role="status" className={s.meta}>{message}</p>}
    </section>
  );
}
