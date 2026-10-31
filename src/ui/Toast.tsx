import { Toast as BaseToast } from '@base-ui/react/toast';
import {
  CheckCircleIcon,
  InfoIcon,
  WarningIcon,
  XCircleIcon,
  XIcon,
} from '@phosphor-icons/react';
import * as stylex from '@stylexjs/stylex';
import { tokens } from '../styles/tokens.stylex';
import { IconButton } from './Button';

export type ToastType = 'success' | 'info' | 'warning' | 'error';
export interface UiLabels {
  notifications: string;
  dismissToast: string;
  toastSuccess: string;
  toastInfo: string;
  toastWarning: string;
  toastError: string;
}
export interface ToastMessage {
  id?: string;
  title: string;
  description?: string;
  type?: ToastType;
  timeout?: number;
}
export function useToast() {
  const manager = BaseToast.useToastManager();
  return {
    notify: ({ type = 'info', timeout, ...message }: ToastMessage) =>
      manager.add({
        ...message,
        // A short success slot is refreshed in place for repeated copy actions.
        id: message.id ?? (type === 'success' ? 'feedback-success' : undefined),
        type,
        timeout: timeout ?? (type === 'success' ? 2400 : type === 'error' ? 8000 : 5000),
        priority: type === 'error' ? 'high' : 'low',
      }),
    close: manager.close,
  };
}
const icons = {
  success: CheckCircleIcon,
  info: InfoIcon,
  warning: WarningIcon,
  error: XCircleIcon,
};
export function ToastViewport({ labels }: { labels: UiLabels }) {
  const { toasts } = BaseToast.useToastManager();
  return (
    <BaseToast.Portal>
      <BaseToast.Viewport
        aria-label={labels.notifications}
        {...stylex.props(styles.viewport)}
      >
        {toasts.map((toast) => {
          const type = (toast.type ?? 'info') as ToastType;
          const Icon = icons[type];
          return (
            <BaseToast.Root
              key={toast.id}
              toast={toast}
              data-toast
              hidden={toast.limited}
              swipeDirection={[]}
              className={(state) =>
                stylex.props(
                  styles.toast,
                  styles[type],
                  state.limited && styles.limited,
                ).className
              }
            >
              <Icon size={20} aria-hidden="true" {...stylex.props(styles.icon)} />
              <div {...stylex.props(styles.content)}>
                <BaseToast.Title {...stylex.props(styles.title)}>
                  {toast.title}
                </BaseToast.Title>
                {toast.description && (
                  <BaseToast.Description {...stylex.props(styles.description)}>
                    {toast.description}
                  </BaseToast.Description>
                )}
              </div>
              <BaseToast.Close
                render={
                  <IconButton
                    label={labels.dismissToast}
                    variant="ghost"
                    size="sm"
                  >
                    <XIcon size={18} aria-hidden="true" />
                  </IconButton>
                }
              />
            </BaseToast.Root>
          );
        })}
      </BaseToast.Viewport>
    </BaseToast.Portal>
  );
}
const styles = stylex.create({
  viewport: {
    position: 'fixed',
    zIndex: tokens.layerToast,
    top: 'calc(16px + env(safe-area-inset-top, 0px))',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 'min(440px, calc(100% - 32px))',
    maxHeight: 'min(36dvh, 320px)',
    overflowY: 'auto',
    overscrollBehavior: 'contain',
    display: 'grid',
    justifyItems: 'center',
    gap: tokens.space8,
    pointerEvents: 'none',
  },
  toast: {
    display: 'flex',
    gap: tokens.space8,
    alignItems: 'center',
    width: 'fit-content',
    maxWidth: '100%',
    backgroundColor: `color-mix(in srgb, ${tokens.surfaceFloating} 88%, ${tokens.textSecondary})`,
    borderRadius: tokens.radiusLg,
    padding: '6px 8px 6px 12px',
    boxShadow: tokens.shadowFloating,
    pointerEvents: 'auto',
    opacity: { default: 1, ':is([data-starting-style], [data-ending-style])': 0 },
    transform: { default: 'translateY(0)', ':is([data-starting-style], [data-ending-style])': 'translateY(-6px)' },
    transitionProperty: 'opacity, transform',
    transitionDuration: { default: '200ms', '@media (prefers-reduced-motion: reduce)': '0ms' },
    transitionTimingFunction: 'ease-out',
  },
  limited: { display: 'none' },
  content: { flex: 1, minWidth: 0, overflowWrap: 'anywhere' },
  title: {
    fontWeight: 600,
    color: tokens.textPrimary,
    fontSize: 14,
    margin: 0,
  },
  description: { fontSize: 13, color: tokens.textSecondary, marginTop: 4 },
  icon: { flexShrink: 0 },
  success: { color: tokens.positive },
  info: { color: tokens.info },
  warning: { color: tokens.warning },
  error: { color: tokens.danger },
});
