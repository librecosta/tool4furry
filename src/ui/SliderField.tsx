import { Slider } from '@base-ui/react/slider';
import { Field } from '@base-ui/react/field';
import type { ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { controls } from '../styles/controls';
import { tokens } from '../styles/tokens.stylex';
import { FieldFeedback, useField, fieldStyles, type FieldProps } from './Field';

export interface SliderFieldProps extends Omit<FieldProps, 'required'> {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  name?: string;
  valueControl?: ReactNode;
  /** Opt-in supporting accent; the default Slider and feedback colors are unchanged. */
  accent?: 'lavender';
}
export function SliderField({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  name,
  valueControl,
  accent,
  ...field
}: SliderFieldProps) {
  const ids = useField(field);
  return (
    <Field.Root
      invalid={!!field.error}
      disabled={field.disabled}
      {...stylex.props(controls.field, field.disabled && fieldStyles.disabled)}
    >
      <Slider.Root
        id={ids.id}
        value={value}
        onValueChange={onValueChange}
        min={min}
        max={max}
        step={step}
        name={name}
        disabled={field.disabled}
      >
        <div {...stylex.props(styles.label)}>
          <Slider.Label>{field.label}</Slider.Label>
          {valueControl ?? (
            <span aria-hidden="true">
              {value}
              {unit}
            </span>
          )}
        </div>
        <Slider.Control {...stylex.props(styles.control)}>
          <Slider.Track {...stylex.props(
            styles.track,
            accent === 'lavender' && !field.disabled && styles.lavenderTrack,
          )}>
            <Slider.Indicator {...stylex.props(
              styles.indicator,
              accent === 'lavender' && !field.disabled && styles.lavenderIndicator,
            )} />
            <Slider.Thumb
              aria-describedby={ids.describedBy}
              getAriaValueText={(value) => `${value}${unit}`}
              {...stylex.props(
                styles.thumb,
                accent === 'lavender' && !field.disabled && styles.lavenderThumb,
                !!field.error && controls.invalid,
              )}
            />
          </Slider.Track>
        </Slider.Control>
      </Slider.Root>
      <FieldFeedback hint={field.hint} error={field.error} ids={ids} />
    </Field.Root>
  );
}
const styles = stylex.create({
  label: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.space12,
    fontWeight: 500,
    fontVariantNumeric: 'tabular-nums',
  },
  control: {
    display: 'flex',
    alignItems: 'center',
    height: 44,
    paddingInline: 13,
    touchAction: 'none',
    userSelect: 'none',
  },
  track: {
    position: 'relative',
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: tokens.borderStrong,
  },
  indicator: { backgroundColor: tokens.accent, borderRadius: 3 },
  // A neutral rail with enough contrast against the supporting progress color.
  lavenderTrack: { backgroundColor: tokens.border },
  lavenderIndicator: {
    backgroundColor: tokens.supportLavender,
    transitionProperty: 'background-color',
    transitionDuration: { default: '180ms', '@media (prefers-reduced-motion: reduce)': '0ms' },
  },
  lavenderThumb: {
    borderColor: tokens.supportLavender,
    transitionProperty: 'border-color, background-color',
    transitionDuration: { default: '180ms', '@media (prefers-reduced-motion: reduce)': '0ms' },
  },
  thumb: {
    width: 26,
    height: 26,
    borderRadius: '50%',
    backgroundColor: {
      default: tokens.surfaceFloating,
      ':hover': tokens.surfaceFloating,
      ':active': tokens.surfaceFloating,
    },
    borderWidth: { default: 2, ':has(:focus-visible)': 3 },
    borderStyle: 'solid',
    borderColor: tokens.accent,
    // Base UI focuses its clipped range input. Emphasize this one ring for keys.
    outlineStyle: 'none',
  },
});
