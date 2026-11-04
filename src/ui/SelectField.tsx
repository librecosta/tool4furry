import styles from './SelectField.module.scss';
import { Select } from '@base-ui/react/select';
import { CaretDownIcon, CheckIcon } from '@phosphor-icons/react';
import motion from '../styles/motion.module.scss';
import controls from './controls.module.scss';
import { FieldFrame, useField, type FieldProps } from './Field';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}
export interface SelectFieldProps extends FieldProps {
  value: string;
  onValueChange: (value: string) => void;
  options: readonly SelectOption[];
  placeholder?: string;
  name?: string;
  appearance?: 'default' | 'quiet';
}
export function SelectField({
  value,
  onValueChange,
  options,
  placeholder,
  name,
  appearance = 'default',
  ...field
}: SelectFieldProps) {
  const ids = useField(field);
  return (
    <FieldFrame {...field} ids={ids}>
      <Select.Root
        value={value || null}
        onValueChange={(next) => onValueChange(next ?? '')}
        items={options}
        disabled={field.disabled}
        required={field.required}
        name={name}
      >
        <Select.Trigger
          id={ids.id}
          aria-labelledby={ids.labelId}
          aria-describedby={ids.describedBy}
          aria-invalid={!!field.error || undefined}
          className={[
            controls.input,
            styles.trigger,
            appearance === 'quiet' && styles.quiet,
            !!field.error && controls.invalid,
          ].filter(Boolean).join(' ')}
        >
          <Select.Value placeholder={placeholder} />
          <Select.Icon>
            <CaretDownIcon aria-hidden="true" size={18} />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Positioner
            align="start"
            alignItemWithTrigger={false}
            sideOffset={6}
            collisionPadding={12}
            className={styles.positioner}
          >
            <Select.Popup className={[styles.popup, appearance === 'quiet' && styles.quietPopup].filter(Boolean).join(' ')}>
              {options.map((option) => (
                <Select.Item
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  className={[
                    styles.item,
                    motion.selection,
                    appearance === 'quiet' && styles.quietItem,
                  ].filter(Boolean).join(' ')}
                >
                  <Select.ItemIndicator className={styles.check}>
                    <CheckIcon size={18} aria-hidden="true" />
                  </Select.ItemIndicator>
                  <Select.ItemText>{option.label}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
    </FieldFrame>
  );
}
