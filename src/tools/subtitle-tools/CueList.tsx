import { useEffect, useId, useRef, useState } from 'react';
import { PencilSimpleIcon } from '@phosphor-icons/react';
import type { Locale } from '../../i18n/locale';
import { Button, IconButton } from '../../ui/Button';
import { Tooltip } from '../../ui/Tooltip';
import { tr } from '../general/ui';
import { formatTime, type Cue } from './core';
import s from './subtitle.module.scss';

const perPage = 40;
export const cueTime = (ms: number) => formatTime(ms).replace(/^00:/, '');
export function cueCount(count: number, locale: Locale) {
  const number = count.toLocaleString(locale);
  return locale === 'zh' ? number + ' 条字幕' : number + (count === 1 ? ' cue' : ' cues');
}

export default function CueList({ cues, offset, locale, editable, disabled, edit }: {
  cues: readonly Cue[];
  offset: number;
  locale: Locale;
  editable: boolean;
  disabled: boolean;
  edit: (index: number) => void;
}) {
  const heading = useId(), scroll = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const pages = Math.ceil(cues.length / perPage);
  const start = page * perPage, end = Math.min(start + perPage, cues.length);
  useEffect(() => {
    if (scroll.current) scroll.current.scrollTop = 0;
  }, [page]);

  return (
    <div className={s.cueSection}>
      <div className={s.sectionHeading}>
        <h3 id={heading}>{tr(locale, '字幕内容', 'Subtitle cues')}</h3>
        <span className={s.muted}>{cueCount(cues.length, locale)}</span>
      </div>
      <div ref={scroll} tabIndex={0} className={s.cueScroll} aria-labelledby={heading} role="region">
        <ol className={s.cueList} start={start + 1}>
          {cues.slice(start, end).map((cue, row) => {
            const index = start + row;
            const label = tr(locale, '编辑第 ' + (index + 1) + ' 条字幕', 'Edit cue ' + (index + 1));
            return (
              <li className={s.cue} key={cue.uiId} data-subtitle-cue={cue.uiId}>
                <div className={s.cueHeader}>
                  <span className={s.cueIndex}>{String(index + 1).padStart(2, '0')}</span>
                  <span className={s.timing} data-subtitle-timing>
                    {cueTime(cue.start + offset)} <span aria-hidden="true">→</span>{' '}
                    <span className={s.srOnly}>{tr(locale, '到', 'to')} </span>{cueTime(cue.end + offset)}
                  </span>
                  {editable && (
                    <Tooltip content={label}>
                      <IconButton label={label} variant="ghost" size="sm" onClick={() => edit(index)} disabled={disabled}>
                        <PencilSimpleIcon size={17} aria-hidden />
                      </IconButton>
                    </Tooltip>
                  )}
                </div>
                <p className={s.cueText} data-subtitle-text>{cue.text}</p>
              </li>
            );
          })}
        </ol>
      </div>
      {pages > 1 && (
        <nav className={s.pagination} aria-label={tr(locale, '字幕分页', 'Cue pages')}>
          <Button size="sm" variant="ghost" disabled={page === 0} onClick={() => setPage(page - 1)}>
            {tr(locale, '上一页', 'Previous')}
          </Button>
          <span className={s.muted} role="status">{start + 1}–{end} / {cues.length}</span>
          <Button size="sm" variant="ghost" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>
            {tr(locale, '下一页', 'Next')}
          </Button>
        </nav>
      )}
    </div>
  );
}
