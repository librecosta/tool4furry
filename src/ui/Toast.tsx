import styles from './Toast.module.scss';
import { Toast as BaseToast } from '@base-ui/react/toast';
import {
  CheckCircleIcon,
  InfoIcon,
  WarningIcon,
  XCircleIcon,
  XIcon,
} from '@phosphor-icons/react';
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
        className={styles.viewport}
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
              className={[styles.toast, styles[type]].join(' ')}
            >
              <Icon size={20} aria-hidden="true" className={styles.icon} />
              <div className={styles.content}>
                <BaseToast.Title className={styles.title}>
                  {toast.title}
                </BaseToast.Title>
                {toast.description && (
                  <BaseToast.Description className={styles.description}>
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
