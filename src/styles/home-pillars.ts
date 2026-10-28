import * as stylex from '@stylexjs/stylex';
import { tokens } from './tokens.stylex';

export const pillarStyles = stylex.create({
  section: { marginBottom: { default: 64, '@media (max-width: 840px)': 48 } },
  accessibleHeading: { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clipPath: 'inset(50%)', whiteSpace: 'nowrap' },
  grid: { display: 'grid', gridTemplateColumns: { default: 'repeat(3, minmax(0, 1fr))', '@media (max-width: 840px)': 'minmax(0, 1fr)' }, gap: { default: 96, '@media (max-width: 840px)': 64 } },
  pillar: {
    position: 'relative', minWidth: 0, display: 'grid', gridTemplateRows: 'auto auto 1fr auto', gap: 16,
    '--pillar-opacity': { default: '1', ':is([data-pillar-reveal="pending"])': '0' },
    '--pillar-shift': { default: '0px', ':is([data-pillar-reveal="pending"])': '10px' },
    '--pillar-clip': { default: '0%', ':is([data-pillar-reveal="pending"])': '100%' },
    '--pillar-spin': { default: '0deg', ':is([data-pillar-reveal="pending"])': '-16deg' },
    '--pillar-stroke': { default: '1', ':is([data-pillar-reveal="pending"])': '0' },
    '--pillar-line-opacity': { default: '.72', ':hover': '.84', ':focus-within': '.84' },
    '@media (prefers-reduced-motion: reduce)': { '--pillar-opacity': '1', '--pillar-shift': '0px', '--pillar-clip': '0%', '--pillar-spin': '0deg', '--pillar-stroke': '1' },
  },
  second: { '--pillar-stagger': '140ms' },
  third: { '--pillar-stagger': '280ms' },
  separator: { position: 'absolute', top: { default: -8, '@media (max-width: 840px)': -48 }, left: { default: -48, '@media (max-width: 840px)': 12 }, width: 6, height: { default: 'calc(100% + 16px)', '@media (max-width: 840px)': 32 }, transform: 'rotate(12deg)', pointerEvents: 'none' },
  stroke: { display: 'block', width: '100%', height: '100%', backgroundColor: tokens.textSecondary, opacity: 'var(--pillar-line-opacity)', transform: 'scaleY(var(--pillar-stroke))', transformOrigin: 'center top', transitionProperty: 'transform, opacity', transitionDuration: { default: '0ms', ':is([data-pillar-reveal="visible"] *)': '480ms' }, transitionTimingFunction: 'cubic-bezier(.22, 1, .36, 1)', '@media (prefers-reduced-motion: reduce)': { transitionDuration: '0ms' } },
  motion: {
    opacity: 'var(--pillar-opacity)', transform: 'translateY(var(--pillar-shift))',
    transitionProperty: 'opacity, transform, clip-path', transitionTimingFunction: 'cubic-bezier(.22, 1, .36, 1)',
    transitionDuration: { default: '0ms', ':is([data-pillar-reveal="visible"] *)': '400ms' },
    transitionDelay: { default: '0ms', ':is([data-pillar-reveal="visible"] *)': 'calc(var(--pillar-stagger, 0ms) + var(--pillar-part-delay, 0ms))' },
    '@media (prefers-reduced-motion: reduce)': { transitionDuration: '0ms', transitionDelay: '0ms' },
  },
  numberWindow: { width: 'fit-content', overflow: 'hidden' },
  number: { display: 'block', fontSize: { default: 'clamp(80px, 6vw, 96px)', '@media (max-width: 840px)': 72 }, fontWeight: 700, lineHeight: 1, letterSpacing: '-.065em', clipPath: 'inset(0 0 var(--pillar-clip) 0)', '--pillar-part-delay': '180ms', transitionDuration: { default: '0ms', ':is([data-pillar-reveal="visible"] *)': '500ms', '@media (prefers-reduced-motion: reduce)': '0ms' } },
  title: { margin: 0, fontSize: 24, lineHeight: 1.35, fontWeight: 650, letterSpacing: '-.02em', '--pillar-part-delay': '480ms' },
  body: { display: 'flex', alignItems: 'flex-start', gap: { default: 20, '@media (max-width: 1100px)': 16 }, minWidth: 0 },
  gear: { display: 'block', flexShrink: 0, width: { default: 80, '@media (max-width: 1100px)': 64 }, height: { default: 80, '@media (max-width: 1100px)': 64 }, color: tokens.textSecondary, transform: 'translateY(var(--pillar-shift)) rotate(var(--pillar-spin))', '--pillar-part-delay': '360ms', transitionDuration: { default: '0ms', ':is([data-pillar-reveal="visible"] *)': '560ms', '@media (prefers-reduced-motion: reduce)': '0ms' } },
  gearIcon: { display: 'block', width: '100%', height: '100%' },
  description: { minWidth: 0, maxWidth: 280, margin: 0, fontSize: 14, lineHeight: 1.8, color: tokens.textSecondary, '--pillar-part-delay': '560ms' },
  links: { display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0 20px', '--pillar-part-delay': '640ms' },
});
