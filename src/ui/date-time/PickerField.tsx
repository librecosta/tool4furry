import { Popover } from '@base-ui/react/popover';
import { useRef, useState, type ComponentProps, type ReactNode, type RefObject } from 'react';
import type { Locale } from '../../i18n/locale';
import { IconButton } from '../Button';
import { FieldFrame, useField, type FieldProps } from '../Field';
import { Tooltip } from '../Tooltip';
import controls from '../controls.module.scss';
import s from './date-time.module.scss';

export type PickerFieldProps = FieldProps & Omit<ComponentProps<'input'>,
  keyof FieldProps | 'type' | 'defaultValue' | 'value' | 'onChange'> & {
  locale: Locale;
  value: string;
  onChange(value: string): void;
  /** Optional controlled raw text. Null displays the committed value. */
  draft?: string | null;
  onDraftChange?(draft: string | null): void;
};

type PickerFieldInternalProps = Omit<PickerFieldProps, 'locale'> & {
  popupLabel: string;
  icon: ReactNode;
  validate(value: string): string | undefined;
  initialFocus: RefObject<HTMLElement | null>;
  deferTouchFocus?: boolean;
  panel(commit: (value: string) => void, close: () => void): ReactNode;
};

export function PickerField({
  label, hint, error, id, required, value, onChange, disabled, readOnly, className,
  draft: controlledDraft, onDraftChange, popupLabel, icon, validate, initialFocus,
  deferTouchFocus, panel, ...input
}: PickerFieldInternalProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const [baseValue, setBaseValue] = useState(value);
  const anchor = useRef<HTMLDivElement>(null);
  const actions = useRef<Popover.Root.Actions>(null);
  if (value !== baseValue) {
    setBaseValue(value);
    setDraft(null);
  }
  const raw = controlledDraft === undefined ? draft : controlledDraft;
  const formatError = raw == null ? undefined : validate(raw);
  const field = { id, label, hint, error: error ?? formatError, required };
  const ids = useField(field);
  const inactive = disabled || readOnly;

  function updateDraft(next: string | null) {
    if (controlledDraft === undefined) setDraft(next);
    onDraftChange?.(next);
  }

  function commit(next: string) {
    updateDraft(null);
    onChange(next);
  }

  return (
    <Popover.Root actionsRef={actions}>
      <FieldFrame {...field} ids={ids}>
        <div ref={anchor} className={s.anchor}>
          <input {...input} id={ids.id} type="text" disabled={disabled} readOnly={readOnly} required={required}
            className={[controls.input, s.input, field.error && controls.invalid, className].filter(Boolean).join(' ')}
            value={raw ?? value} aria-invalid={!!field.error || input['aria-invalid'] || undefined}
            aria-describedby={[ids.describedBy, input['aria-describedby']].filter(Boolean).join(' ') || undefined}
            onChange={event => {
              const next = event.currentTarget.value;
              if (validate(next)) updateDraft(next);
              else commit(next);
            }} />
          <Tooltip content={popupLabel}>
            <Popover.Trigger disabled={inactive} render={
              <IconButton label={popupLabel} variant="ghost" size="sm" className={s.trigger}>{icon}</IconButton>
            } />
          </Tooltip>
        </div>
      </FieldFrame>
      <Popover.Portal>
        <Popover.Positioner anchor={anchor} side="bottom" align="start" sideOffset={8} collisionPadding={12}
          collisionAvoidance={{ side: 'flip', align: 'shift', fallbackAxisSide: 'none' }}
          className={s.positioner}>
          <Popover.Popup aria-label={popupLabel} className={s.popup}
            initialFocus={type => type === 'touch' && deferTouchFocus ? true : initialFocus.current}>
            {panel(commit, () => actions.current?.close())}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
