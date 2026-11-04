import s from './WorkbenchShell.module.scss';
import { useId, useRef, useState, type ReactNode } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import {
  SlidersHorizontalIcon,
  SidebarSimpleIcon,
  XIcon,
} from '@phosphor-icons/react';
import type { WorkspaceMode } from '../tools/types';
import c from '../ui/controls.module.scss';
import { useCompact } from './useCompact';
import formToolLayout from './form-tool-layout.module.scss';
import { IconButton } from '../ui/Button';

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
  /** Form only: wide opts into a centered 1400px shell (including safe gutters). */
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
      <section data-workbench={mode} className={s.shell}>
        {header != null && (
          <header className={s.flowHeader}>{header}</header>
        )}
        <div
          className={[
            s.flow,
            s.fluid,
            mode === 'form' ? s.form : mode === 'batch' ? s.batch : s.custom,
            right != null && mode === 'form' && s.formColumns,
            mode === 'form' && formWidth === 'wide' && s.formWide,
            right != null && mode === 'form' && formWidth === 'wide' && formToolLayout.columns,
            right != null && mode === 'batch' && s.batchColumns,
          ].filter(Boolean).join(' ')}
        >
          {left != null && (
            <div aria-label={labels.toolbar} className={s.flowLeft}>
              {left}
            </div>
          )}
          <div aria-label={labels.main} className={s.main}>
            {children}
          </div>
          {right != null && <aside className={s.main}>{right}</aside>}
        </div>
        {bottom != null && (
          <footer className={s.flowBottom}>{bottom}</footer>
        )}
      </section>
    );

  return (
    <section data-workbench={mode} className={[s.shell, s.canvas].filter(Boolean).join(' ')}>
      <div
        data-canvas-viewport
        aria-label={labels.main}
        className={s.viewport}
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
        <div data-canvas-overlay className={s.overlay}>
          {header != null && (
            <header className={[s.localHeader, s.surface].filter(Boolean).join(' ')}>
              {header}
            </header>
          )}
          {(left != null || right != null || bottom != null) && (
            <div className={s.dock}>
              {left != null && (
                <div
                  id={toolbarId}
                  aria-label={labels.toolbar}
                  className={[
                    s.left,
                    s.surface,
                    !leftOpen && s.closedLeft,
                  ].filter(Boolean).join(' ')}
                >
                  {left}
                </div>
              )}
              {bottom != null && (
                <footer className={[s.bottom, s.surface].filter(Boolean).join(' ')}>{bottom}</footer>
              )}
              {(left != null || right != null) && (
                <div className={s.switches}>
                  {left != null && (
                    <button
                      type="button"
                      className={[c.button, s.icon, s.desktopOnly].filter(Boolean).join(' ')}
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
                      className={[c.button, s.icon, open && c.active].filter(Boolean).join(' ')}
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
              <div ref={panelHost} className={s.panelHost} />
              <Dialog.Portal
                container={panelHost}
                keepMounted
                className={s.portal}
              >
                <Dialog.Backdrop className={s.backdrop} />
                <Dialog.Popup
                  id={panelId}
                  initialFocus={compact}
                  finalFocus={trigger}
                  role={compact ? 'dialog' : 'region'}
                  className={[s.surface, s.panel, !open && s.closedPanel].filter(Boolean).join(' ')}
                >
                  <div className={s.panelHeading}>
                    <Dialog.Title className={c.heading}>
                      {labels.parameters}
                    </Dialog.Title>
                    <Dialog.Close
                      render={<IconButton label={labels.close} variant="ghost" className={c.dialogClose}><XIcon size={20} aria-hidden /></IconButton>}
                    />
                  </div>
                  <div className={s.panelContent}>{right}</div>
                </Dialog.Popup>
              </Dialog.Portal>
            </>
          )}
        </div>
      </Dialog.Root>
    </section>
  );
}
