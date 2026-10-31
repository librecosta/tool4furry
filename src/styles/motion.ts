import * as stylex from '@stylexjs/stylex';

/** State feedback only: focus outlines and all data updates remain immediate. */
export const motion = stylex.create({
  selection: {
    transitionProperty: 'background-color, border-color, color, opacity',
    transitionDuration: { default: '280ms', '@media (prefers-reduced-motion: reduce)': '0ms' },
    transitionTimingFunction: 'ease-out',
  },
  backdrop: {
    opacity: { default: 1, ':is([data-starting-style], [data-ending-style])': 0 },
    transitionProperty: 'opacity',
    transitionDuration: { default: '300ms', '@media (prefers-reduced-motion: reduce)': '0ms' },
    transitionTimingFunction: 'ease-out',
  },
  dialog: {
    opacity: { default: 1, ':is([data-starting-style], [data-ending-style])': 0 },
    scale: { default: '1', ':is([data-starting-style], [data-ending-style])': '0.98' },
    transitionProperty: 'opacity, scale',
    transitionDuration: { default: '300ms', '@media (prefers-reduced-motion: reduce)': '0ms' },
    transitionTimingFunction: 'ease-out',
  },
});
