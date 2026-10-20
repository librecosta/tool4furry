import { useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  CursorIcon,
  StarIcon,
  ArrowCounterClockwiseIcon,
} from '@phosphor-icons/react';
import * as stylex from '@stylexjs/stylex';
import WorkbenchShell from '../workbench/WorkbenchShell';
import type { LabMessages as Messages } from './messages';
import { controls as c } from '../styles/controls';
import { tokens } from '../styles/tokens.stylex';
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
        <div {...stylex.props(s.toolbar)}>
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
        <div {...stylex.props(c.stack)}>
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
          <p {...stylex.props(c.muted)}>{t.canvasHint}</p>
        </div>
      }
      bottom={
        <>
          <span role="status" {...stylex.props(c.muted, s.status)}>
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
        {...stylex.props(s.stage)}
        onClick={() =>
          action === 'stamp'
            ? setMarks((value) => value + 1)
            : setSelected((value) => !value)
        }
      >
        <span {...stylex.props(s.caption)}>
          {t.preview} / {t[action]}
        </span>
        <span {...stylex.props(s.canvasButton, selected && s.selected)}>
          <motion.span
            key={marks}
            initial={false}
            animate={{ scale: reduce || marks === 0 ? 1 : [1, 1.06, 1] }}
            transition={{ duration: reduce ? 0 : 0.18 }}
            {...stylex.props(s.symbol, accent === 'orange' && s.orange)}
          >
            <StarIcon size={size} weight="duotone" aria-hidden />
          </motion.span>
          <strong {...stylex.props(s.label)}>{label || '—'}</strong>
          <span {...stylex.props(c.muted)}>
            {t.marks}: {marks}
          </span>
        </span>
        <span {...stylex.props(c.muted, s.hint)}>{t.canvasHint}</span>
      </button>
    </WorkbenchShell>
  );
}
const s = stylex.create({
  toolbar: {
    display: 'flex',
    flexDirection: { default: 'column', '@media (max-width: 900px)': 'row' },
    justifyContent: 'center',
    gap: 4,
  },
  stage: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: { default: 16, '@media (max-height: 500px)': 8 },
    width: '100%',
    height: '100%',
    borderWidth: 0,
    color: tokens.textPrimary,
    backgroundColor: tokens.workspace,
    padding: '80px 16px',
    outlineOffset: -4,
    backgroundImage: `radial-gradient(${tokens.border} 1px, transparent 1px)`,
    backgroundSize: '20px 20px',
  },
  caption: { fontSize: 12, color: tokens.textSecondary },
  canvasButton: {
    width: 'min(100%, 320px)',
    padding: {
      default: tokens.space24,
      '@media (max-height: 500px)': tokens.space12,
    },
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: { default: 16, '@media (max-height: 500px)': 8 },
    backgroundColor: tokens.surface,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: tokens.border,
    borderRadius: 16,
    color: tokens.textPrimary,
  },
  selected: { outline: `2px solid ${tokens.action}`, outlineOffset: 4 },
  // Demo content colors are decorative, independent of the primary action.
  symbol: { display: 'flex', color: tokens.sage },
  orange: { color: tokens.brand },
  label: { maxWidth: '100%', overflowWrap: 'anywhere', fontSize: 20 },
  status: { fontSize: { default: 13, '@media (max-width: 900px)': 12 } },
  hint: { display: { default: 'block', '@media (max-height: 500px)': 'none' } },
});
