import { useId, type ReactNode } from 'react';
import s from './TextEditorPane.module.scss';

/** Slots only: tools own text, actions, status and delivery. */
export function TextEditorPane({
  title,
  actions,
  status,
  busy = false,
  children,
}: {
  title: string;
  actions?: ReactNode;
  status?: ReactNode;
  busy?: boolean;
  children: ReactNode;
}) {
  const heading = useId();
  return (
    <section
      className={s.pane}
      aria-labelledby={heading}
      aria-busy={busy}
      data-text-pane
    >
      <header className={s.header}>
        <h2 id={heading} className={s.title}>
          {title}
        </h2>
        <div className={s.actions}>{actions}</div>
      </header>
      <div className={s.body}>{children}</div>
      <footer className={s.status}>{status}</footer>
    </section>
  );
}
