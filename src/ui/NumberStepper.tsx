import { useId, useState } from 'react';
import { NumberField } from '@base-ui/react/number-field';
import { MinusIcon, PlusIcon } from '@phosphor-icons/react';
import s from './NumberStepper.module.scss';

interface NumberStepperProps {
  label: string;
  decreaseLabel: string;
  increaseLabel: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  fractionDigits?: number;
  locale?: string;
  disabled?: boolean;
  onValueChange: (value: number) => void;
}

export function NumberStepper({
  label, decreaseLabel, increaseLabel, value, min, max, step = 1, fractionDigits = 0, locale, disabled, onValueChange,
}: NumberStepperProps) {
  const id = useId();
  const [clearedAt, setClearedAt] = useState<number>();

  return <NumberField.Root id={id} value={clearedAt === value ? null : value} className={s.field}
    min={min} max={max} step={step} smallStep={step} largeStep={step * 10} locale={locale} disabled={disabled}
    format={{ useGrouping: false, maximumFractionDigits: fractionDigits }}
    onValueChange={next => {
      if (next === null) setClearedAt(value);
      else {
        setClearedAt(undefined);
        if (next !== value) onValueChange(next);
      }
    }}
    onValueCommitted={next => { if (next === null) setClearedAt(undefined); }}>
    <label htmlFor={id} className={s.label}>{label}</label>
    <NumberField.Group className={s.group}>
      <NumberField.Decrement className={s.step} aria-label={decreaseLabel}>
        <MinusIcon size={15} aria-hidden="true" />
      </NumberField.Decrement>
      <NumberField.Input className={s.input} role="spinbutton" aria-valuemin={min} aria-valuemax={max}
        aria-valuenow={clearedAt === value ? undefined : value}
        onKeyDown={event => {
          if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
            event.preventDefault();
            event.currentTarget.blur();
          }
        }} />
      <NumberField.Increment className={s.step} aria-label={increaseLabel}>
        <PlusIcon size={15} aria-hidden="true" />
      </NumberField.Increment>
    </NumberField.Group>
  </NumberField.Root>;
}
