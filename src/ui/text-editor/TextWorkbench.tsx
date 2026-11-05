import type { ReactNode } from 'react';
import s from './TextWorkbench.module.scss';
export function TextWorkbench({
  toolbar,
  children,
}: {
  toolbar?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={s.workbench} data-text-workbench>
      {toolbar}
      <div className={s.panes}>{children}</div>
    </div>
  );
}
