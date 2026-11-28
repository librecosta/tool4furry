import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CaretDownIcon, CaretRightIcon } from '@phosphor-icons/react';
import { Button } from '../../ui/Button';
import { CopyAction } from './CopyAction';
import { captureColor } from './editor';
import { Pager, rangeLabel, valueLabel } from './Inspector';
import { matchLines, matchRowHeight, matchWindow } from './match-window';
import type { Analysis, Range, RegexMatch, RegexResult } from './protocol';
import type { Translate } from './reference';
import s from './workbench.module.scss';

function Captures({ match, analysis, locate, measure, t }: {
  match: RegexMatch; analysis?: Analysis; locate: (range: Range) => void;
  measure: (height: number) => void; t: Translate;
}) {
  const details = useRef<HTMLDivElement>(null);
  const [indices, showIndices] = useState(false), [page, setPage] = useState(0);
  useLayoutEffect(() => {
    const element = details.current!;
    const resize = () => measure(element.getBoundingClientRect().height);
    const observer = new ResizeObserver(resize);
    resize();
    observer.observe(element);
    return () => observer.disconnect();
  }, [measure]);
  const groups = match.groups.map((value, index) => ({
    title: analysis?.captures?.[index]?.name ?? t('组 ', 'Group ') + (index + 1),
    range: match.ranges?.[index], value, color: index + 1,
  }));
  if (!analysis?.captures) for (const [name, value] of Object.entries(match.named)) {
    const range = match.namedRanges?.[name];
    const corresponding = match.ranges?.findIndex(item => item && item === range) ?? -1;
    if (corresponding >= 0) groups[corresponding].title = name;
    else groups.push({ title: name, range, value, color: groups.length + 1 });
  }
  const pageSize = 12;
  return <div className={s.captureDetails} ref={details}>
    {groups.slice(page * pageSize, (page + 1) * pageSize).map((group, index) => {
      const content = <>
        <span><i aria-hidden="true" className={captureColor(group.color)} />{group.title}</span>
        <code data-empty={!group.value || undefined}>{valueLabel(group.value, t, 120)}</code>
        {indices && group.range && <small>{rangeLabel(group.range)}</small>}
      </>;
      const key = page * pageSize + index;
      return group.range ? <button type="button" key={key} className={s.capture} onClick={() => locate(group.range!)}>
        {content}
      </button> : <div key={key} className={s.capture}>{content}</div>;
    })}
    <Pager t={t} page={page} size={pageSize} count={groups.length} onChange={setPage} />
    <Button size="sm" variant="ghost" className={s.compactButton} aria-expanded={indices}
      onClick={() => showIndices(value => !value)}>{t('详细索引', 'Detailed indices')}{indices ? <CaretDownIcon /> : <CaretRightIcon />}</Button>
    {indices && <p className={s.note}>
      {t('匹配范围', 'Match range')} <code>{rangeLabel([match.index, match.end])}</code> · {t('UTF-16 索引', 'UTF-16 indices')}
      {!match.ranges && <> · {t('浏览器未提供捕获范围', 'Capture ranges unavailable in this browser')}</>}
    </p>}
  </div>;
}

export function MatchResults({ result, text, active, analysis, onSelect, locate, t }: {
  result?: RegexResult; text: string; active: number; analysis?: Analysis;
  onSelect: (index: number) => void; locate: (range: Range) => void; t: Translate;
}) {
  const copyValue = result?.matches.length && !result.issue && !result.partial
    ? () => result.matches.map(match => match.value).join('\n') : undefined;
  return <div className={s.resultPane}>
    <header className={s.paneHeader}>
      <strong>{t('匹配结果', 'Matches')}</strong>
      <CopyAction label={t('复制全部结果', 'Copy all matches')} value={copyValue} t={t} />
    </header>
    {!!result?.matches.length && <MatchList {...{ result, text, active, analysis, onSelect, locate, t }} />}
    {!result?.matches.length && <div className={s.resultEmpty}>{result?.count === 0
      ? t('未找到匹配。', 'No matches found.') : t('匹配结果将在这里显示。', 'Matches will appear here.')}</div>}
  </div>;
}

function MatchList({ result, text, active, analysis, onSelect, locate, t }: {
  result: RegexResult; text: string; active: number; analysis?: Analysis;
  onSelect: (index: number) => void; locate: (range: Range) => void; t: Translate;
}) {
  const scrollRef = useRef<HTMLDivElement>(null), focusRow = useRef<number>(null);
  const lastSelection = useRef<{ result: RegexResult; active: number }>(null);
  const [scroll, setScroll] = useState(0), [viewport, setViewport] = useState(400);
  const [disclosure, setDisclosure] = useState<{ result: RegexResult; index: number }>();
  const [measured, measure] = useState(0);
  const matches = result.matches;
  const expanded = disclosure?.result === result ? disclosure.index : -1;
  const lines = useMemo(() => matchLines(text, matches), [text, matches]);
  const { start, end, offset, height } = matchWindow(matches.length, expanded, expanded < 0 ? 0 : measured, scroll, viewport);
  const rendered = Array.from({ length: end - start }, (_, index) => start + index);
  if (expanded >= 0 && expanded < start) rendered.unshift(expanded);
  else if (expanded >= end) rendered.push(expanded);

  useLayoutEffect(() => {
    const element = scrollRef.current!;
    const resize = () => setViewport(element.clientHeight);
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const element = scrollRef.current!;
    const previous = lastSelection.current;
    if (previous?.result !== result || previous.active !== active || focusRow.current !== null) {
      const top = offset(active);
      if (top < element.scrollTop) element.scrollTop = top;
      else if (top + matchRowHeight > element.scrollTop + element.clientHeight)
        element.scrollTop = top + matchRowHeight - element.clientHeight;
      lastSelection.current = { result, active };
      setScroll(element.scrollTop);
    }
    if (focusRow.current !== null && focusRow.current >= start && focusRow.current < end) {
      element.querySelector<HTMLButtonElement>('[data-match-row="' + focusRow.current + '"]')?.focus({ preventScroll: true });
      focusRow.current = null;
    }
  });

  return <div className={s.matchScroll} ref={scrollRef} data-match-scroll tabIndex={active < start || active >= end ? 0 : undefined}
    role="region" aria-label={t('匹配结果列表', 'Match list')} onScroll={event => setScroll(event.currentTarget.scrollTop)}
    onKeyDown={event => {
      const element = event.target as HTMLElement;
      if (element !== event.currentTarget && !element.hasAttribute('data-match-row')) return;
      const steps: Record<string, number> = { ArrowDown: active + 1, ArrowUp: active - 1, Home: 0, End: matches.length - 1 };
      if (!Object.hasOwn(steps, event.key)) return;
      const next = steps[event.key];
      event.preventDefault();
      focusRow.current = Math.max(0, Math.min(matches.length - 1, next));
      onSelect(focusRow.current);
    }}>
    <ol className={s.matchWindow} style={{ height }}>
      {rendered.map(index => {
        const match = matches[index], open = expanded === index, groups = match.groups.length > 0;
        return <li key={index} style={{ top: offset(index) }} aria-posinset={index + 1} aria-setsize={matches.length}
          inert={index < start || index >= end ? true : undefined}>
          <button type="button" className={s.matchRow} data-match-row={index}
            aria-current={active === index || undefined} aria-expanded={groups ? open : undefined}
            tabIndex={active === index ? 0 : -1}
            onClick={() => {
              onSelect(index);
              if (!open) measure(0);
              setDisclosure(groups && !open ? { result, index } : undefined);
              locate([match.index, match.end]);
            }}>
            <span className={s.matchNumber}>
              {groups && (open ? <CaretDownIcon /> : <CaretRightIcon />)}
              {String(index + 1).padStart(2, '0')}
            </span>
            <code title={match.value.length <= 512 ? match.value : undefined}
              data-empty={!match.value || undefined}>{match.value ? valueLabel(match.value, t, 120) : t('零长度匹配', 'Zero-width match')}</code>
            <small>{t('第 ' + lines[index] + ' 行', 'Line ' + lines[index])}</small>
          </button>
          {open && <Captures key={index} {...{ match, analysis, locate, measure, t }} />}
        </li>;
      })}
    </ol>
  </div>;
}
