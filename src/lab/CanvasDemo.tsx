import s from './CanvasDemo.module.scss';
import { useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  CursorIcon,
  StarIcon,
  ArrowCounterClockwiseIcon,
} from '@phosphor-icons/react';
import WorkbenchShell from '../workbench/WorkbenchShell';
import type { LabMessages as Messages } from './messages';
import c from '../ui/controls.module.scss';
import { IconButton } from '../ui/Button';
import { Tooltip } from '../ui/Tooltip';
import { TextField } from '../ui/TextField';
import { SelectField } from '../ui/SelectField';
import { SliderField } from '../ui/SliderField';

export default function CanvasDemo({
  t,
  header,
}: {
  t: Messages;
  header: ReactNode;
}) {
  const [action, setAction] = useState<'select' | 'stamp'>('select');
  const [label, setLabel] = useState(t.sampleLabel);
  const [size, setSize] = useState(48);
  const [accent, setAccent] = useState('green');
  const [marks, setMarks] = useState(0);
  const [selected, setSelected] = useState(false);
  const reduce = useReducedMotion();
  const reset = () => {
    setAction('select');
    setLabel(t.sampleLabel);
    setSize(48);
    setAccent('green');
    setMarks(0);
    setSelected(false);
  };
  return (
    <WorkbenchShell
      mode="canvas"
      labels={t}
      header={header}
      left={
        <div className={s.toolbar}>
          <Tooltip content={t.select}>
            <IconButton
              label={t.select}
              size="sm"
              type="button"
              aria-pressed={action === 'select'}
              variant={action === 'select' ? 'primary' : 'secondary'}
              onClick={() => setAction('select')}
            >
              <CursorIcon
                size={20}
                weight={action === 'select' ? 'fill' : 'regular'}
                aria-hidden
              />
            </IconButton>
          </Tooltip>
          <Tooltip content={t.stamp}>
            <IconButton
              label={t.stamp}
              size="sm"
              type="button"
              aria-pressed={action === 'stamp'}
              variant={action === 'stamp' ? 'primary' : 'secondary'}
              onClick={() => setAction('stamp')}
            >
              <StarIcon
                size={20}
                weight={action === 'stamp' ? 'fill' : 'regular'}
                aria-hidden
              />
            </IconButton>
          </Tooltip>
        </div>
      }
      right={
        <div className={c.stack}>
          <TextField
            label={t.label}
            maxLength={80}
            value={label}
            onChange={setLabel}
          />
          <SliderField
            label={t.size}
            min={24}
            max={96}
            value={size}
            unit="px"
            onValueChange={setSize}
          />
          <SelectField
            label={t.accent}
            value={accent}
            onValueChange={setAccent}
            options={[
              { value: 'green', label: t.green },
              { value: 'orange', label: t.orange },
            ]}
          />
          <p className={c.muted}>{t.canvasHint}</p>
        </div>
      }
      bottom={
        <>
          <span role="status" className={[c.muted, s.status].filter(Boolean).join(' ')}>
            {t.marks}: {marks}
            {selected ? ` · ${t.selected}` : ''}
          </span>
          <IconButton label={t.reset} title={t.reset} size="sm" onClick={reset}>
            <ArrowCounterClockwiseIcon size={18} aria-hidden />
          </IconButton>
        </>
      }
    >
      <button
        type="button"
        aria-label={t.canvasAction}
        className={s.stage}
        onClick={() =>
          action === 'stamp'
            ? setMarks((value) => value + 1)
            : setSelected((value) => !value)
        }
      >
        <span className={s.caption}>
          {t.preview} / {t[action]}
        </span>
        <span className={[s.canvasButton, selected && s.selected].filter(Boolean).join(' ')}>
          <motion.span
            key={marks}
            initial={false}
            animate={{ scale: reduce || marks === 0 ? 1 : [1, 1.06, 1] }}
            transition={{ duration: reduce ? 0 : 0.18 }}
            className={[s.symbol, accent === 'orange' && s.orange].filter(Boolean).join(' ')}
          >
            <StarIcon size={size} weight="duotone" aria-hidden />
          </motion.span>
          <strong className={s.label}>{label || '—'}</strong>
          <span className={c.muted}>
            {t.marks}: {marks}
          </span>
        </span>
        <span className={[c.muted, s.hint].filter(Boolean).join(' ')}>{t.canvasHint}</span>
      </button>
    </WorkbenchShell>
  );
}
