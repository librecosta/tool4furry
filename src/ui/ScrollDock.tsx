import { useEffect, useState } from 'react';
import { ArrowUpIcon } from '@phosphor-icons/react';
import * as stylex from '@stylexjs/stylex';
import { controls } from '../styles/controls';
import { tokens } from '../styles/tokens.stylex';
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
      {...stylex.props(controls.button, styles.dock)}
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
        {...stylex.props(styles.ring)}
      >
        <circle cx="24" cy="24" r="21" {...stylex.props(styles.track)} />
        <circle
          cx="24"
          cy="24"
          r="21"
          pathLength="100"
          strokeDasharray="100"
          strokeDashoffset={100 - view.percent}
          transform="rotate(-90 24 24)"
          {...stylex.props(styles.progress)}
        />
      </svg>
      <ArrowUpIcon size={20} aria-hidden="true" />
    </button>
  );
}

const styles = stylex.create({
  dock: {
    position: 'fixed',
    display: {
      default: 'none',
      '@media (min-width: 900px) and (pointer: fine)': 'inline-flex',
    },
    right: 'max(20px, env(safe-area-inset-right))',
    bottom: 'max(20px, env(safe-area-inset-bottom))',
    zIndex: tokens.layerDock,
    width: 48,
    height: 48,
    padding: 0,
    borderWidth: 0,
    borderRadius: '50%',
    backgroundColor: { default: tokens.surfaceMuted, ':hover': tokens.border },
    color: tokens.action,
    boxShadow: tokens.shadowSoft,
  },
  ring: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  },
  track: { fill: 'none', stroke: tokens.border, strokeWidth: 2 },
  progress: {
    fill: 'none',
    stroke: tokens.action,
    strokeWidth: 2,
    strokeLinecap: 'round',
  },
});
