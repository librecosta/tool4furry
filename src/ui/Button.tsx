import type { ComponentProps, ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { CircleNotchIcon } from '@phosphor-icons/react';
import { controls } from '../styles/controls';
import { tokens } from '../styles/tokens.stylex';

export interface ButtonProps extends ComponentProps<'button'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  loading?: boolean;
}

const spin = stylex.keyframes({
  from: { transform: 'rotate(0deg)' },
  to: { transform: 'rotate(360deg)' },
});
const styles = stylex.create({
  content: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.space8,
  },
  hidden: { opacity: 0 },
  spinner: {
    position: 'absolute',
    animationName: spin,
    animationDuration: '1s',
    animationTimingFunction: 'linear',
    animationIterationCount: 'infinite',
    animationPlayState: {
      default: 'running',
      '@media (prefers-reduced-motion: reduce)': 'paused',
    },
  },
});

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
  const sx = stylex.props(
    controls.button,
    variant === 'primary' && controls.primary,
    variant === 'ghost' && controls.ghost,
    variant === 'danger' && controls.danger,
    size === 'sm' && controls.small,
    (props['aria-pressed'] === true || props['aria-pressed'] === 'true') &&
      controls.active,
  );
  return (
    <button
      {...props}
      {...sx}
      className={[sx.className, className].filter(Boolean).join(' ')}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      <span {...stylex.props(styles.content, loading && styles.hidden)}>
        {children}
      </span>
      {loading && (
        <CircleNotchIcon
          size={20}
          aria-hidden="true"
          {...stylex.props(styles.spinner)}
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
