import styles from './SliderField.module.scss';
import fieldStyles from './Field.module.scss';
import { Slider } from '@base-ui/react/slider';
import { Field } from '@base-ui/react/field';
import type { ReactNode } from 'react';
import controls from './controls.module.scss';
import { FieldFeedback, useField, type FieldProps } from './Field';

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
      className={[controls.field, field.disabled && fieldStyles.disabled].filter(Boolean).join(' ')}
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
        <div className={styles.label}>
          <Slider.Label>{field.label}</Slider.Label>
          {valueControl ?? (
            <span aria-hidden="true">
              {value}
              {unit}
            </span>
          )}
        </div>
        <Slider.Control className={styles.control}>
          <Slider.Track className={[
            styles.track,
            accent === 'lavender' && !field.disabled && styles.lavenderTrack,
          ].filter(Boolean).join(' ')}>
            <Slider.Indicator className={[
              styles.indicator,
              accent === 'lavender' && !field.disabled && styles.lavenderIndicator,
            ].filter(Boolean).join(' ')} />
            <Slider.Thumb
              aria-describedby={ids.describedBy}
              getAriaValueText={(value) => `${value}${unit}`}
              className={[
                styles.thumb,
                accent === 'lavender' && !field.disabled && styles.lavenderThumb,
                !!field.error && controls.invalid,
              ].filter(Boolean).join(' ')}
            />
          </Slider.Track>
        </Slider.Control>
      </Slider.Root>
      <FieldFeedback hint={field.hint} error={field.error} ids={ids} />
    </Field.Root>
  );
}
