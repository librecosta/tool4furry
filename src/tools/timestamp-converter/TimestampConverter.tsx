import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { CalendarBlankIcon, ClockIcon, CopyIcon } from '@phosphor-icons/react';
import { Button, IconButton } from '../../ui/Button';
import { DatePickerField } from '../../ui/date-time/DatePickerField';
import { TimePickerField } from '../../ui/date-time/TimePickerField';
import { TextField } from '../../ui/TextField';
import { Tooltip } from '../../ui/Tooltip';
import form from '../../workbench/form-tool-layout.module.scss';
import { errorText, Frame, tr } from '../general/ui';
import type { ToolProps } from '../types';
import {
  browserTimeZone, calendarFields, formatTimestamp, fromCalendar, fromIso, fromTimestamp,
  isoField, sampleInstant, timestampValues, timeZoneFormatter,
  type InputZone, type TimestampUnit,
} from './core';
import s from './timestamp.module.scss';

type InputKind = 'timestamp' | 'calendar' | 'iso';
type Direction = 'timestamp' | 'date';
type Source = 'sample' | 'now' | 'input' | undefined;
type Drafts = {
  timestamp: { text: string; source: Source };
  calendar: { date: string; time: string; zone: InputZone; source: Source; dateDraft?: string; timeDraft?: string };
  iso: { text: string; source: Source };
};

const initialDrafts: Drafts = {
  timestamp: { text: formatTimestamp(sampleInstant, 'seconds'), source: 'sample' },
  calendar: { date: '', time: '', zone: 'utc', source: undefined },
  iso: { text: '', source: undefined },
};
const exampleZones = ['UTC', 'Asia/Shanghai', 'America/New_York', 'Europe/London', 'Asia/Tokyo'];

function readInput(drafts: Drafts, kind: InputKind, unit: TimestampUnit): { instant?: number; error?: unknown; invalidDraft?: boolean } {
  try {
    switch (kind) {
      case 'timestamp': return { instant: fromTimestamp(drafts.timestamp.text, unit) };
      case 'iso': return { instant: fromIso(drafts.iso.text) };
      case 'calendar': {
        const { date, time, zone, dateDraft, timeDraft } = drafts.calendar;
        if (dateDraft !== undefined || timeDraft !== undefined) return { invalidDraft: true };
        return { instant: fromCalendar(date, time, zone) };
      }
    }
  } catch (error) {
    return { error };
  }
}

function Segments<T extends string>({ label, value, options, onChange }: {
  label: string;
  value: T;
  options: readonly (readonly [T, string])[];
  onChange(value: T): void;
}) {
  return (
    <div role="group" aria-label={label} className={form.segmented}>
      {options.map(([key, name]) => (
        <Button key={key} variant="ghost" aria-pressed={value === key}
          className={value === key ? form.segment + ' ' + form.segmentSelected : form.segment}
          onClick={() => onChange(key)}>{name}</Button>
      ))}
    </div>
  );
}

export default function TimestampConverter({ locale }: ToolProps) {
  const t = (zh: string, en: string) => tr(locale, zh, en);
  const [mode, setMode] = useState<'quick' | 'advanced'>('quick');
  const [direction, setDirection] = useState<Direction>('timestamp');
  const [dateKind, setDateKind] = useState<'calendar' | 'iso'>('calendar');
  const [unit, setUnit] = useState<TimestampUnit>('seconds');
  const [drafts, setDrafts] = useState(initialDrafts);
  const [localZone, setLocalZone] = useState<string | null>(null);
  const [zoneText, setZoneText] = useState('');
  const [transferError, setTransferError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [feedback, setFeedback] = useState<{ key: string; value: string; message: string }>();
  const copyRequest = useRef(0);
  const calendarErrorId = useId();
  const zonesId = useId();
  const inputTitle = useId();
  const resultTitle = useId();

  const advanced = mode === 'advanced';
  const active = direction === 'timestamp' ? 'timestamp' : advanced ? dateKind : 'calendar';
  const source = drafts[active].source;
  const resolved = readInput(drafts, active, unit);
  const fieldError = transferError ?? (resolved.error ? errorText(resolved.error, locale) : undefined);
  const instant = transferError ? undefined : resolved.instant;
  useEffect(() => { setLocalZone(browserTimeZone()); }, []);
  const zoned = useMemo(() => {
    const zone = zoneText.trim();
    if (!advanced || !zone) return {};
    try {
      const formatter = timeZoneFormatter(locale, zone, instant !== undefined && new Date(instant).getUTCFullYear() <= 1);
      return { zone: formatter.resolvedOptions().timeZone, value: instant === undefined ? undefined : formatter.format(instant) };
    } catch (error) {
      return { error: errorText(error, locale) };
    }
  }, [advanced, zoneText, locale, instant]);

  function clearFeedback() {
    copyRequest.current++;
    setFeedback(undefined);
  }

  function resetMessages() {
    setTransferError(undefined);
    setNotice(undefined);
    clearFeedback();
  }

  function fill(kind: InputKind, ms: number, nextSource: Source) {
    try {
      if (kind === 'timestamp') {
        setDrafts({ ...drafts, timestamp: { text: formatTimestamp(ms, unit), source: nextSource } });
      } else if (kind === 'iso') {
        setDrafts({ ...drafts, iso: { text: isoField(ms), source: nextSource } });
      } else {
        let fields = calendarFields(ms, 'utc');
        if (nextSource !== 'sample' && drafts.calendar.zone === 'local') {
          try {
            const local = calendarFields(ms, 'local');
            if (fromCalendar(local.date, local.time, 'local') === ms) fields = local;
          } catch {
            // A known instant can land in a repeated wall time. UTC can express it uniquely.
          }
          if (fields.zone === 'utc')
            setNotice(t('已用 UTC 填入，以保留准确时刻。', 'Entered in UTC to preserve the exact instant.'));
        }
        setDrafts({ ...drafts, calendar: { ...fields, source: nextSource } });
      }
    } catch (error) {
      setTransferError(errorText(error, locale));
    }
  }

  function switchInput(kind: InputKind) {
    if (kind === active) return;
    resetMessages();
    if (instant === undefined) return;
    const target = readInput(drafts, kind, unit);
    // Preserve unfinished input and equivalent representations such as a typed ISO offset.
    if (target.instant === instant || (drafts[kind].source === 'input' && (target.error || target.invalidDraft))) return;
    fill(kind, instant, source);
  }

  function switchUnit(next: TimestampUnit) {
    if (next === unit) return;
    resetMessages();
    if (instant !== undefined)
      setDrafts({ ...drafts, timestamp: { ...drafts.timestamp, text: formatTimestamp(instant, next) } });
    setUnit(next);
  }

  function editCalendar(fields: Partial<Omit<Drafts['calendar'], 'source'>>) {
    resetMessages();
    setDrafts(previous => ({ ...previous, calendar: { ...previous.calendar, ...fields, source: 'input' } }));
  }

  const values = instant === undefined ? undefined : timestampValues(instant, locale, localZone);
  const rows = [
    { key: 'seconds', label: t('Unix 秒', 'Unix seconds'), value: values?.seconds },
    { key: 'milliseconds', label: t('Unix 毫秒', 'Unix milliseconds'), value: values?.milliseconds },
    { key: 'iso', label: 'ISO 8601 (UTC)', value: values?.iso },
    { key: 'utc', label: t('UTC 时间', 'UTC time'), value: values?.utc },
    { key: 'local', label: t('本地时间', 'Local time'), zone: localZone ?? undefined, value: values?.local },
    ...(zoned.zone ? [{ key: 'zone', label: t('附加时区', 'Additional time zone'), zone: zoned.zone, value: zoned.value }] : []),
  ];

  async function copy(key: string, value: string) {
    const request = ++copyRequest.current;
    let message: string;
    try {
      await navigator.clipboard.writeText(value);
      message = t('已复制', 'Copied');
    } catch {
      message = t('复制失败，请选择结果文本后手动复制。', 'Copy failed. Select the result and copy it manually.');
    }
    if (copyRequest.current === request) setFeedback({ key, value, message });
  }

  const sourceLabel = source === 'sample'
    ? t('示例 · January 1, 2024', 'Example · January 1, 2024')
    : source === 'now' ? t('当前时间', 'Current time') : t('用户输入', 'Your input');

  return (
    <Frame locale={locale}>
      <div data-timestamp-workspace className={s.workspace}>
        <header className={form.settingsHeader}>
          <div>
            <h2 className={form.settingsTitle}>{t('时间转换工作区', 'Timestamp workspace')}</h2>
            <p className={s.note}>{sourceLabel}</p>
          </div>
          <Segments label={t('工作区模式', 'Workspace mode')} value={mode}
            options={[['quick', t('快速', 'Quick')], ['advanced', t('高级', 'Advanced')]]}
            onChange={next => {
              if (direction === 'date') switchInput(next === 'advanced' ? dateKind : 'calendar');
              setMode(next);
            }} />
        </header>
        <div className={s.direction}>
          <Segments label={t('转换方向', 'Conversion direction')} value={direction}
            options={[['timestamp', t('时间戳 → 日期', 'Timestamp to Date')], ['date', t('日期 → 时间戳', 'Date to Timestamp')]]}
            onChange={next => {
              switchInput(next === 'timestamp' ? 'timestamp' : advanced ? dateKind : 'calendar');
              setDirection(next);
            }} />
        </div>

        <div className={s.columns}>
          <section className={form.settingsPanel + ' ' + s.panel} aria-labelledby={inputTitle}>
            <h3 id={inputTitle} className={form.settingsTitle}>{t('输入', 'Input')}</h3>
            {advanced && direction === 'date' && (
              <Segments label={t('输入方式', 'Date input format')} value={dateKind}
                options={[['calendar', t('日期与时间', 'Date and time')], ['iso', 'ISO 8601']]}
                onChange={next => { switchInput(next); setDateKind(next); }} />
            )}
            <div className={s.fields} hidden={active !== 'timestamp'}>
              <TextField label={t('Unix 时间戳', 'Unix timestamp')} inputMode={unit === 'seconds' ? 'decimal' : 'numeric'}
                value={drafts.timestamp.text} error={active === 'timestamp' ? fieldError : undefined}
                onChange={text => {
                  resetMessages();
                  setDrafts({ ...drafts, timestamp: { text, source: 'input' } });
                }} />
              <div className={s.inlineControl}>
                <span>{t('单位', 'Unit')}</span>
                <Segments label={t('单位', 'Unit')} value={unit}
                  options={[['seconds', t('秒', 'Seconds')], ['milliseconds', t('毫秒', 'Milliseconds')]]} onChange={switchUnit} />
              </div>
            </div>
            <div className={s.fields} hidden={active !== 'calendar'}>
              <div className={s.calendar}>
                <DatePickerField locale={locale} label={t('日期', 'Date')}
                  value={drafts.calendar.date} draft={drafts.calendar.dateDraft ?? null}
                  onDraftChange={draft => editCalendar({ dateDraft: draft ?? undefined })}
                  onChange={date => editCalendar({ date })}
                  aria-invalid={active === 'calendar' && !!fieldError || undefined}
                  aria-describedby={active === 'calendar' && fieldError ? calendarErrorId : undefined} />
                <TimePickerField locale={locale} label={t('时间（毫秒精度）', 'Time (millisecond precision)')}
                  value={drafts.calendar.time} draft={drafts.calendar.timeDraft ?? null}
                  onDraftChange={draft => editCalendar({ timeDraft: draft ?? undefined })}
                  onChange={time => editCalendar({ time })}
                  aria-invalid={active === 'calendar' && !!fieldError || undefined}
                  aria-describedby={active === 'calendar' && fieldError ? calendarErrorId : undefined} />
              </div>
              <div className={s.inlineControl}>
                <span>{t('输入时区', 'Input time zone')}</span>
                <Segments label={t('输入时区', 'Input time zone')} value={drafts.calendar.zone}
                  options={[['utc', 'UTC'], ['local', t('本地', 'Local')]]} onChange={zone => {
                    if (zone !== drafts.calendar.zone) editCalendar({ zone });
                  }} />
              </div>
              {drafts.calendar.zone === 'local' && <p className={s.note}>{localZone}</p>}
              {active === 'calendar' && fieldError && <p id={calendarErrorId} role="alert" className={s.error}>{fieldError}</p>}
            </div>
            <div className={s.fields} hidden={active !== 'iso'}>
              <TextField label={t('带时区的 ISO 8601', 'ISO 8601 with time zone')} autoComplete="off" spellCheck={false}
                placeholder="2024-01-01T08:00:00.123+08:00" value={drafts.iso.text} error={active === 'iso' ? fieldError : undefined}
                onChange={text => {
                  resetMessages();
                  setDrafts({ ...drafts, iso: { text, source: 'input' } });
                }} />
            </div>
            <div className={s.actions}>
              <Button variant="ghost" size="sm" onClick={() => {
                resetMessages();
                fill(active, Date.now(), 'now');
              }}>
                <ClockIcon size={17} aria-hidden="true" />{t('当前时间', 'Now')}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => {
                resetMessages();
                fill(active, sampleInstant, 'sample');
              }}>
                <CalendarBlankIcon size={17} aria-hidden="true" />{t('载入示例', 'Load sample')}
              </Button>
            </div>
            {notice && <p className={s.note} role="status">{notice}</p>}
          </section>

          <section className={form.settingsPanel + ' ' + s.panel} aria-labelledby={resultTitle}>
            <h3 id={resultTitle} className={form.settingsTitle}>{t('转换结果', 'Conversion results')}</h3>
            <dl className={s.results}>
              {rows.map(({ key, label, value, zone }) => {
                const copyLabel = t('复制' + label, 'Copy ' + label);
                return (
                  <div key={key} className={s.result} data-timestamp-result={key}>
                    <dt>{label}{zone && <span className={s.zone}>{zone}</span>}</dt>
                    <dd className={s.value}>{value ?? '—'}</dd>
                    <dd className={s.copy}>
                      <Tooltip content={copyLabel}>
                        <IconButton label={copyLabel} variant="ghost" size="sm" disabled={value === undefined}
                          className={s.icon} onClick={() => { if (value !== undefined) void copy(key, value); }}>
                          <CopyIcon size={18} aria-hidden="true" />
                        </IconButton>
                      </Tooltip>
                    </dd>
                  </div>
                );
              })}
            </dl>
            {advanced && (
              <div className={s.zoneField}>
                <TextField label={t('附加 IANA 时区（可选）', 'Additional IANA time zone (optional)')} list={zonesId}
                  placeholder="America/New_York" autoComplete="off" spellCheck={false} value={zoneText}
                  onChange={text => { clearFeedback(); setZoneText(text); }} error={zoned.error} />
                <datalist id={zonesId}>
                  {exampleZones.map(zone => <option key={zone} value={zone} />)}
                </datalist>
              </div>
            )}
            <p className={s.copyFeedback} role="status">
              {feedback && rows.some(row => row.key === feedback.key && row.value === feedback.value) && feedback.message}
            </p>
          </section>
        </div>
      </div>
    </Frame>
  );
}
