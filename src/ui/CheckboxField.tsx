import { Checkbox } from '@base-ui/react/checkbox';
import { CheckIcon } from '@phosphor-icons/react';
import * as stylex from '@stylexjs/stylex';
import { motion } from '../styles/motion';
import { tokens } from '../styles/tokens.stylex';
import { controls } from '../styles/controls';
import { FieldFeedback, useField, fieldStyles, type FieldProps } from './Field';

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
    <div {...stylex.props(controls.field)}>
      <label
        htmlFor={ids.id}
        {...stylex.props(styles.label, field.disabled && fieldStyles.disabled)}
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
          {...stylex.props(
            styles.box,
            motion.selection,
            checked && styles.checked,
            !!field.error && controls.invalid,
          )}
        >
          <Checkbox.Indicator {...stylex.props(styles.indicator)}>
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
const styles = stylex.create({
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.space8,
    fontWeight: 500,
    minHeight: 44,
    cursor: 'pointer',
  },
  box: {
    display: 'inline-flex',
    flexShrink: 0,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: tokens.controlBorderWidth,
    borderStyle: 'solid',
    borderColor: tokens.controlBorder,
    backgroundColor: {
      default: tokens.surface,
      ':hover': tokens.surfaceHover,
      ':disabled': tokens.surface,
    },
    borderRadius: tokens.radiusSm,
    outlineColor: tokens.focus,
  },
  checked: {
    backgroundColor: {
      default: tokens.action,
      ':hover': tokens.actionHover,
      ':active': tokens.actionPressed,
      ':disabled': tokens.action,
    },
    borderColor: tokens.accent,
    color: tokens.onAction,
  },
  indicator: { display: 'flex' },
});
