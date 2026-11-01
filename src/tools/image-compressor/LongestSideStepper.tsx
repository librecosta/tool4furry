import { useRef } from 'react';
import * as stylex from '@stylexjs/stylex';
import { MinusIcon, PlusIcon } from '@phosphor-icons/react';
import { IconButton } from '../../ui/Button';
import { FieldFrame, useField } from '../../ui/Field';
import { controls } from '../../styles/controls';
import { s } from './styles';

const stops = [640, 800, 1024, 1280, 1600, 1920, 2048, 2560, 3840, 4096, 8192, 10000];

export function LongestSideStepper({value, onChange, label, noLimit, decrease, increase}: {
  value?: number; onChange: (value: number | undefined) => void;
  label: string; noLimit: string; decrease: string; increase: string;
}) {
  const ids = useField({label});
  const control = useRef<HTMLDivElement>(null);
  const smaller = value === undefined ? stops.at(-1) : stops.findLast(stop => stop < value);
  const larger = value === undefined ? undefined : stops.find(stop => stop > value);
  const text = value === undefined ? noLimit : `${value} px`;
  // Use an ordinal for the discrete stops; aria-valuetext announces pixels or no limit.
  const position = value === undefined ? stops.length : stops.filter(stop => stop < value).length;
  return <FieldFrame label={label} ids={ids}>
    <div {...stylex.props(s.stepper)} onKeyDown={event => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      // Buttons can become disabled at a boundary; keep keyboard focus on the value.
      control.current?.focus();
      if (['ArrowLeft', 'ArrowDown'].includes(event.key)) {
        if (smaller !== undefined) onChange(smaller);
      } else if (['ArrowRight', 'ArrowUp'].includes(event.key)) {
        if (value !== undefined) onChange(larger);
      } else onChange(event.key === 'Home' ? stops[0] : undefined);
    }}>
      <IconButton label={decrease} aria-controls={ids.id} aria-describedby={ids.id} variant="ghost" xstyle={s.stepperButton} disabled={smaller === undefined} onClick={() => onChange(smaller)}><MinusIcon size={18} aria-hidden/></IconButton>
      <div ref={control} id={ids.id} role="spinbutton" tabIndex={0} aria-labelledby={ids.labelId}
        aria-valuemin={0} aria-valuemax={stops.length} aria-valuenow={position}
        aria-valuetext={text} {...stylex.props(controls.workspaceFocus, s.stepperValue)}>
        {value === undefined ? noLimit : <>{value}<span {...stylex.props(s.stepperUnit)}>px</span></>}
      </div>
      <IconButton label={increase} aria-controls={ids.id} aria-describedby={ids.id} variant="ghost" xstyle={s.stepperButton} disabled={value === undefined} onClick={() => onChange(larger)}><PlusIcon size={18} aria-hidden/></IconButton>
    </div>
  </FieldFrame>;
}
