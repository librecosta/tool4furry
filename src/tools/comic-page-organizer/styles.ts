import * as stylex from '@stylexjs/stylex';
import { tokens as t } from '../../styles/tokens.stylex';

export const comicStyles = stylex.create({
  stack: {display: 'grid', gap: t.space16, minWidth: 0},
  row: {display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: t.space8, minWidth: 0},
  toolbar: {display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: t.space12},
  note: {margin: 0, color: t.textSecondary, fontSize: 13, lineHeight: 1.7, overflowWrap: 'anywhere'},
  error: {color: t.danger},
  action: {
    borderWidth: 0, textDecoration: 'none', boxShadow: 'none',
    backgroundColor: {default: t.surfacePanel, ':hover': t.surfaceHover, ':active': t.surfaceMuted},
  },
  primary: {
    borderWidth: 0, backgroundColor: {default: t.communityAction, ':hover': t.communityActionHover, ':active': t.communityActionHover},
    color: t.onCommunityAction, textDecoration: 'none', boxShadow: 'none',
  },
  selected: {backgroundColor: `color-mix(in srgb, ${t.supportLavender} 14%, ${t.surfacePanel})`},
  grid: {display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 190px), 1fr))', gap: t.space16, padding: 0, margin: 0, listStyle: 'none'},
  page: {display: 'grid', alignContent: 'start', gap: t.space4, minWidth: 0, padding: t.space8, borderRadius: t.radiusMd},
  thumb: {height: 196, minWidth: 0, position: 'relative', borderRadius: t.radiusMd, overflow: 'hidden', backgroundColor: t.surfacePanel},
  name: {margin: 0, fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'},
  cover: {fontSize: 12, fontWeight: 600, color: t.supportLavender},
  icon: {width: 44, height: 44, padding: 0, borderWidth: 0, backgroundColor: {default: t.surfacePanel, ':hover': t.surfaceHover, ':active': t.surfaceMuted}, textDecoration: 'none', boxShadow: 'none'},
  empty: {paddingBlock: t.space32, textAlign: 'center', color: t.textSecondary},
});
