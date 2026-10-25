import * as stylex from '@stylexjs/stylex';
import { tokens as t } from './tokens.stylex';

export const navigationStyles = stylex.create({
  actions: { display: 'flex', alignItems: 'center', gap: t.space4, flexShrink: 0 },
  control: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    minWidth: 44, minHeight: 44, padding: 8, gap: t.space4,
    '@media (max-width: 600px)': { minWidth: 40, minHeight: 44, padding: 6 },
    color: t.textPrimary, backgroundColor: { default: 'transparent', ':hover': t.surfaceHover },
    borderWidth: 0, borderRadius: t.radiusMd, fontSize: 14, fontWeight: 500,
    textDecoration: 'none', flexShrink: 0,
  },
  currentLanguage: { display: { default: 'inline', '@media (max-width: 600px)': 'none' }, color: t.textSecondary },
  account: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 40, height: 40, flexShrink: 0, borderRadius: '50%',
    backgroundColor: t.surfaceMuted, color: t.textSecondary,
  },
  toolboxLabel: { display: { default: 'inline', '@media (max-width: 600px)': 'none' } },
  mobileToolbox: { display: { default: 'none', '@media (max-width: 600px)': 'block' } },
  debug: {
    '@media (max-width: 600px)': { position: 'absolute', right: 16, top: 80 },
  },
});
