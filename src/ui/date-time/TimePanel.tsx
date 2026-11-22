import { useId, useRef, useState, type RefObject } from 'react';
import { CaretDownIcon, CaretUpIcon } from '@phosphor-icons/react';
import type { Locale } from '../../i18n/locale';
import { IconButton } from '../Button';
import s from './date-time.module.scss';

const segments = [
  { en: 'Hours', zh: '小时', max: 23, width: 2 },
  { en: 'Minutes', zh: '分钟', max: 59, width: 2 },
  { en: 'Seconds', zh: '秒', max: 59, width: 2 },
  { en: 'Milliseconds', zh: '毫秒', max: 999, width: 3 },
] as const;

function splitTime(value: string) {
  const parts = value.split(/[:.]/);
  return parts.length === 4 ? parts : ['00', '00', '00', '000'];
}

function legal(part: string, index: number) {
  const { max, width } = segments[index];
  return /^\d+$/.test(part) && part.length <= width && Number(part) <= max;
}

const pad = (part: string, index: number) => part.padStart(segments[index].width, '0');
const join = (parts: string[]) => parts.slice(0, 3).join(':') + '.' + parts[3];

export function TimePanel({ value, locale, focusRef, commit, close }: {
  value: string;
  locale: Locale;
  focusRef: RefObject<HTMLInputElement | null>;
  commit(value: string): void;
  close(): void;
}) {
  const [edit, setEdit] = useState(() => ({ basis: value, parts: splitTime(value) }));
  const [attempted, setAttempted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const errorId = useId();
  const zh = locale === 'zh';
  if (edit.basis !== value) setEdit({ basis: value, parts: splitTime(value) });

  function setParts(parts: string[]) {
    if (parts.every((part, index) => part.length === segments[index].width && legal(part, index))) {
      const next = join(parts);
      setEdit({ basis: next, parts });
      if (next !== value) commit(next);
      return;
    }
    setEdit({ basis: value, parts });
  }

  function update(index: number, text: string) {
    setParts(edit.parts.map((part, position) => position === index ? text : part));
  }

  function step(index: number, direction: number) {
    const part = edit.parts[index];
    const current = legal(part, index) ? Number(part) : Number(splitTime(value)[index]);
    const next = Math.max(0, Math.min(current + direction, segments[index].max));
    update(index, pad(String(next), index));
  }

  function apply() {
    if (!edit.parts.every(legal)) {
      setAttempted(true);
      return;
    }
    // Enter is an explicit commit, including an unedited zero baseline.
    commit(join(edit.parts.map(pad)));
    close();
  }

  const invalidParts = edit.parts.map((part, index) => (part !== '' || attempted) && !legal(part, index));

  return (
    <div ref={panelRef} className={s.timePanel} data-date-time-picker="clock">
      <h4 className={s.timeTitle}>{zh ? '精确时间' : 'Precise time'}</h4>
      <div className={s.timeParts}>
        {segments.map(({ zh: chinese, en, max, width }, index) => {
          const name = zh ? chinese : en;
          const part = edit.parts[index];
          const valid = legal(part, index);
          const invalid = invalidParts[index];
          const range = '0'.repeat(width) + '–' + max;
          return (
            <div className={s.timePart} key={en}>
              <div className={s.timeAdjust}>
                <IconButton label={zh ? '增加' + name : 'Increase ' + en.toLowerCase()}
                  variant="ghost" size="sm" className={s.adjust} tabIndex={-1}
                  disabled={valid && Number(part) === max} onClick={() => step(index, 1)}>
                  <CaretUpIcon size={14} aria-hidden />
                </IconButton>
                <input ref={index === 0 ? focusRef : undefined} type="text" inputMode="numeric"
                  role="spinbutton" aria-label={name} aria-valuemin={0} aria-valuemax={max}
                  aria-valuenow={valid ? Number(part) : undefined}
                  aria-invalid={invalid || undefined} aria-describedby={invalid ? errorId + '-' + index : undefined}
                  className={s.partInput} value={part}
                  onChange={event => update(index, event.target.value)}
                  onBlur={event => {
                    if (valid && part.length < width && panelRef.current?.contains(event.relatedTarget))
                      update(index, pad(part, index));
                  }}
                  onKeyDown={event => {
                    if (event.nativeEvent.isComposing) return;
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      apply();
                    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                      event.preventDefault();
                      step(index, event.key === 'ArrowUp' ? 1 : -1);
                    }
                  }} />
                <IconButton label={zh ? '减少' + name : 'Decrease ' + en.toLowerCase()}
                  variant="ghost" size="sm" tabIndex={-1} className={s.adjust}
                  disabled={valid && Number(part) === 0} onClick={() => step(index, -1)}>
                  <CaretDownIcon size={14} aria-hidden />
                </IconButton>
              </div>
              <span className={s.partLabel}>{name}</span>
              <span className={s.partRange}>{range}</span>
            </div>
          );
        })}
      </div>
      {segments.map(({ zh: chinese, en, max }, index) =>
        invalidParts[index] && (
          <p key={en} id={errorId + '-' + index} role="alert" className={s.error}>
            {zh ? `${chinese}需为 0–${max} 的整数。` : `${en} must be a whole number from 0 to ${max}.`}
          </p>
        ))}
    </div>
  );
}
