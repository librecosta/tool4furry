import { useId } from 'react';
import { Radio } from '@base-ui/react/radio';
import { RadioGroup } from '@base-ui/react/radio-group';
import s from './studio.module.scss';

export function StudioChoices<Value extends string | number>({ label, value, options, change, disabled }: {
  label: string;
  value: Value;
  options: readonly (readonly [Value, string])[];
  change: (value: Value) => void;
  disabled?: (value: Value) => boolean;
}) {
  const id = useId();

  return <div className={s.choiceField}>
    <span id={id} className={s.choiceLabel}>{label}</span>
    <RadioGroup className={s.choices} aria-labelledby={id} value={value} onValueChange={change}>
      {options.map(([id, name]) =>
        <Radio.Root key={id} className={s.choice} value={id} disabled={disabled?.(id)}>{name}</Radio.Root>)}
    </RadioGroup>
  </div>;
}
