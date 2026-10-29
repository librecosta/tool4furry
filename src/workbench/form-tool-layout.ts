import * as stylex from '@stylexjs/stylex';
import { tokens } from '../styles/tokens.stylex';

// Opt-in layout recipe inside WorkbenchShell mode="form" formWidth="wide".
// Apply container (+ columns + split), then leading/aside/main in the split variant.
// Keep DOM reading order leading -> aside -> main; CSS never moves the nodes.
export const formToolLayout = stylex.create({
  container: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr)',
    gap: tokens.space24,
    alignItems: 'start',
    minWidth: 0,
    maxWidth: 960,
    marginInline: 'auto',
  },
  columns: {
    gridTemplateColumns: {
      default: 'minmax(0, 1fr) 350px',
      '@media (max-width: 1050px)': 'minmax(0, 1fr)',
    },
  },
  split: {
    maxWidth: 'none',
    // A tall aside grows the final empty track, not the leading/main tracks.
    gridTemplateRows: {
      default: 'min-content min-content 1fr',
      '@media (max-width: 1050px)': 'auto',
    },
    rowGap: { default: 0, '@media (max-width: 1050px)': tokens.space24 },
  },
  leading: {
    minWidth: 0,
    gridColumn: { default: '1', '@media (max-width: 1050px)': 'auto' },
    gridRow: { default: '1', '@media (max-width: 1050px)': 'auto' },
    marginBottom: { default: tokens.space24, '@media (max-width: 1050px)': 0 },
  },
  aside: {
    minWidth: 0,
    gridColumn: { default: '2', '@media (max-width: 1050px)': 'auto' },
    gridRow: { default: '1 / span 3', '@media (max-width: 1050px)': 'auto' },
  },
  main: {
    minWidth: 0,
    gridColumn: { default: '1', '@media (max-width: 1050px)': 'auto' },
    gridRow: { default: '2', '@media (max-width: 1050px)': 'auto' },
  },
});
