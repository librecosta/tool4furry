import { useMemo, useState } from 'react';
import { Popover } from '@base-ui/react/popover';
import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react';
import { Button, IconButton } from '../../ui/Button';
import { TextField } from '../../ui/TextField';
import { captureColor, nodeKey } from './editor';
import { describeNode, flagHelp, reference, type Translate } from './reference';
import { limits, type Analysis, type ExpressionNode, type Range } from './protocol';
import { Railroad } from './Railroad';
import s from './workbench.module.scss';

export function Pager({ page, size, count, onChange, t }: {
  page: number; size: number; count: number; onChange: (page: number) => void; t: Translate;
}) {
  const pages = Math.ceil(count / size);
  if (pages < 2) return null;
  return <div className={s.pager}>
    <IconButton size="sm" variant="ghost" disabled={page <= 0}
      label={t('上一页', 'Previous page')} onClick={() => onChange(page - 1)}><CaretLeftIcon /></IconButton>
    <span>{page + 1} / {pages}</span>
    <IconButton size="sm" variant="ghost" disabled={page + 1 >= pages}
      label={t('下一页', 'Next page')} onClick={() => onChange(page + 1)}><CaretRightIcon /></IconButton>
  </div>;
}

export function valueLabel(value: string | null, t: Translate, max = 512) {
  if (value === null) return t('未参与匹配', 'Did not participate');
  if (value === '') return t('空字符串', 'Empty string');
  return value.length <= max ? value : value.slice(0, max) + '…';
}
export const rangeLabel = (range?: Range | null) => range && '[' + range[0] + ', ' + range[1] + ')';

export function Explanation({ analysis, pattern, flags, current, onNode, t }: {
  analysis?: Analysis; pattern: string; flags: string; current?: string;
  onNode: (node: ExpressionNode) => void; t: Translate;
}) {
  const [diagram, setDiagram] = useState(false), [page, setPage] = useState(0);
  const entries = useMemo(() => {
    const rows: { node: ExpressionNode; depth: number }[] = [];
    const visit = (node: ExpressionNode, depth: number) => {
      const show = node.kind !== 'pattern' && (node.kind !== 'sequence' || node.children.length === 0 || depth > 0);
      if (show) rows.push({ node, depth });
      node.children.forEach(child => visit(child, depth + Number(show)));
    };
    if (analysis?.root) visit(analysis.root, 0);
    return rows;
  }, [analysis?.root]);
  const selected = entries.findIndex(entry => nodeKey(entry.node) === current);
  const size = 32;
  const visiblePage = Math.min(page, Math.max(0, Math.ceil(entries.length / size) - 1));
  const cannotDiagram = !analysis?.nodes || analysis.nodes > limits.diagramNodes;
  if (!analysis?.root) return <p className={s.empty}>{analysis?.limited
    ? (analysis.limited === 'budget'
      ? t('表达式结构超出解释预算。可使用原生引擎继续执行。', 'Expression structure exceeds the explanation budget. Native execution is still available.')
      : t('解释器暂不支持此语法。执行以浏览器原生引擎为准。', 'The explanation parser does not support this syntax. The browser’s native engine controls execution.'))
    : t('输入有效表达式后查看结构解释。', 'Enter a valid expression to inspect its structure.')}</p>;
  return <div className={s.explanation}>
    <div className={s.actions}>
      <Button size="sm" variant="ghost" aria-pressed={!diagram} onClick={() => setDiagram(false)}>{t('逐项解释', 'Explanation')}</Button>
      <Button size="sm" variant="ghost" aria-pressed={diagram} disabled={cannotDiagram}
        onClick={() => setDiagram(true)}>{t('结构图', 'Railroad diagram')}</Button>
      {selected >= 0 && Math.floor(selected / size) !== visiblePage && <Button size="sm" variant="ghost"
        onClick={() => { setDiagram(false); setPage(Math.floor(selected / size)); }}>{t('查看当前节点', 'Show selected node')}</Button>}
    </div>
    {cannotDiagram ? <p className={s.note}>{t('图形超过复杂度预算。仍可查看逐项解释。', 'The diagram exceeds its complexity budget. The text explanation remains available.')}</p> : null}
    {diagram && !cannotDiagram
      ? <Railroad root={analysis.root} pattern={pattern} active={current} onPick={onNode} t={t} />
      : <>
        {entries.slice(visiblePage * size, (visiblePage + 1) * size).map(({ node, depth }) =>
          <button type="button" className={s.astRow} aria-current={nodeKey(node) === current || undefined}
            style={{ paddingInlineStart: Math.min(depth, 5) * 10 + 8 }}
            key={nodeKey(node)} onClick={() => onNode(node)}>
            <code className={node.group ? captureColor(node.group) : undefined}>{valueLabel(pattern.slice(node.from, node.to), t, 36)}</code>
            <span>{describeNode(node, t)}</span>
          </button>)}
        <Pager t={t} page={visiblePage} size={size} count={entries.length} onChange={setPage} />
      </>}
    {!!flags.length && <div className={s.flagSummary}>
      {[...flags].map(flag => <span key={flag}><code>{flag}</code> {flagHelp[flag] && t(...flagHelp[flag])}</span>)}
    </div>}
  </div>;
}

export function QuickReference({ t, insert, initial = 'all' }: {
  t: Translate; insert: (value: string, replacement: boolean) => void; initial?: string;
}) {
  const [category, setCategory] = useState(initial), [query, setQuery] = useState('');
  const normalized = query.trim().toLowerCase();
  const groups = reference.filter(group => category === 'all' || group.id === category)
    .map(group => ({ ...group, entries: group.entries.filter(entry => entry.some(part => part.toLowerCase().includes(normalized))) }));
  return <div className={s.reference}>
    <TextField label={t('搜索语法', 'Search syntax')} value={query} onChange={setQuery} />
    <div className={s.actions}>
      <Button size="sm" variant="ghost" aria-pressed={category === 'all'} onClick={() => setCategory('all')}>{t('全部', 'All')}</Button>
      {reference.map(group => <Button key={group.id} size="sm" variant="ghost" aria-pressed={category === group.id}
        onClick={() => setCategory(group.id)}>{t(group.title[0], group.title[1])}</Button>)}
    </div>
    {groups.map(group => group.entries.length > 0 && <section key={group.id}>
      <h3>{t(group.title[0], group.title[1])}</h3>
      {group.entries.map(([value, zh, en]) => <Popover.Close key={value} className={s.astRow}
        onClick={() => requestAnimationFrame(() => insert(value, group.id === 'replacement'))} aria-label={t('插入 ', 'Insert ') + value}>
        <code>{value}</code><span>{t(zh, en)}</span>
      </Popover.Close>)}
    </section>)}
    {groups.every(group => !group.entries.length) && <p className={s.empty}>{t('没有找到相关语法。', 'No syntax matches your search.')}</p>}
  </div>;
}
