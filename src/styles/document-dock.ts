import * as stylex from '@stylexjs/stylex';
import { tokens as t } from './tokens.stylex';

export const documentDockStyles = stylex.create({
  root: {
    position: 'fixed', right: 'max(20px, env(safe-area-inset-right))',
    bottom: 'max(20px, env(safe-area-inset-bottom))', zIndex: t.layerDock,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 48, height: 48, padding: 0, borderWidth: 0, borderRadius: 10,
    color: t.textSecondary,
    backgroundColor: { default: t.surfaceFloating, ':hover': t.surfaceMuted },
    boxShadow: t.shadowSoft,
  },
  ring: { position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' },
  track: { fill: 'none', stroke: t.border, strokeWidth: 2 },
  progress: { fill: 'none', stroke: t.accent, strokeWidth: 2, strokeLinecap: 'round' },
  icon: { display: 'block', pointerEvents: 'none' },
});
