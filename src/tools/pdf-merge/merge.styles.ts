import * as stylex from '@stylexjs/stylex';
import { tokens as t } from '../../styles/tokens.stylex';

export const mergeStyles = stylex.create({
  actions: {
    display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: t.space8, width: '100%', maxWidth: 640, alignItems: 'stretch',
    '@media (max-width: 340px)': { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' },
  },
  button: {
    borderWidth: 0, borderStyle: 'none', boxShadow: 'none', textDecoration: 'none',
    minWidth: 0, paddingInline: t.space12,
    transform: { default: 'none', ':active': 'none', ':disabled': 'none' },
    transitionProperty: 'background-color, color, opacity',
  },
  primary: {
    backgroundColor: { default: t.action, ':hover': t.actionHover, ':active': t.actionPressed, ':disabled': t.action },
    color: t.onAction,
  },
  secondary: {
    backgroundColor: { default: t.surfaceMuted, ':hover': t.surfaceHover, ':active': t.actionTint, ':disabled': t.surfaceMuted },
    color: t.textPrimary,
  },
  clear: {
    backgroundColor: { default: t.surfacePanel, ':hover': t.surfaceHover, ':active': t.surfaceMuted, ':disabled': t.surfacePanel },
    color: t.textSecondary,
    '@media (max-width: 340px)': { gridColumn: '1 / -1' },
  },
  list: { listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: t.space8, minWidth: 0 },
  row: {
    position: 'relative', display: 'grid', gridTemplateColumns: '44px minmax(0, 1fr) 44px',
    gap: t.space8, alignItems: 'center', padding: t.space8, minWidth: 0,
    backgroundColor: { default: t.surfacePanel, ':is([data-dragging="true"])': t.actionTint },
    borderRadius: t.radiusSm, userSelect: 'none', touchAction: 'pan-y',
    cursor: { default: 'grab', ':is([aria-disabled="true"])': 'default', ':is([data-dragging="true"])': 'grabbing' },
  },
  before: {
    '::before': { content: '""', position: 'absolute', top: -5, insetInline: 0, height: 3, backgroundColor: t.supportLavender, pointerEvents: 'none' },
  },
  after: {
    '::after': { content: '""', position: 'absolute', bottom: -5, insetInline: 0, height: 3, backgroundColor: t.supportLavender, pointerEvents: 'none' },
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
  handle: { cursor: { default: 'grab', ':active': 'grabbing', ':disabled': 'not-allowed' }, touchAction: 'pan-y' },
  hidden: { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clipPath: 'inset(50%)', whiteSpace: 'nowrap' },
});
