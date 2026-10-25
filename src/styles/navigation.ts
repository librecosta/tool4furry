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
  // Display stays with the root appearance visibility rules in global.css.
  appearanceIcon: { width: 20, height: 20, lineHeight: 0, alignItems: 'center', justifyContent: 'center' },
  svg: { display: 'block' },
  labelFull: { display: { default: 'inline', '@media (max-width: 600px)': 'none' } },
  labelShort: { display: { default: 'none', '@media (max-width: 600px)': 'inline' } },
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
    position: 'static',
    flexShrink: 0,
  },
  trigger: {
    cursor: 'pointer', listStyle: 'none', '::-webkit-details-marker': { display: 'none' },
    // The hover region reaches the panel at the product header's lower edge.
    minHeight: { default: 64, '@media (max-width: 600px)': 56 },
    borderRadius: 0,
  },
  compactTrigger: { minHeight: 44 },
  positioner: {
    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: t.layerFloating,
    backgroundColor: t.surfaceFloating,
  },
  compactPositioner: { left: 16, right: 16, top: 'calc(100% - 16px)' },
  panel: {
    width: '100%', maxWidth: 1280, marginInline: 'auto', paddingBlock: t.space16,
    paddingInline: 'clamp(16px, 2vw, 36px)',
    display: 'grid', gap: t.space24, alignItems: 'start',
    gridTemplateColumns: { default: '200px minmax(0, 1fr)', '@media (max-width: 600px)': 'minmax(0, 1fr)' },
    maxHeight: 'min(520px, calc(100dvh - 112px))',
    overflowY: 'auto', overscrollBehavior: 'contain',
  },
  compactPanel: { gridTemplateColumns: 'minmax(0, 1fr)', gap: t.space8, paddingInline: t.space16 },
  panelHeader: {
    display: 'flex', gap: t.space4,
    flexDirection: { default: 'column', '@media (max-width: 600px)': 'row' },
    alignItems: { default: 'flex-start', '@media (max-width: 600px)': 'center' },
    justifyContent: 'space-between', minHeight: 44,
    color: t.textSecondary, fontSize: 14,
  },
  compactPanelHeader: { flexDirection: 'row', alignItems: 'center' },
  tools: {
    display: 'grid', gap: t.space12, minWidth: 0,
    gridTemplateColumns: { default: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', '@media (max-width: 600px)': 'minmax(0, 1fr)' },
  },
  browse: {
    display: 'inline-flex', alignItems: 'center', minHeight: 44,
    color: { default: t.textSecondary, ':hover': t.textPrimary },
    textDecoration: 'none', fontSize: 13,
  },
  tool: {
    display: 'grid', gap: t.space4, alignContent: 'start', minHeight: 44, padding: t.space8,
    color: t.textPrimary, textDecoration: 'none',
    backgroundColor: { default: 'transparent', ':hover': t.surfaceHover, ':is([aria-current="page"])': t.surfaceMuted },
  },
  toolTitle: { fontSize: 14, fontWeight: 500, lineHeight: 1.5 },
  description: {
    margin: 0, color: t.textSecondary, fontSize: 13, lineHeight: 1.6, overflowWrap: 'anywhere',
    maxWidth: '56ch', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
  },
  empty: { margin: 0, padding: t.space12, color: t.textSecondary, fontSize: 14 },
  debug: {
    '@media (max-width: 600px)': { position: 'absolute', right: 16, top: 80 },
  },
});
