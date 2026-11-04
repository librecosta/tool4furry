import { useState } from 'react';
import { Popover } from '@base-ui/react/popover';
import { HexColorPicker } from 'react-colorful';
import { Button } from '../../ui/Button';
import { TextField } from '../../ui/TextField';
import motion from '../../styles/motion.module.scss';
import s from './styles.module.scss';
import '../palette-extractor/color-picker.css';

export function ColorField({label, value, draft, onDraft, onCommit, error, invalid, apply, cancel}: {
  label: string; value: string; draft: string; onDraft: (value: string) => void; onCommit: (value: string) => void;
  error?: string; invalid: string; apply: string; cancel: string;
}) {
  const [open, setOpen] = useState(false), [color, setColor] = useState(value), [hex, setHex] = useState(value);
  const valid = /^#[a-f\d]{6}$/i.test(hex);
  return <div className={s.colorField}>
    <Popover.Root open={open} onOpenChange={next => { setOpen(next); if (next) { setColor(value); setHex(value); } else onDraft(value); }}>
      <Popover.Trigger render={<Button variant="ghost" aria-label={label} className={s.swatch} style={{backgroundColor: value}}/>}/>
      <Popover.Portal><Popover.Positioner sideOffset={8} collisionPadding={12} className={s.popoverPositioner}>
        <Popover.Popup aria-label={label} className={[s.popover, motion.dialog].filter(Boolean).join(' ')}>
          <div data-palette-color-picker><HexColorPicker color={color} onChange={next => {setColor(next); setHex(next.toUpperCase());}}/></div>
          <TextField label="HEX" value={hex} maxLength={7} onChange={next => {setHex(next); if (/^#[a-f\d]{6}$/i.test(next)) setColor(next);}} error={valid ? undefined : invalid}/>
          <div className={s.actions}>
            <Button variant="ghost" className={s.accent} disabled={!valid} onClick={() => {onDraft(hex.toUpperCase()); onCommit(hex.toUpperCase()); setOpen(false);}}>{apply}</Button>
            <Popover.Close render={<Button variant="ghost" className={s.secondary}/>}>{cancel}</Popover.Close>
          </div>
        </Popover.Popup>
      </Popover.Positioner></Popover.Portal>
    </Popover.Root>
    <TextField label={label} value={draft} maxLength={7} onChange={onDraft} onBlur={() => onCommit(draft)} onKeyDown={event => {if (event.key === 'Enter') onCommit(draft);}} error={error}/>
  </div>;
}
