import * as stylex from '@stylexjs/stylex';
import { tokens as t } from '../../styles/tokens.stylex';

export const mergeStyles = stylex.create({
  actions: {
    display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: t.space8, width: '100%', alignItems: 'stretch',
    '@media (max-width: 360px)': { gap: 6 },
  },
  button: {
    borderWidth: 0, borderStyle: 'none', boxShadow: 'none', textDecoration: 'none',
    minWidth: 0, width: '100%', height: 44, paddingInline: t.space12, paddingBlock: 0,
    transform: { default: 'none', ':active': 'none', ':disabled': 'none' },
    transitionProperty: 'background-color, color, opacity',
    '@media (max-width: 360px)': { paddingInline: t.space4, fontSize: 13 },
  },
  primary: {
    transform: { default: 'none', ':active': 'translateY(1px)', ':disabled': 'none' },
  },
  secondary: {
    backgroundColor: { default: t.surfaceMuted, ':hover': t.surfaceHover, ':active': t.actionTint, ':disabled': t.surfaceMuted },
    color: t.textPrimary,
  },
  clear: {
    backgroundColor: { default: t.surfacePanel, ':hover': t.surfaceHover, ':active': t.surfaceMuted, ':disabled': t.surfacePanel },
    color: t.textSecondary,
  },
  list: { listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: t.space8, minWidth: 0 },
  row: {
    position: 'relative', display: 'grid', gridTemplateColumns: '28px minmax(0, 1fr) 44px',
    gap: t.space8, alignItems: 'center', padding: t.space8, minWidth: 0,
    backgroundColor: { default: t.surfacePanel, ':is([data-dragging="true"])': t.surfaceFloating },
    borderRadius: t.radiusSm, userSelect: 'none', touchAction: 'pan-y',
    cursor: { default: 'grab', ':is([aria-disabled="true"])': 'default', ':is([data-dragging="true"])': 'grabbing' },
  },
  info: { minWidth: 0 },
  name: { display: 'block', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' },
  detail: { margin: 0, color: t.textSecondary, fontSize: 13 },
  icon: {
    borderWidth: 0, borderStyle: 'none', boxShadow: 'none', textDecoration: 'none',
    padding: 0, width: 44, height: 44, minWidth: 44, flexShrink: 0,
    color: t.textSecondary,
    backgroundColor: { default: t.surfaceMuted, ':hover': t.surfaceHover, ':active': t.actionTint, ':disabled': t.surfaceMuted },
    transform: { default: 'none', ':active': 'none', ':disabled': 'none' },
  },
  handle: {
    width: 28, minWidth: 28,
    backgroundColor: { default: 'transparent', ':hover': 'transparent', ':active': 'transparent', ':disabled': 'transparent' },
    color: { default: t.textSecondary, ':hover': t.textPrimary },
    opacity: { default: 0.65, ':hover': 1, ':disabled': 0.4 },
    cursor: { default: 'grab', ':active': 'grabbing', ':disabled': 'not-allowed' }, touchAction: 'pan-y',
  },
  hidden: { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clipPath: 'inset(50%)', whiteSpace: 'nowrap' },
});
