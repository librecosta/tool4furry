import * as stylex from '@stylexjs/stylex';
import { tokens as t } from '../../styles/tokens.stylex';
export const s = stylex.create({
  stack: {display: 'grid', gap: t.space16, minWidth: 0},
  emptyIntake: {display: 'grid', gap: t.space8, minWidth: 0},
  intake: {display: 'grid', gridTemplateColumns: {default: 'minmax(0, 1fr) auto auto', '@media (max-width: 600px)': 'minmax(0, 1fr)'}, alignItems: 'center', gap: t.space8, minWidth: 0},
  workspace: {display: 'grid', gridTemplateColumns: {default: 'minmax(0, 1.85fr) minmax(300px, 1fr)', '@media (max-width: 900px)': 'minmax(0, 1fr)'}, alignItems: 'start', gap: t.space24, minWidth: 0},
  settings: {display: 'grid', gap: t.space16, padding: {default: t.space16, '@media (max-width: 900px)': 0}, minWidth: 0},
  panelHeading: {display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: t.space8},
  row: {display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: t.space8},
  heading: {fontSize: 16, fontWeight: 600, margin: 0},
  note: {fontSize: 13, lineHeight: 1.6, color: t.textSecondary, margin: 0, overflowWrap: 'anywhere'},
  error: {fontSize: 13, lineHeight: 1.6, color: t.danger, margin: 0, overflowWrap: 'anywhere'},
  action: {borderWidth: 0, backgroundColor: {default: t.surfacePanel, ':hover': t.surfaceHover, ':active': t.surfaceMuted}, textDecoration: 'none'},
  main: {borderWidth: 0, backgroundColor: {default: t.communityAction, ':hover': t.communityActionHover}, color: t.onCommunityAction, textDecoration: 'none'},
  help: {fontSize: 13, lineHeight: 1.6, color: t.textSecondary},
  unit: {display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 92px', alignItems: 'start', gap: t.space8},
  strengths: {display: 'flex', gap: t.space4, flexWrap: 'wrap'},
  strength: {flexGrow: 1},
  delivery: {display: 'grid', gap: t.space8},
  fileDetails: {display: 'flex', flexDirection: 'column', whiteSpace: 'normal', overflowWrap: 'anywhere'},
  output: {color: t.textPrimary},
});
