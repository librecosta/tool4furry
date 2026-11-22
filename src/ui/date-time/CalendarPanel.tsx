import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react';
import type { Locale } from '../../i18n/locale';
import { Button, IconButton } from '../Button';
import controls from '../controls.module.scss';
import {
  changeMonth, clampDay, dayLabel, firstDay, inRange, isDay, lastDay,
  monthOverlaps, monthRows, shiftDay, todayLocal, type DayRange,
} from './calendar';
import s from './date-time.module.scss';

const format = (locale: Locale, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-US', { ...options, timeZone: 'UTC' });

export function CalendarPanel({ value, locale, range, focusRef, select }: {
  value: string;
  locale: Locale;
  range: DayRange;
  focusRef: RefObject<HTMLButtonElement | null>;
  select(day: string): void;
}) {
  const [today] = useState(todayLocal);
  const [day, setDay] = useState(() => clampDay(isDay(value) ? value : today, range));
  const [jump, setJump] = useState(false);
  const [jumpYear, setJumpYear] = useState('');
  const needsFocus = useRef<'day' | 'year' | null>(null);
  const yearRef = useRef<HTMLInputElement>(null);
  const headingId = useId();
  const jumpId = useId();
  const year = Number(day.slice(0, 4)), month = Number(day.slice(5, 7));
  const zh = locale === 'zh';
  const heading = dayLabel(day, format(locale, { month: 'long', year: 'numeric' }));
  const spokenDay = format(locale, { dateStyle: 'full' });
  const monthShort = format(locale, { month: 'short' });
  const weekdayLabels = format(locale, { weekday: 'long' });
  const weekdays = zh ? ['一', '二', '三', '四', '五', '六', '日'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const yearNumber = Number(jumpYear);
  const yearValid = /^\d{1,4}$/.test(jumpYear) && yearNumber >= Number(range.min.slice(0, 4))
    && yearNumber <= Number(range.max.slice(0, 4));
  const yearError = zh ? '请输入可选择的年份。' : 'Enter a year within the available range.';

  useLayoutEffect(() => {
    if (!needsFocus.current) return;
    const field = needsFocus.current === 'year' ? yearRef.current : focusRef.current;
    needsFocus.current = null;
    field?.focus();
  }, [day, jump, focusRef]);

  function navigate(next: string, focus = false) {
    const bounded = clampDay(next, range);
    if (focus && bounded !== day) needsFocus.current = 'day';
    setDay(bounded);
  }

  function moveMonth(offset: number) {
    const next = changeMonth(day, year, month + offset);
    if (next) {
      navigate(next);
      setJump(false);
    }
  }

  function navigateGrid(event: KeyboardEvent<HTMLButtonElement>) {
    let next: string;
    switch (event.key) {
      case 'ArrowLeft': next = shiftDay(day, -1, range); break;
      case 'ArrowRight': next = shiftDay(day, 1, range); break;
      case 'ArrowUp': next = shiftDay(day, -7, range); break;
      case 'ArrowDown': next = shiftDay(day, 7, range); break;
      case 'PageUp':
      case 'PageDown': {
        const offset = event.key === 'PageUp' ? -1 : 1;
        next = changeMonth(day, year + (event.shiftKey ? offset : 0), month + (event.shiftKey ? 0 : offset))
          ?? (offset < 0 ? firstDay : lastDay);
        break;
      }
      default: return;
    }
    event.preventDefault();
    navigate(next, true);
  }

  function jumpTo(monthNumber: number) {
    if (!yearValid) return;
    const next = changeMonth(day, yearNumber, monthNumber);
    if (!next) return;
    needsFocus.current = 'day';
    navigate(next);
    setJump(false);
  }

  return (
    <div className={s.calendar} data-date-time-picker="calendar">
      <header className={s.calendarHeader}>
        <IconButton label={zh ? '上个月' : 'Previous month'} variant="ghost" size="sm" className={s.navigate}
          disabled={!monthOverlaps(year, month - 1, range)} onClick={() => moveMonth(-1)}>
          <CaretLeftIcon size={16} aria-hidden />
        </IconButton>
        <div id={headingId} aria-live="polite">
          <Button variant="ghost" size="sm" className={s.monthHeading} aria-expanded={jump} aria-controls={jump ? jumpId : undefined}
            onClick={() => {
              setJumpYear(day.slice(0, 4));
              if (!jump) needsFocus.current = 'year';
              setJump(!jump);
            }}>{heading}</Button>
        </div>
        <IconButton label={zh ? '下个月' : 'Next month'} variant="ghost" size="sm" className={s.navigate}
          disabled={!monthOverlaps(year, month + 1, range)} onClick={() => moveMonth(1)}>
          <CaretRightIcon size={16} aria-hidden />
        </IconButton>
      </header>
      {jump ? (
        <div id={jumpId} className={s.jump}>
          <label className={s.year}>
            <span>{zh ? '年份' : 'Year'}</span>
            <input ref={yearRef} className={controls.input} inputMode="numeric" value={jumpYear}
              onChange={event => setJumpYear(event.target.value)} aria-invalid={!yearValid || undefined}
              aria-describedby={!yearValid ? jumpId + '-error' : undefined}
              onKeyDown={event => {
                if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
                event.preventDefault();
                jumpTo(month);
              }} />
          </label>
          {!yearValid && <p id={jumpId + '-error'} role="alert" className={s.error}>{yearError}</p>}
          <div className={s.months} role="group" aria-label={zh ? '月份' : 'Months'}>
            {Array.from({ length: 12 }, (_, index) => {
              const number = index + 1;
              const monthDay = `2024-${String(number).padStart(2, '0')}-01`;
              return <Button key={number} variant="ghost" size="sm" className={s.monthChoice}
                aria-pressed={yearNumber === year && number === month}
                disabled={!yearValid || !monthOverlaps(yearNumber, number, range)}
                onClick={() => jumpTo(number)}>{dayLabel(monthDay, monthShort)}</Button>;
            })}
          </div>
        </div>
      ) : (
        <>
          <table role="grid" aria-labelledby={headingId} className={s.grid}>
            <thead><tr>
              {weekdays.map((name, index) =>
                <th key={name} scope="col" abbr={dayLabel(`2024-01-0${index + 1}`, weekdayLabels)}>{name}</th>)}
            </tr></thead>
            <tbody>
              {monthRows(year, month).map((week, index) => (
                <tr key={index}>
                  {week.map((cell, column) => (
                    <td key={column} role="gridcell" aria-selected={!!cell && cell === value}>
                      {cell && (
                        <button type="button" ref={cell === day ? focusRef : undefined}
                          tabIndex={cell === day ? 0 : -1}
                          className={s.day} data-adjacent={cell.slice(0, 7) !== day.slice(0, 7) || undefined}
                          aria-label={dayLabel(cell, spokenDay)} aria-current={cell === today ? 'date' : undefined}
                          disabled={!inRange(cell, range)}
                          onKeyDown={navigateGrid} onClick={() => select(cell)}>{Number(cell.slice(8))}</button>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className={s.calendarFooter}>
            <Button variant="ghost" size="sm" disabled={!inRange(today, range)}
              onClick={() => select(today)}>{zh ? '今天' : 'Today'}</Button>
          </div>
        </>
      )}
    </div>
  );
}
