import * as stylex from '@stylexjs/stylex';
import { tokens } from './tokens.stylex';

export const communityStyles = stylex.create({
  // Roles already supply 40px below their content; avoid stacking another 64px.
  workflow: { paddingTop: 0 },
  section: { marginBottom: 48 },
  accessibleHeading: { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clipPath: 'inset(50%)', whiteSpace: 'nowrap' },
  grid: { display: 'grid', gridTemplateColumns: { default: 'repeat(3, minmax(0, 1fr))', '@media (max-width: 1100px)': 'repeat(2, minmax(0, 1fr))', '@media (max-width: 600px)': 'minmax(0, 1fr)' }, gridAutoRows: '1fr', gap: 24 },
  card: { minWidth: 0, minHeight: 250, display: 'grid', gridTemplateRows: 'auto 1fr auto', justifyItems: 'center', gap: 10, padding: 20, borderRadius: 14, backgroundColor: tokens.surfacePanel, textAlign: 'center' },
  title: { margin: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: 8, minHeight: 28, fontSize: 18, fontWeight: 600, lineHeight: 1.4, color: tokens.textPrimary },
  icon: { display: 'block', flexShrink: 0, color: tokens.textSecondary },
  body: { minWidth: 0, display: 'grid', placeItems: 'center', alignSelf: 'stretch' },
  qr: { display: 'block', width: 128, height: 128, objectFit: 'contain' },
  description: { margin: 0, maxWidth: 280, fontSize: 14, lineHeight: 1.7, color: tokens.textSecondary, textWrap: 'pretty' },
  footer: { minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  hint: { margin: 0, fontSize: 13, lineHeight: 1.6, color: tokens.textSecondary },
  action: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minHeight: 44, paddingInline: 16, borderRadius: 8, backgroundColor: { default: tokens.surfaceMuted, ':hover': tokens.surfaceHover, ':focus-visible': tokens.surfaceHover, ':active': tokens.actionPressed }, color: { default: tokens.textPrimary, ':hover': tokens.textPrimary }, textDecoration: 'none', fontSize: 14, fontWeight: 500, transitionProperty: 'background-color, color', transitionDuration: { default: '220ms', '@media (prefers-reduced-motion: reduce)': '0ms' } },
});
