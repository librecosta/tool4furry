import { Select } from '@base-ui/react/select';
import { CaretDownIcon, CheckIcon } from '@phosphor-icons/react';
import * as stylex from '@stylexjs/stylex';
import { motion } from '../styles/motion';
import { controls } from '../styles/controls';
import { tokens } from '../styles/tokens.stylex';
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
}
export function SelectField({
  value,
  onValueChange,
  options,
  placeholder,
  name,
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
          {...stylex.props(
            controls.input,
            styles.trigger,
            !!field.error && controls.invalid,
          )}
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
            {...stylex.props(styles.positioner)}
          >
            <Select.Popup {...stylex.props(styles.popup)}>
              {options.map((option) => (
                <Select.Item
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  className={(state) =>
                    stylex.props(
                      styles.item,
                      motion.selection,
                      state.highlighted && styles.highlighted,
                      state.selected && styles.selected,
                      state.disabled && styles.disabled,
                    ).className
                  }
                >
                  <Select.ItemIndicator {...stylex.props(styles.check)}>
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
const styles = stylex.create({
  trigger: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.space12,
    textAlign: 'start',
    cursor: { default: 'pointer', ':disabled': 'not-allowed' },
    overflowWrap: 'anywhere',
  },
  positioner: { zIndex: tokens.layerFloating, maxWidth: 'calc(100vw - 24px)' },
  popup: {
    width: 'var(--anchor-width)',
    maxWidth: 'calc(100vw - 24px)',
    maxHeight: 'min(320px, var(--available-height))',
    overflowY: 'auto',
    overscrollBehavior: 'contain',
    backgroundColor: tokens.surfaceFloating,
    color: tokens.textPrimary,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: tokens.border,
    borderRadius: tokens.radiusLg,
    padding: tokens.space4,
    boxShadow: tokens.shadowFloating,
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.space8,
    minHeight: 44,
    paddingBlock: tokens.space8,
    paddingInline: tokens.space12,
    borderRadius: tokens.radiusSm,
    fontSize: 14,
    fontWeight: 500,
    outline: 'none',
    cursor: 'pointer',
    overflowWrap: 'anywhere',
  },
  selected: { backgroundColor: tokens.actionTint, color: tokens.accent },
  highlighted: {
    backgroundColor: tokens.surfaceHover,
    color: tokens.textPrimary,
    outline: `2px solid ${tokens.focus}`,
    outlineOffset: -2,
  },
  disabled: { opacity: 0.5, cursor: 'not-allowed' },
  check: { display: 'flex', width: 18, flexShrink: 0 },
});
