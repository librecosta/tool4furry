import { useRef } from 'react';
import { CalendarBlankIcon } from '@phosphor-icons/react';
import { CalendarPanel } from './CalendarPanel';
import { firstDay, inRange, isDay, lastDay } from './calendar';
import { PickerField, type PickerFieldProps } from './PickerField';

export type DatePickerFieldProps = PickerFieldProps & { min?: string; max?: string };

export function DatePickerField({ locale, min = firstDay, max = lastDay, ...props }: DatePickerFieldProps) {
  const firstFocus = useRef<HTMLButtonElement>(null);
  const range = { min, max };
  const zh = locale === 'zh';
  return <PickerField
    placeholder="YYYY-MM-DD" autoComplete="off" spellCheck={false} {...props}
    popupLabel={zh ? '选择日期' : 'Choose date'} icon={<CalendarBlankIcon size={18} aria-hidden />}
    initialFocus={firstFocus}
    validate={value => {
      if (!isDay(value)) return zh ? '请输入有效的日期（YYYY-MM-DD）。' : 'Enter a valid date (YYYY-MM-DD).';
      if (!inRange(value, range)) return zh ? `日期需在 ${min} 至 ${max} 之间。` : `Enter a date from ${min} to ${max}.`;
    }}
    panel={(commit, close) => <CalendarPanel locale={locale} value={props.value} range={range}
      focusRef={firstFocus} select={day => { commit(day); close(); }} />}
  />;
}
