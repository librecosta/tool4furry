import * as stylex from '@stylexjs/stylex';
import { tokens } from './tokens.stylex';

// Shared appearance only; Base UI owns menu navigation, dismissal and focus.
export const menuStyles = stylex.create({
  positioner: { zIndex: tokens.layerFloating },
  popup: {
    width: 280,
    maxWidth: 'calc(100vw - 32px)',
    maxHeight: 'var(--available-height)',
    overflowY: 'auto',
    overscrollBehavior: 'contain',
    padding: tokens.space8,
    backgroundColor: tokens.surfaceMuted,
    color: tokens.textPrimary,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: tokens.border,
    borderRadius: tokens.radiusLg,
    boxShadow: tokens.shadowFloating,
  },
  label: { padding: tokens.space8, fontSize: 13, fontWeight: 600 },
  note: {
    margin: 0,
    padding: tokens.space8,
    fontSize: 13,
    color: tokens.textSecondary,
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    minHeight: 44,
    padding: tokens.space8,
    borderRadius: tokens.radiusSm,
    color: tokens.textPrimary,
    fontSize: 14,
    textDecoration: {
      default: 'none',
      ':is([aria-current="page"])': 'underline',
    },
    textUnderlineOffset: 4,
    backgroundColor: {
      default: 'transparent',
      ':is([data-highlighted])': tokens.border,
      ':is([aria-current="page"])': tokens.actionTint,
    },
    outline: {
      default: 'none',
      ':is([data-highlighted])': `2px solid ${tokens.focus}`,
    },
    outlineOffset: -2,
  },
});
