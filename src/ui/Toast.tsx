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
        type,
        timeout: timeout ?? (type === 'error' ? 8000 : 5000),
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
  const names = {
    success: labels.toastSuccess,
    info: labels.toastInfo,
    warning: labels.toastWarning,
    error: labels.toastError,
  };
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
              <Icon size={22} aria-hidden="true" />
              <div {...stylex.props(styles.content)}>
                <span {...stylex.props(styles.type)}>{names[type]}</span>
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
    top: 'max(16px, env(safe-area-inset-top))',
    right: 'max(16px, env(safe-area-inset-right))',
    width: 'min(360px, calc(100% - 32px))',
    maxHeight: 'min(36dvh, 320px)',
    overflowY: 'auto',
    overscrollBehavior: 'contain',
    display: 'grid',
    gap: tokens.space8,
    pointerEvents: 'none',
  },
  toast: {
    display: 'flex',
    gap: tokens.space8,
    alignItems: 'flex-start',
    backgroundColor: tokens.surfaceMuted,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: tokens.border,
    borderInlineStartWidth: 4,
    borderRadius: tokens.radiusLg,
    padding: tokens.space12,
    boxShadow: tokens.shadowFloating,
    pointerEvents: 'auto',
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
  type: { fontSize: 12, fontWeight: 500 },
  success: { borderInlineStartColor: tokens.positive, color: tokens.positive },
  info: { borderInlineStartColor: tokens.info, color: tokens.info },
  warning: { borderInlineStartColor: tokens.warning, color: tokens.warning },
  error: { borderInlineStartColor: tokens.danger, color: tokens.danger },
});
