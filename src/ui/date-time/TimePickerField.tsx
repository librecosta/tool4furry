import { useRef } from 'react';
import { ClockIcon } from '@phosphor-icons/react';
import { PickerField, type PickerFieldProps } from './PickerField';
import { TimePanel } from './TimePanel';

export function TimePickerField({ locale, ...props }: PickerFieldProps) {
  const firstFocus = useRef<HTMLInputElement>(null);
  const zh = locale === 'zh';
  return <PickerField
    placeholder="HH:mm:ss.SSS" autoComplete="off" spellCheck={false} {...props}
    popupLabel={zh ? '选择时间' : 'Choose time'} icon={<ClockIcon size={18} aria-hidden />}
    initialFocus={firstFocus} deferTouchFocus
    validate={value => /^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d\.\d{3}$/.test(value)
      ? undefined
      : zh ? '请输入有效的 24 小时时间（HH:mm:ss.SSS）。' : 'Enter a valid 24-hour time (HH:mm:ss.SSS).'}
    panel={(commit, close) => <TimePanel locale={locale} value={props.value} focusRef={firstFocus}
      commit={commit} close={close} />}
  />;
}
