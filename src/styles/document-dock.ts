import * as stylex from '@stylexjs/stylex';
import { tokens as t } from './tokens.stylex';

export const documentDockStyles = stylex.create({
  root: {
    position: 'fixed', right: 'max(20px, env(safe-area-inset-right))',
    bottom: 'max(20px, env(safe-area-inset-bottom))', zIndex: t.layerDock,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 56, height: 56, padding: 0, borderWidth: 0, borderRadius: 0,
    backgroundColor: 'transparent', boxShadow: 'none', cursor: 'pointer',
    color: { default: t.surfaceFloating, ':hover': t.surfaceHover, ':active': t.surfaceMuted },
    outlineStyle: { default: 'none', ':focus-visible': 'solid' },
    outlineWidth: 2, outlineColor: t.focus, outlineOffset: 4,
    transitionProperty: 'color', transitionTimingFunction: 'ease-out',
    transitionDuration: { default: '140ms', '@media (prefers-reduced-motion: reduce)': '0ms' },
  },
  orb: { display: 'block', width: '100%', height: '100%', pointerEvents: 'none' },
  plate: { fill: 'currentColor' },
  segment: { fill: { default: t.borderStrong, ':is([data-active])': t.textPrimary } },
  number: { fill: t.textPrimary },
});
