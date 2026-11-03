import * as stylex from '@stylexjs/stylex';
import { tokens as t } from './tokens.stylex';

const pixelBubble = stylex.keyframes({
  '0%': { opacity: 0, transform: 'translateY(0)' },
  '18%': { opacity: 'var(--bubble-opacity)' },
  '65%': { opacity: 'var(--bubble-opacity)' },
  '100%': { opacity: 0, transform: 'translateY(calc(-1 * var(--bubble-rise)))' },
});

export const documentDockStyles = stylex.create({
  root: {
    position: 'fixed', right: 'max(20px, env(safe-area-inset-right))',
    bottom: 'max(20px, env(safe-area-inset-bottom))', zIndex: t.layerDock,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 56, height: 56, padding: 0, borderWidth: 0, borderRadius: 0,
    backgroundColor: 'transparent', boxShadow: 'none', cursor: 'pointer',
    outlineStyle: { default: 'none', ':focus-visible': 'solid' },
    outlineWidth: 2, outlineColor: t.focus, outlineOffset: 4,
  },
  orb: { display: 'block', width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' },
  segment: { fill: { default: t.borderStrong, ':is([data-active])': t.textPrimary } },
  number: { fill: t.textPrimary },
  particle: {
    opacity: 0, fill: t.textSecondary,
    animationName: {
      default: 'none',
      '@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)': {
        default: 'none', ':is([data-document-dock]:hover *)': pixelBubble,
      },
    },
    animationTimingFunction: 'linear',
    animationIterationCount: 'infinite', animationFillMode: 'both',
  },
});
