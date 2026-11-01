import * as stylex from '@stylexjs/stylex';
import { tokens as t } from '../../styles/tokens.stylex';
export const s = stylex.create({
  stack: {display: 'grid', gap: t.space16, minWidth: 0},
  settings: {display: 'grid', gap: t.space16, padding: t.space16, backgroundColor: t.surfacePanel, borderRadius: t.radiusLg, minWidth: 0},
  grid: {display: 'grid', gridTemplateColumns: {default: 'repeat(2, minmax(0, 1fr))', '@media (max-width: 600px)': 'minmax(0, 1fr)'}, gap: t.space16},
  row: {display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: t.space8},
  heading: {fontSize: 16, fontWeight: 600, margin: 0},
  note: {fontSize: 13, lineHeight: 1.6, color: t.textSecondary, margin: 0, overflowWrap: 'anywhere'},
  error: {fontSize: 13, lineHeight: 1.6, color: t.danger, margin: 0, overflowWrap: 'anywhere'},
  action: {borderWidth: 0, backgroundColor: {default: t.surfacePanel, ':hover': t.surfaceHover, ':active': t.surfaceMuted}, textDecoration: 'none'},
  main: {borderWidth: 0, backgroundColor: {default: t.supportLavender, ':hover': `color-mix(in srgb, ${t.supportLavender} 85%, ${t.textPrimary})`}, color: t.inputSurface, textDecoration: 'none'},
  choice: {borderWidth: 0, color: t.supportLavender, backgroundColor: {default: t.actionTint, ':hover': t.surfaceHover}, boxShadow: 'none', textDecoration: 'none'},
  help: {fontSize: 13, lineHeight: 1.6, color: t.textSecondary},
  unit: {display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 100px', gap: t.space8},
});
