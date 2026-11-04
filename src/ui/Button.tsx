import styles from './Button.module.scss';
import type { ComponentProps, ReactNode } from 'react';
import { CircleNotchIcon } from '@phosphor-icons/react';
import controls from './controls.module.scss';

export interface ButtonProps extends ComponentProps<'button'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  loading?: boolean;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  disabled,
  type = 'button',
  className,
  children,
  ...props
}: ButtonProps) {
  const classes = [controls.button, controls[variant], size === 'sm' && controls.small,
    (props['aria-pressed'] === true || props['aria-pressed'] === 'true') && controls.active,
    className].filter(Boolean).join(' ');
  return (
    <button
      {...props}
      className={classes}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      <span className={[styles.content, loading && styles.hidden].filter(Boolean).join(' ')}>
        {children}
      </span>
      {loading && (
        <CircleNotchIcon
          size={20}
          aria-hidden="true"
          className={styles.spinner}
        />
      )}
    </button>
  );
}

export function IconButton({
  label,
  children,
  ...props
}: Omit<ButtonProps, 'children' | 'aria-label'> & {
  label: string;
  children: ReactNode;
}) {
  return (
    <Button {...props} aria-label={label}>
      {children}
    </Button>
  );
}
