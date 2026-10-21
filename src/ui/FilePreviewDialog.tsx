import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { CornersInIcon, CornersOutIcon, XIcon } from '@phosphor-icons/react';
import * as stylex from '@stylexjs/stylex';
import { IconButton } from './Button';
import { Tooltip } from './Tooltip';
import { tokens as t } from '../styles/tokens.stylex';

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
        <Dialog.Backdrop forceRender {...stylex.props(s.backdrop)} />
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
          {...stylex.props(s.popup, maximized && s.maximized)}
        >
          <header {...stylex.props(s.header)}>
            <div {...stylex.props(s.identity)}>
              <Dialog.Title {...stylex.props(s.title)}>{title}</Dialog.Title>
              {description && (
                <Dialog.Description
                  title={description}
                  {...stylex.props(s.description)}
                >
                  {description}
                </Dialog.Description>
              )}
            </div>
            <div {...stylex.props(s.actions)}>
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
                  >
                    <XIcon size={20} aria-hidden />
                  </IconButton>
                }
              />
            </div>
            {toolbar && <div {...stylex.props(s.toolbar)}>{toolbar}</div>}
          </header>
          <div {...stylex.props(s.content)}>{open ? children : null}</div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const s = stylex.create({
  backdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: t.layerDialog,
    backgroundColor: t.overlay,
  },
  popup: {
    position: 'fixed',
    zIndex: t.layerDialog,
    top: { default: '50%', '@media (max-width: 600px)': 0 },
    left: { default: '50%', '@media (max-width: 600px)': 0 },
    transform: {
      default: 'translate(-50%, -50%)',
      '@media (max-width: 600px)': 'none',
    },
    width: { default: '92vw', '@media (max-width: 600px)': '100vw' },
    height: { default: '90dvh', '@media (max-width: 600px)': '100dvh' },
    display: 'grid',
    gridTemplateRows: 'auto minmax(0, 1fr)',
    gap: t.space12,
    paddingTop: 'max(12px, env(safe-area-inset-top))',
    paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
    paddingLeft: 'max(12px, env(safe-area-inset-left))',
    paddingRight: 'max(12px, env(safe-area-inset-right))',
    backgroundColor: t.surface,
    color: t.textPrimary,
    boxShadow: t.shadowFloating,
    borderRadius: { default: t.radiusLg, '@media (max-width: 600px)': 0 },
    overflow: 'hidden',
  },
  maximized: {
    top: 0,
    left: 0,
    transform: 'none',
    width: '100vw',
    height: '100dvh',
    borderRadius: 0,
  },
  header: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) auto',
    alignItems: 'center',
    gap: t.space8,
  },
  identity: { minWidth: 0 },
  title: { fontSize: 18, fontWeight: 600, margin: 0 },
  description: {
    fontSize: 13,
    color: t.textSecondary,
    margin: 0,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
  },
  actions: { display: 'flex', alignItems: 'center' },
  toolbar: { gridColumn: '1 / -1', minWidth: 0 },
  content: { minWidth: 0, minHeight: 0, height: '100%' },
});
