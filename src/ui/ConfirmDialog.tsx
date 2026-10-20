import { useRef, type ReactElement } from 'react';
import { AlertDialog } from '@base-ui/react/alert-dialog';
import * as stylex from '@stylexjs/stylex';
import { tokens } from '../styles/tokens.stylex';
import { controls } from '../styles/controls';
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
        <AlertDialog.Backdrop forceRender {...stylex.props(styles.backdrop)} />
        <AlertDialog.Popup
          initialFocus={cancelRef}
          {...stylex.props(styles.popup, controls.stack)}
        >
          <AlertDialog.Title {...stylex.props(controls.heading, styles.title)}>
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description {...stylex.props(styles.description)}>
            {description}
          </AlertDialog.Description>
          <div {...stylex.props(styles.actions)}>
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
const styles = stylex.create({
  backdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: tokens.layerDialog,
    backgroundColor: tokens.overlay,
  },
  popup: {
    position: 'fixed',
    zIndex: tokens.layerDialog,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 'min(440px, calc(100vw - 32px))',
    maxHeight: 'calc(100dvh - 32px)',
    overflowY: 'auto',
    overscrollBehavior: 'contain',
    backgroundColor: tokens.surfaceMuted,
    color: tokens.textPrimary,
    padding: tokens.space24,
    borderRadius: tokens.radiusXl,
    boxShadow: tokens.shadowFloating,
  },
  description: {
    margin: 0,
    color: tokens.textSecondary,
    overflowWrap: 'anywhere',
  },
  title: { fontWeight: 700 },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: tokens.space8,
  },
});
