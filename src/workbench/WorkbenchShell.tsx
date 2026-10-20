import { useId, useRef, useState, type ReactNode } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import {
  SlidersHorizontalIcon,
  SidebarSimpleIcon,
  XIcon,
} from '@phosphor-icons/react';
import * as stylex from '@stylexjs/stylex';
import type { WorkspaceMode } from '../tools/types';
import { controls as c } from '../styles/controls';
import { tokens } from '../styles/tokens.stylex';
import { useCompact } from './useCompact';

export interface WorkbenchShellProps {
  mode: WorkspaceMode;
  labels: Record<
    | 'parameters'
    | 'close'
    | 'showParameters'
    | 'hideParameters'
    | 'showTools'
    | 'hideTools'
    | 'main'
    | 'toolbar',
    string
  >;
  header?: ReactNode;
  left?: ReactNode;
  right?: ReactNode;
  bottom?: ReactNode;
  children: ReactNode;
  formWidth?: 'default' | 'wide';
}

export default function WorkbenchShell({
  mode,
  labels,
  header,
  left,
  right,
  bottom,
  children,
  formWidth = 'default',
}: WorkbenchShellProps) {
  const canvas = mode === 'canvas';
  const compact = useCompact();
  // Each presentation remembers visibility; crossing the breakpoint never moves the parameter tree.
  const [desktopOpen, setDesktopOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [leftOpen, setLeftOpen] = useState(true);
  const panelHost = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const toolbarId = useId();
  const panelId = useId();
  const open = compact ? sheetOpen : desktopOpen;

  if (!canvas)
    return (
      <section data-workbench={mode} {...stylex.props(s.shell)}>
        {header != null && (
          <header {...stylex.props(s.flowHeader)}>{header}</header>
        )}
        <div
          {...stylex.props(
            s.flow,
            mode === 'form' ? s.form : mode === 'batch' ? s.batch : s.custom,
            mode === 'form' && formWidth === 'wide' && s.formWide,
            right != null && mode === 'form' && s.formColumns,
            right != null && mode === 'batch' && s.batchColumns,
          )}
        >
          {left != null && (
            <div aria-label={labels.toolbar} {...stylex.props(s.flowLeft)}>
              {left}
            </div>
          )}
          <div aria-label={labels.main} {...stylex.props(s.main)}>
            {children}
          </div>
          {right != null && <aside {...stylex.props(s.main)}>{right}</aside>}
        </div>
        {bottom != null && (
          <footer {...stylex.props(s.flowBottom)}>{bottom}</footer>
        )}
      </section>
    );

  return (
    <section data-workbench={mode} {...stylex.props(s.shell, s.canvas)}>
      <div
        data-canvas-viewport
        aria-label={labels.main}
        {...stylex.props(s.viewport)}
      >
        {children}
      </div>
      <Dialog.Root
        open={right != null && open}
        modal={compact}
        disablePointerDismissal={!compact}
        onOpenChange={(next) =>
          compact ? setSheetOpen(next) : setDesktopOpen(next)
        }
      >
        <div data-canvas-overlay {...stylex.props(s.overlay)}>
          {header != null && (
            <header {...stylex.props(s.localHeader, s.surface)}>
              {header}
            </header>
          )}
          {(left != null || right != null || bottom != null) && (
            <div {...stylex.props(s.dock)}>
              {left != null && (
                <div
                  id={toolbarId}
                  aria-label={labels.toolbar}
                  {...stylex.props(
                    s.left,
                    s.surface,
                    !leftOpen && s.closedLeft,
                  )}
                >
                  {left}
                </div>
              )}
              {bottom != null && (
                <footer {...stylex.props(s.bottom, s.surface)}>{bottom}</footer>
              )}
              {(left != null || right != null) && (
                <div {...stylex.props(s.switches)}>
                  {left != null && (
                    <button
                      type="button"
                      {...stylex.props(c.button, s.icon, s.desktopOnly)}
                      aria-label={
                        leftOpen ? labels.hideTools : labels.showTools
                      }
                      title={leftOpen ? labels.hideTools : labels.showTools}
                      aria-expanded={leftOpen}
                      aria-controls={toolbarId}
                      onClick={() => setLeftOpen((value) => !value)}
                    >
                      <SidebarSimpleIcon size={20} aria-hidden />
                    </button>
                  )}
                  {right != null && (
                    <Dialog.Trigger
                      ref={trigger}
                      {...stylex.props(c.button, s.icon, open && c.active)}
                      aria-label={
                        open ? labels.hideParameters : labels.showParameters
                      }
                      title={
                        open ? labels.hideParameters : labels.showParameters
                      }
                      aria-expanded={open}
                      aria-controls={panelId}
                    >
                      <SlidersHorizontalIcon size={20} aria-hidden />
                    </Dialog.Trigger>
                  )}
                </div>
              )}
            </div>
          )}
          {right != null && (
            <>
              <div ref={panelHost} {...stylex.props(s.panelHost)} />
              <Dialog.Portal
                container={panelHost}
                keepMounted
                {...stylex.props(s.portal)}
              >
                {compact && <Dialog.Backdrop {...stylex.props(s.backdrop)} />}
                <Dialog.Popup
                  id={panelId}
                  initialFocus={compact}
                  finalFocus={trigger}
                  role={compact ? 'dialog' : 'region'}
                  {...stylex.props(s.surface, s.panel, !open && s.closedPanel)}
                >
                  <div {...stylex.props(s.panelHeading)}>
                    <Dialog.Title {...stylex.props(c.heading)}>
                      {labels.parameters}
                    </Dialog.Title>
                    <Dialog.Close
                      {...stylex.props(c.button, s.icon)}
                      aria-label={labels.close}
                    >
                      <XIcon size={20} aria-hidden />
                    </Dialog.Close>
                  </div>
                  <div {...stylex.props(s.panelContent)}>{right}</div>
                </Dialog.Popup>
              </Dialog.Portal>
            </>
          )}
        </div>
      </Dialog.Root>
    </section>
  );
}

const s = stylex.create({
  shell: { minWidth: 0, color: tokens.textPrimary, fontSize: 14 },
  canvas: { height: '100dvh', position: 'relative', overflow: 'clip' },
  viewport: { position: 'absolute', inset: 0, minWidth: 0, minHeight: 0 },
  overlay: { position: 'absolute', inset: 0, pointerEvents: 'none' },
  surface: {
    backgroundColor: tokens.surface,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: tokens.border,
    borderRadius: tokens.radiusLg,
    boxShadow: tokens.shadowNone,
    pointerEvents: 'auto',
  },
  localHeader: {
    zIndex: tokens.layerDock,
    position: 'absolute',
    top: 'max(80px, calc(env(safe-area-inset-top) + 64px))',
    left: 'max(16px, env(safe-area-inset-left))',
    maxWidth: 'calc(100% - 32px)',
    padding: tokens.space8,
  },
  dock: {
    zIndex: tokens.layerDock,
    display: { default: 'contents', '@media (max-width: 900px)': 'flex' },
    position: { default: null, '@media (max-width: 900px)': 'absolute' },
    bottom: 'max(16px, env(safe-area-inset-bottom))',
    left: 'max(16px, env(safe-area-inset-left))',
    right: 'max(16px, env(safe-area-inset-right))',
    alignItems: 'center',
    gap: tokens.space8,
    justifyContent: 'space-between',
  },
  left: {
    zIndex: tokens.layerDock,
    position: { default: 'absolute', '@media (max-width: 900px)': 'static' },
    top: 'max(144px, calc(env(safe-area-inset-top) + 128px))',
    left: 'max(16px, env(safe-area-inset-left))',
    padding: tokens.space4,
    flexShrink: 0,
    maxHeight: 'calc(100dvh - 240px)',
    overflowY: 'auto',
  },
  closedLeft: {
    display: { default: 'none', '@media (max-width: 900px)': 'block' },
  },
  switches: {
    zIndex: tokens.layerDock,
    display: 'flex',
    gap: tokens.space8,
    pointerEvents: 'auto',
    flexShrink: 0,
    position: { default: 'absolute', '@media (max-width: 900px)': 'static' },
    top: 'max(16px, env(safe-area-inset-top))',
    right: 'max(16px, env(safe-area-inset-right))',
  },
  icon: { paddingInline: tokens.space8, flexShrink: 0 },
  desktopOnly: {
    display: { default: 'inline-flex', '@media (max-width: 900px)': 'none' },
  },
  bottom: {
    zIndex: tokens.layerDock,
    position: { default: 'absolute', '@media (max-width: 900px)': 'static' },
    bottom: 'max(16px, env(safe-area-inset-bottom))',
    left: '50%',
    transform: {
      default: 'translateX(-50%)',
      '@media (max-width: 900px)': 'none',
    },
    maxWidth: {
      default: 'calc(100% - 160px)',
      '@media (max-width: 900px)': 'none',
    },
    minWidth: 0,
    display: 'flex',
    alignItems: 'center',
    gap: tokens.space8,
    padding: tokens.space4,
    paddingLeft: tokens.space12,
  },
  panelHost: { position: 'absolute', inset: 0, pointerEvents: 'none' },
  // Nested Base UI portals inherit here (not necessarily document.body).
  // This zero-height wrapper restores interaction without covering the viewport.
  portal: { pointerEvents: 'auto' },
  panel: {
    backgroundColor: {
      default: tokens.surface,
      '@media (max-width: 900px)': tokens.surfaceMuted,
    },
    position: { default: 'absolute', '@media (max-width: 900px)': 'fixed' },
    top: {
      default: 'max(80px, calc(env(safe-area-inset-top) + 64px))',
      '@media (max-width: 900px)': 'auto',
    },
    right: {
      default: 'max(16px, env(safe-area-inset-right))',
      '@media (max-width: 900px)': 0,
    },
    bottom: { default: 'auto', '@media (max-width: 900px)': 0 },
    width: { default: 320, '@media (max-width: 900px)': '100%' },
    maxHeight: {
      default: 'calc(100dvh - 160px)',
      '@media (max-width: 900px)':
        'min(80dvh, calc(100dvh - env(safe-area-inset-top) - 16px))',
    },
    display: 'flex',
    flexDirection: 'column',
    zIndex: tokens.layerSheet,
    boxShadow: {
      default: tokens.shadowNone,
      '@media (max-width: 900px)': tokens.shadowFloating,
    },
    borderRadius: {
      default: tokens.radiusLg,
      '@media (max-width: 900px)': '16px 16px 0 0',
    },
  },
  closedPanel: { display: 'none' },
  panelHeading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
    gap: tokens.space12,
    padding: tokens.space12,
    paddingLeft: 'max(16px, env(safe-area-inset-left))',
    paddingRight: 'max(12px, env(safe-area-inset-right))',
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: tokens.border,
  },
  panelContent: {
    padding: tokens.space16,
    paddingLeft: 'max(16px, env(safe-area-inset-left))',
    paddingRight: 'max(16px, env(safe-area-inset-right))',
    paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
    minHeight: 0,
    overflowY: 'auto',
    overscrollBehavior: 'contain',
  },
  backdrop: {
    position: 'fixed',
    inset: 0,
    backgroundColor: tokens.overlay,
    zIndex: tokens.layerBackdrop,
    pointerEvents: 'auto',
  },
  main: { minWidth: 0 },
  flowHeader: { padding: tokens.space16 },
  flow: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr)',
    gap: tokens.space24,
    padding: {
      default: tokens.space32,
      '@media (max-width: 900px)': tokens.space16,
    },
    marginInline: 'auto',
    alignItems: 'start',
  },
  form: { maxWidth: 760 },
  formWide: {
    maxWidth: 1200,
    paddingInline: { default: 40, '@media (max-width: 600px)': 16 },
    paddingBlock: tokens.space24,
  },
  batch: { maxWidth: 1280 },
  formColumns: {
    maxWidth: 1120,
    gridTemplateColumns: {
      default: 'minmax(0, 11fr) minmax(0, 9fr)',
      '@media (max-width: 900px)': 'minmax(0, 1fr)',
    },
  },
  batchColumns: {
    gridTemplateColumns: {
      default: 'minmax(0, 1fr) 320px',
      '@media (max-width: 900px)': 'minmax(0, 1fr)',
    },
  },
  flowLeft: { gridColumn: '1 / -1', minWidth: 0 },
  custom: { padding: tokens.space16 },
  flowBottom: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.space12,
    padding: tokens.space16,
  },
});
