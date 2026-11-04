import styles from './ScrollDock.module.scss';
import { useEffect, useState } from 'react';
import { ArrowUpIcon } from '@phosphor-icons/react';
import controls from './controls.module.scss';
import { getScrollMetrics } from './scroll-metrics';

export interface ScrollDockProps {
  /** Localized action and integer progress, e.g. "Scroll up, current progress 50%". */
  getLabel: (percent: number) => string;
}

function measureDocument() {
  const root = document.scrollingElement ?? document.documentElement;
  return getScrollMetrics(window.scrollY, root.scrollHeight, root.clientHeight);
}

/** An opt-in document control. Never attaches to a workbench or nested scroll area. */
export function ScrollDock({ getLabel }: ScrollDockProps) {
  const [view, setView] = useState({ visible: false, percent: 0 });
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 900px) and (pointer: fine)');
    let frame: number | null = null;
    let last = { visible: false, percent: 0 };
    const update = () => {
      frame = null;
      const metrics = measureDocument();
      const visible = desktop.matches && metrics.canShow;
      if (last.visible !== visible || last.percent !== metrics.percent) {
        last = { visible, percent: metrics.percent };
        setView(last);
      }
    };
    const schedule = () => {
      if (frame === null) frame = window.requestAnimationFrame(update);
    };
    const onScroll = (event: Event) => {
      if (event.target === document) schedule();
    };
    document.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', schedule);
    desktop.addEventListener('change', schedule);
    const observer =
      typeof ResizeObserver === 'undefined'
        ? undefined
        : new ResizeObserver(schedule);
    observer?.observe(document.documentElement);
    observer?.observe(document.body);
    schedule();
    return () => {
      document.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', schedule);
      desktop.removeEventListener('change', schedule);
      observer?.disconnect();
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, []);
  if (!view.visible) return null;
  return (
    <button
      type="button"
      aria-label={getLabel(view.percent)}
      className={[controls.button, styles.dock].filter(Boolean).join(' ')}
      onClick={() => {
        window.scrollTo({
          top: measureDocument().stepTarget,
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)')
            .matches
            ? 'instant'
            : 'smooth',
        });
      }}
    >
      <svg
        viewBox="0 0 48 48"
        aria-hidden="true"
        className={styles.ring}
      >
        <circle cx="24" cy="24" r="21" className={styles.track} />
        <circle
          cx="24"
          cy="24"
          r="21"
          pathLength="100"
          strokeDasharray="100"
          strokeDashoffset={100 - view.percent}
          transform="rotate(-90 24 24)"
          className={styles.progress}
        />
      </svg>
      <ArrowUpIcon size={20} aria-hidden="true" />
    </button>
  );
}
