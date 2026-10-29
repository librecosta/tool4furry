import * as stylex from '@stylexjs/stylex';
import { tokens } from './tokens.stylex';

export const communityStyles = stylex.create({
  // Roles already supply 40px below their content; avoid stacking another 64px.
  workflow: { paddingTop: 0 },
  section: { marginBottom: 48 },
  accessibleHeading: { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clipPath: 'inset(50%)', whiteSpace: 'nowrap' },
  grid: { display: 'grid', gridTemplateColumns: { default: 'repeat(3, minmax(0, 1fr))', '@media (max-width: 1100px)': 'repeat(2, minmax(0, 1fr))', '@media (max-width: 600px)': 'minmax(0, 1fr)' }, gap: 24 },
  card: { minWidth: 0, minHeight: 196, display: 'flex', flexDirection: 'column', gap: 10, padding: 18, borderRadius: 14, backgroundColor: tokens.surfacePanel, textAlign: 'left' },
  title: { margin: 0, fontSize: 18, fontWeight: 600, lineHeight: 1.4, color: tokens.textPrimary },
  qqBody: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 16 },
  qqCopy: { minWidth: 0, flex: '1 1 120px' },
  qqHint: { marginTop: 8 },
  qr: { display: 'block', flexShrink: 0, width: { default: 128, '@media (max-width: 360px)': 112 }, height: { default: 128, '@media (max-width: 360px)': 112 }, objectFit: 'contain' },
  description: { margin: 0, fontSize: 14, lineHeight: 1.6, color: tokens.textSecondary, textWrap: 'pretty' },
  footer: { marginTop: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 },
  note: { margin: 0, fontSize: 12, lineHeight: 1.6, color: tokens.textSecondary },
  logo: { display: 'block', flexShrink: 0, width: 20, height: 20, objectFit: 'contain' },
  action: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44, paddingInline: 14, borderRadius: 8, backgroundColor: { default: tokens.communityAction, ':hover': tokens.communityActionHover, ':focus-visible': tokens.communityActionHover, ':active': tokens.communityActionHover }, color: tokens.onCommunityAction, textDecoration: 'none', fontSize: 14, fontWeight: 500, transitionProperty: 'background-color', transitionDuration: { default: '220ms', '@media (prefers-reduced-motion: reduce)': '0ms' } },
});
