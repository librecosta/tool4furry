import fieldStyles from './Field.module.scss';
import { useId, type ReactNode } from 'react';
import controls from './controls.module.scss';

export interface FieldProps {
  id?: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}
export function useField({ id, hint, error }: FieldProps) {
  const generated = useId();
  const controlId = id ?? generated;
  return {
    id: controlId,
    labelId: `${controlId}-label`,
    hintId: `${controlId}-hint`,
    errorId: `${controlId}-error`,
    describedBy:
      [hint && `${controlId}-hint`, error && `${controlId}-error`]
        .filter(Boolean)
        .join(' ') || undefined,
  };
}

export function FieldFeedback({
  hint,
  error,
  ids,
}: Pick<FieldProps, 'hint' | 'error'> & { ids: ReturnType<typeof useField> }) {
  return (
    <>
      {hint && (
        <p id={ids.hintId} className={controls.muted}>
          {hint}
        </p>
      )}
      {error && (
        <p id={ids.errorId} role="alert" className={fieldStyles.error}>
          {error}
        </p>
      )}
    </>
  );
}
export function FieldFrame({
  label,
  required,
  hint,
  error,
  ids,
  children,
}: FieldProps & { ids: ReturnType<typeof useField>; children: ReactNode }) {
  return (
    <div className={controls.field}>
      <label
        id={ids.labelId}
        htmlFor={ids.id}
        className={fieldStyles.label}
      >
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      {children}
      <FieldFeedback hint={hint} error={error} ids={ids} />
    </div>
  );
}
