// Legacy tool-facing export. Remove after its tool consumers migrate in V0.9-C.
import * as stylex from '@stylexjs/stylex';
import { tokens } from '../styles/tokens.stylex';
export const fieldStyles = stylex.create({
  error: {
    margin: 0,
    color: tokens.danger,
    fontSize: 13,
    overflowWrap: 'anywhere',
  },
  area: { resize: 'vertical', minHeight: 120 },
  disabled: { opacity: 0.55, cursor: 'not-allowed' },
  label: { fontWeight: 500 },
});
