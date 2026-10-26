import * as stylex from '@stylexjs/stylex';
import { tokens as t } from './tokens.stylex';

export const navigationStyles = stylex.create({
  chrome: { backgroundColor: t.navFloatingBackground, color: t.navText, '--t4f-focus': t.navFocus },
  actions: { display: 'flex', alignItems: 'center', gap: t.space4, flexShrink: 0 },
  control: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    minWidth: 44, minHeight: 44, padding: 8, gap: t.space4,
    color: t.navText, backgroundColor: { default: 'transparent', ':hover': t.navHover },
    outlineColor: { default: t.navFocus, ':focus-visible': t.navFocus },
    borderWidth: 0, borderRadius: t.radiusMd, fontSize: 14, fontWeight: 500,
    textDecoration: 'none', flexShrink: 0,
  },
  currentLanguage: { color: t.navText, fontWeight: 700 },
  // Only the right-hand interactive controls; disclosure/account stay separate.
  controlMotion: {
    transitionProperty: 'color, background-color',
    transitionDuration: { default: '300ms', '@media (prefers-reduced-motion: reduce)': '0ms' },
    transitionTimingFunction: 'ease-out',
  },
  targetLanguage: { color: t.navSecondary, fontWeight: 400 },
  // Display stays with the root appearance visibility rules in global.css.
  appearanceIcon: { width: 20, height: 20, lineHeight: 0, alignItems: 'center', justifyContent: 'center' },
  svg: { display: 'block' },
  labelFull: { display: { default: 'inline', '@media (max-width: 600px)': 'none' } },
  labelShort: { display: { default: 'none', '@media (max-width: 600px)': 'inline' } },
  account: {
    display: { default: 'inline-flex', '@media (max-width: 600px)': 'none' },
    alignItems: 'center', justifyContent: 'center',
    width: 44, height: 44, flexShrink: 0, color: t.navSecondary,
  },
  brand: { fontSize: { default: 22, '@media (max-width: 600px)': 16 }, fontWeight: 700, letterSpacing: '-0.035em' },
  symbol: {
    display: 'block', width: 24, height: 24, flexShrink: 0,
    backgroundColor: 'currentColor',
    maskImage: 'url("/brand/tool4furry-symbol.svg")',
    maskRepeat: 'no-repeat', maskPosition: 'center', maskSize: 'contain',
  },
  brandFull: { display: { default: 'inline', '@media (max-width: 600px)': 'none' } },
  brandShort: { display: { default: 'none', '@media (max-width: 600px)': 'inline' } },
  toolboxLabel: { display: { default: 'inline', '@media (max-width: 360px)': 'none' } },
  mobileToolbox: { display: { default: 'none', '@media (max-width: 360px)': 'block' } },
  chevron: {
    display: { default: 'flex', '@media (max-width: 360px)': 'none' },
    width: 16, height: 16, flexShrink: 0, lineHeight: 0,
    alignItems: 'center', justifyContent: 'center', transformOrigin: 'center',
    transform: 'rotate(var(--toolbox-rotation))',
    transitionProperty: 'transform',
    transitionDuration: { default: '300ms', '@media (prefers-reduced-motion: reduce)': '0ms' },
    transitionTimingFunction: 'ease',
  },
  disclosure: {
    '--toolbox-rotation': { default: '0deg', ':is([open]:not([data-tool-motion]))': '180deg' },
    '--toolbox-hidden': { default: '100%', ':is([open]:not([data-tool-motion]))': '0%' },
    '--toolbox-opacity': { default: '0.98', ':is([open]:not([data-tool-motion]))': '1' },
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
    '--t4f-focus': t.focus,
    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: t.layerFloating,
    backgroundColor: t.featuredBackground,
    clipPath: 'inset(0 0 var(--toolbox-hidden) 0)',
    opacity: 'var(--toolbox-opacity)',
    pointerEvents: { default: 'auto', ':is([inert])': 'none' },
    transitionProperty: 'clip-path, opacity',
    transitionDuration: { default: '420ms', '@media (prefers-reduced-motion: reduce)': '0ms' },
    transitionTimingFunction: 'cubic-bezier(0.2, 0, 0.2, 1)',
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
    color: { default: t.textSecondary, ':hover': t.featuredAccent },
    textDecoration: 'none', fontSize: 13,
  },
  tool: {
    display: 'grid', gap: t.space4, alignContent: 'start', minHeight: 44, padding: t.space8,
    color: { default: t.textPrimary, ':hover': t.featuredAccent, ':is([aria-current="page"])': t.featuredAccent }, textDecoration: 'none',
    backgroundColor: { default: 'transparent', ':hover': t.featuredHover, ':is([aria-current="page"])': t.featuredSelected },
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
