import { useEffect, useId, useState } from 'react';
import { CaretDownIcon, CaretRightIcon } from '@phosphor-icons/react';
import type { Locale } from '../../i18n/locale';
import { Button } from '../../ui/Button';
import { tr } from '../general/ui';
import { jsonPageSize, type JsonKind, type JsonNode } from './core';
import type { JsonProcessor } from './processing';
import s from './json.module.scss';

type TreeContext = {
  locale: Locale;
  source: string;
  revision: number;
  processor: JsonProcessor;
  selected?: number;
  inspect(node: JsonNode): void;
};

const kinds: Record<JsonKind, readonly [string, string]> = {
  object: ['对象', 'Object'],
  array: ['数组', 'Array'],
  string: ['字符串', 'String'],
  number: ['数字', 'Number'],
  boolean: ['布尔值', 'Boolean'],
  null: ['空值', 'Null'],
};

function characterBoundary(source: string, offset: number) {
  const code = source.charCodeAt(offset);
  return code >= 0xdc00 && code <= 0xdfff ? offset - 1 : offset;
}

function preview(source: string, from: number, to: number, limit: number) {
  const end = from + limit < to ? characterBoundary(source, from + limit) : to;
  return source.slice(from, end) + (end < to ? '…' : '');
}

function Pages({ locale, label, size, offset, total, change }: {
  locale: Locale;
  label?: string;
  size: number;
  offset: number;
  total: number;
  change(offset: number): void;
}) {
  if (total <= size) return null;
  return (
    <div className={s.pages} role={label ? 'group' : undefined} aria-label={label}>
      <Button size="sm" variant="ghost" disabled={offset === 0} onClick={() => change(offset - size)}>
        {tr(locale, '上一页', 'Previous')}
      </Button>
      <span aria-live="polite">{offset + 1}–{Math.min(offset + size, total)} / {total}</span>
      <Button size="sm" variant="ghost" disabled={offset + size >= total} onClick={() => change(offset + size)}>
        {tr(locale, '下一页', 'Next')}
      </Button>
    </div>
  );
}

function Children({ context, node, depth, id }: {
  context: TreeContext;
  node: JsonNode;
  depth: number;
  id: string;
}) {
  const { locale, processor, revision } = context;
  const [offset, setOffset] = useState(0);
  const [page, setPage] = useState<{ offset: number; nodes?: JsonNode[] }>();
  useEffect(() => {
    let current = true;
    void processor.children(revision, node.id, offset).then(
      nodes => { if (current) setPage({ offset, nodes }); },
      () => { if (current) setPage({ offset }); },
    );
    return () => { current = false; };
  }, [processor, revision, node.id, offset]);
  return (
    <div id={id}>
      {page?.offset !== offset
        ? <p className={s.treeNote}>{tr(locale, '加载节点…', 'Loading nodes…')}</p>
        : page.nodes
          ? <ul className={s.nodes}>{page.nodes.map(child => (
              <Branch key={child.id} node={child} depth={depth} context={context} />
            ))}</ul>
          : <p role="status" className={s.treeNote}>{tr(locale, '无法读取节点，请重新展开。', 'Could not read these nodes. Reopen the branch to retry.')}</p>}
      <Pages locale={locale} size={jsonPageSize} offset={offset} total={node.count} change={setOffset} />
    </div>
  );
}

function Branch({ node, depth, context }: {
  node: JsonNode;
  depth: number;
  context: TreeContext;
}) {
  const { locale, source, selected, inspect } = context;
  const [open, setOpen] = useState(depth === 0);
  const branch = useId();
  const container = node.kind === 'array' || node.kind === 'object';
  const title = depth === 0 ? '$' : node.key
    ? preview(source, ...node.key, 52)
    : '[' + node.index + ']';
  const kind = tr(locale, ...kinds[node.kind]);
  return (
    <li>
      <div className={s.node} style={{ paddingInlineStart: Math.min(12, depth) * 14 }}>
        {!!node.count && (
          <button
            type="button"
            className={s.twisty}
            aria-expanded={open}
            aria-controls={open ? branch : undefined}
            aria-label={open ? tr(locale, '收起 ' + title, 'Collapse ' + title) : tr(locale, '展开 ' + title, 'Expand ' + title)}
            onClick={() => setOpen(!open)}
          >
            {open ? <CaretDownIcon size={14} aria-hidden="true" /> : <CaretRightIcon size={14} aria-hidden="true" />}
          </button>
        )}
        <button type="button" className={s.nodeLabel} aria-pressed={selected === node.id} onClick={() => inspect(node)}>
          <span className={s.nodeKey}>{title}</span>
          <span className={s[node.kind]}>
            {container ? (node.kind === 'object' ? '{' + node.count + '}' : '[' + node.count + ']') : preview(source, node.from, node.to, 100)}
          </span>
          <span className={s.kind}>{kind}</span>
        </button>
      </div>
      {open && node.count > 0 && <Children context={context} node={node} depth={depth + 1} id={branch} />}
    </li>
  );
}

function NodeDetails({ node, context, close }: {
  node: JsonNode;
  context: TreeContext;
  close(): void;
}) {
  const { locale, source, processor, revision } = context;
  const [path, setPath] = useState<string>();
  const [failed, setFailed] = useState(false);
  const [offset, setOffset] = useState(0);
  const [pathOffset, setPathOffset] = useState(0);
  useEffect(() => {
    let current = true;
    void processor.path(revision, node.id).then(
      value => { if (current) setPath(value); },
      () => { if (current) setFailed(true); },
    );
    return () => { current = false; };
  }, [processor, revision, node.id]);
  const list = node.kind === 'array' || node.kind === 'object';
  const size = 2048;
  const valueLength = node.to - node.from;
  return (
    <div className={s.details}>
      <div className={s.path}>
        <code dir="ltr">{path ? path.slice(characterBoundary(path, pathOffset), characterBoundary(path, pathOffset + size))
          : failed ? tr(locale, '无法读取路径', 'Path unavailable') : '…'}</code>
        <Button size="sm" variant="ghost" onClick={close}>{tr(locale, '关闭', 'Close')}</Button>
      </div>
      {path && <Pages locale={locale} label={tr(locale, '路径分页', 'Path pages')}
        size={size} offset={pathOffset} total={path.length} change={setPathOffset} />}
      {!list && (
        <>
          <pre>{source.slice(characterBoundary(source, node.from + offset),
            characterBoundary(source, Math.min(node.from + offset + size, node.to)))}</pre>
          <Pages locale={locale} label={tr(locale, '值分页', 'Value pages')}
            size={size} offset={offset} total={valueLength} change={setOffset} />
        </>
      )}
    </div>
  );
}

export function JsonTree({ root, locale, source, revision, processor }: {
  root: JsonNode;
  locale: Locale;
  source: string;
  revision: number;
  processor: JsonProcessor;
}) {
  const [selected, setSelected] = useState<JsonNode>();
  const context = { locale, source, revision, processor, selected: selected?.id, inspect: setSelected };
  return (
    <section className={s.tree} aria-label={tr(locale, 'JSON 结构', 'JSON structure')}>
      <div tabIndex={0} className={s.treeScroll}>
        <ul className={s.nodes}><Branch node={root} depth={0} context={context} /></ul>
      </div>
      {selected && <NodeDetails key={selected.id} node={selected} context={context} close={() => setSelected(undefined)} />}
    </section>
  );
}
