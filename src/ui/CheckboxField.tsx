import styles from './CheckboxField.module.scss';
import fieldStyles from './Field.module.scss';
import { Checkbox } from '@base-ui/react/checkbox';
import { CheckIcon } from '@phosphor-icons/react';
import motion from '../styles/motion.module.scss';
import controls from './controls.module.scss';
import { FieldFeedback, useField, type FieldProps } from './Field';

export interface CheckboxFieldProps extends FieldProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  name?: string;
}
export function CheckboxField({
  checked,
  onCheckedChange,
  name,
  ...field
}: CheckboxFieldProps) {
  const ids = useField(field);
  return (
    <div className={controls.field}>
      <label
        htmlFor={ids.id}
        className={[styles.label, field.disabled && fieldStyles.disabled].filter(Boolean).join(' ')}
      >
        <Checkbox.Root
          id={ids.id}
          name={name}
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={field.disabled}
          required={field.required}
          aria-labelledby={ids.labelId}
          aria-describedby={ids.describedBy}
          aria-invalid={!!field.error || undefined}
          className={[
            styles.box,
            motion.selection,
            checked && styles.checked,
            !!field.error && controls.invalid,
          ].filter(Boolean).join(' ')}
        >
          <Checkbox.Indicator className={styles.indicator}>
            <CheckIcon size={18} weight="bold" aria-hidden="true" />
          </Checkbox.Indicator>
        </Checkbox.Root>
        <span id={ids.labelId}>
          {field.label}
          {field.required && <span aria-hidden="true"> *</span>}
        </span>
      </label>
      <FieldFeedback hint={field.hint} error={field.error} ids={ids} />
    </div>
  );
}
