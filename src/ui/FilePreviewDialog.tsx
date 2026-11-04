import s from './FilePreviewDialog.module.scss';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { CornersInIcon, CornersOutIcon, XIcon } from '@phosphor-icons/react';
import motion from '../styles/motion.module.scss';
import controls from './controls.module.scss';
import { IconButton } from './Button';
import { Tooltip } from './Tooltip';

export interface FilePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  toolbar?: ReactNode;
  children: ReactNode;
  labels: { close: string; maximize: string; restore: string };
  finalFocus?: () => HTMLElement | null;
}

/** Modal chrome only. Media state, rendering and resources belong to the caller. */
export function FilePreviewDialog({
  open,
  onOpenChange,
  title,
  description,
  toolbar,
  children,
  labels,
  finalFocus,
}: FilePreviewDialogProps) {
  const popup = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const fullscreenOwner = useRef<HTMLElement | null>(null);
  const fullscreenRequest = useRef(0);
  const live = useRef(open);
  live.current = open;
  const [maximized, setMaximized] = useState(false);
  const exitFullscreen = async () => {
    ++fullscreenRequest.current;
    if (
      fullscreenOwner.current &&
      document.fullscreenElement === fullscreenOwner.current
    ) {
      try {
        await document.exitFullscreen();
      } catch {
        /* Browser may already have exited. */
      }
    }
    fullscreenOwner.current = null;
    setMaximized(false);
  };
  useEffect(() => {
    live.current = open;
    if (!open) {
      setMaximized(false);
      return;
    }
    const change = () => {
      if (popup.current && document.fullscreenElement === popup.current) {
        fullscreenOwner.current = popup.current;
      } else if (
        fullscreenOwner.current &&
        document.fullscreenElement !== fullscreenOwner.current
      ) {
        fullscreenOwner.current = null;
        setMaximized(false);
      }
    };
    document.addEventListener('fullscreenchange', change);
    return () => {
      live.current = false;
      ++fullscreenRequest.current;
      document.removeEventListener('fullscreenchange', change);
      const owner = fullscreenOwner.current;
      fullscreenOwner.current = null;
      if (owner && document.fullscreenElement === owner)
        void document.exitFullscreen().catch(() => {});
    };
  }, [open]);
  const maximize = async () => {
    if (maximized) {
      await exitFullscreen();
      return;
    }
    setMaximized(true);
    const request = ++fullscreenRequest.current;
    const element = popup.current;
    if (!element?.requestFullscreen) return; // The expanded dialog is the fallback.
    fullscreenOwner.current = element;
    try {
      await element.requestFullscreen();
    } catch {
      fullscreenOwner.current = null;
      if (live.current && request === fullscreenRequest.current)
        setMaximized(true);
    }
    // Closing while the browser was entering fullscreen must not leave it behind.
    if (
      (!live.current ||
        request !== fullscreenRequest.current ||
        !element.isConnected) &&
      document.fullscreenElement === element
    )
      await document.exitFullscreen().catch(() => {});
  };
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop forceRender className={[s.backdrop, motion.backdrop].filter(Boolean).join(' ')} />
        <Dialog.Popup
          ref={popup}
          initialFocus={close}
          finalFocus={finalFocus}
          onKeyDownCapture={(event) => {
            if (event.key === 'Escape' && maximized) {
              event.preventDefault();
              event.stopPropagation();
              void exitFullscreen();
            }
          }}
          className={[s.popup, motion.dialog, maximized && s.maximized].filter(Boolean).join(' ')}
        >
          <header className={s.header}>
            <div className={s.identity}>
              <Dialog.Title className={s.title}>{title}</Dialog.Title>
              {description && (
                <Dialog.Description
                  title={description}
                  className={s.description}
                >
                  {description}
                </Dialog.Description>
              )}
            </div>
            {toolbar && <div className={s.toolbar}>{toolbar}</div>}
            <div className={s.actions}>
              <Tooltip content={maximized ? labels.restore : labels.maximize}>
                <IconButton
                  label={maximized ? labels.restore : labels.maximize}
                  variant="ghost"
                  size="sm"
                  onClick={() => void maximize()}
                >
                  {maximized ? (
                    <CornersInIcon size={20} aria-hidden />
                  ) : (
                    <CornersOutIcon size={20} aria-hidden />
                  )}
                </IconButton>
              </Tooltip>
              <Dialog.Close
                render={
                  <IconButton
                    ref={close}
                    label={labels.close}
                    variant="ghost"
                    size="sm"
                    className={controls.dialogClose}
                  >
                    <XIcon size={20} aria-hidden />
                  </IconButton>
                }
              />
            </div>
          </header>
          <div className={s.content}>{open ? children : null}</div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
