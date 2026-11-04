import styles from './ConfirmDialog.module.scss';
import { useRef, type ReactElement } from 'react';
import { AlertDialog } from '@base-ui/react/alert-dialog';
import motion from '../styles/motion.module.scss';
import controls from './controls.module.scss';
import { Button } from './Button';
export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel?: () => void;
  danger?: boolean;
  trigger: ReactElement;
}
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  danger = false,
  trigger,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel?.();
        onOpenChange(next);
      }}
    >
      <AlertDialog.Trigger render={trigger} />
      <AlertDialog.Portal>
        <AlertDialog.Backdrop forceRender className={[styles.backdrop, motion.backdrop].filter(Boolean).join(' ')} />
        <AlertDialog.Popup
          initialFocus={cancelRef}
          className={[styles.popup, controls.stack, motion.dialog].filter(Boolean).join(' ')}
        >
          <AlertDialog.Title className={[controls.heading, styles.title].filter(Boolean).join(' ')}>
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description className={styles.description}>
            {description}
          </AlertDialog.Description>
          <div className={styles.actions}>
            <AlertDialog.Close render={<Button ref={cancelRef} />}>
              {cancelLabel}
            </AlertDialog.Close>
            <Button
              variant={danger ? 'danger' : 'primary'}
              onClick={() => {
                onConfirm();
                onOpenChange(false);
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
