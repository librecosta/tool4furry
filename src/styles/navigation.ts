import * as stylex from '@stylexjs/stylex';
import { tokens as t } from './tokens.stylex';

export const navigationStyles = stylex.create({
  actions: { display: 'flex', alignItems: 'center', gap: t.space4, flexShrink: 0 },
  control: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    minWidth: 44, minHeight: 44, padding: 8, gap: t.space4,
    color: t.textPrimary, backgroundColor: { default: 'transparent', ':hover': t.surfaceHover },
    borderWidth: 0, borderRadius: t.radiusMd, fontSize: 14, fontWeight: 500,
    textDecoration: 'none', flexShrink: 0,
  },
  currentLanguage: { display: { default: 'inline', '@media (max-width: 600px)': 'none' }, color: t.textSecondary },
  account: {
    display: { default: 'inline-flex', '@media (max-width: 600px)': 'none' },
    alignItems: 'center', justifyContent: 'center',
    width: 44, height: 44, flexShrink: 0, color: t.textSecondary,
  },
  brand: { fontSize: { default: 18, '@media (max-width: 600px)': 16 } },
  brandFull: { display: { default: 'inline', '@media (max-width: 600px)': 'none' } },
  brandShort: { display: { default: 'none', '@media (max-width: 600px)': 'inline' } },
  toolboxLabel: { display: { default: 'inline', '@media (max-width: 360px)': 'none' } },
  mobileToolbox: { display: { default: 'none', '@media (max-width: 360px)': 'block' } },
  chevron: {
    display: { default: 'block', '@media (max-width: 360px)': 'none' },
    transform: 'rotate(var(--toolbox-rotation))',
  },
  disclosure: {
    '--toolbox-rotation': { default: '0deg', ':is([open])': '180deg' },
    position: { default: 'relative', '@media (max-width: 600px)': 'static' },
    flexShrink: 0,
  },
  trigger: { cursor: 'pointer', listStyle: 'none', '::-webkit-details-marker': { display: 'none' } },
  positioner: {
    position: 'absolute', top: '100%', left: 0, width: 360,
    maxWidth: 'calc(100vw - 32px)', paddingTop: 8, zIndex: t.layerFloating,
    '@media (max-width: 600px)': { left: 16, right: 16, width: 'auto', maxWidth: 'none' },
  },
  panel: {
    padding: t.space8, borderRadius: t.radiusLg, backgroundColor: t.surfaceFloating,
    boxShadow: t.shadowFloating, maxHeight: 'min(520px, calc(100dvh - 96px))',
    overflowY: 'auto', overscrollBehavior: 'contain',
  },
  panelHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: t.space8, paddingInline: t.space8, minHeight: 44,
    color: t.textSecondary, fontSize: 13,
  },
  browse: {
    display: 'inline-flex', alignItems: 'center', minHeight: 44,
    color: { default: t.textSecondary, ':hover': t.textPrimary },
    textDecoration: 'none', fontSize: 13,
  },
  tool: {
    display: 'grid', gap: t.space4, minHeight: 44, padding: t.space12,
    borderRadius: t.radiusMd, color: t.textPrimary, textDecoration: 'none',
    backgroundColor: { default: 'transparent', ':hover': t.surfaceHover, ':is([aria-current="page"])': t.surfaceMuted },
  },
  toolTitle: { fontSize: 14, fontWeight: 500, lineHeight: 1.5 },
  description: { margin: 0, color: t.textSecondary, fontSize: 13, lineHeight: 1.6, overflowWrap: 'anywhere' },
  empty: { margin: 0, padding: t.space12, color: t.textSecondary, fontSize: 14 },
  debug: {
    '@media (max-width: 600px)': { position: 'absolute', right: 16, top: 80 },
  },
});
