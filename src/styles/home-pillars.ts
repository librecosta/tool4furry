import * as stylex from '@stylexjs/stylex';
import { tokens } from './tokens.stylex';

export const pillarStyles = stylex.create({
  section: {
    marginBottom: { default: 64, '@media (max-width: 840px)': 48 },
    '--pillar-opacity': { default: '1', ':is([data-pillar-reveal="pending"])': '0' },
    '--pillar-shift': { default: '0px', ':is([data-pillar-reveal="pending"])': '10px' },
    '--pillar-clip': { default: '0%', ':is([data-pillar-reveal="pending"])': '100%' },
    '--pillar-stroke': { default: '1', ':is([data-pillar-reveal="pending"])': '0' },
    '@media (prefers-reduced-motion: reduce)': { '--pillar-opacity': '1', '--pillar-shift': '0px', '--pillar-clip': '0%', '--pillar-stroke': '1' },
  },
  accessibleHeading: { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clipPath: 'inset(50%)', whiteSpace: 'nowrap' },
  cap: { display: 'block', width: '100%', height: 2, marginBottom: 32, backgroundColor: tokens.textSecondary, opacity: .72, transform: 'scaleX(var(--pillar-stroke))', transformOrigin: 'left center', transitionProperty: 'transform', transitionDuration: { default: '0ms', ':is([data-pillar-reveal="visible"] *)': '320ms', '@media (prefers-reduced-motion: reduce)': '0ms' }, transitionTimingFunction: 'cubic-bezier(.22, 1, .36, 1)' },
  grid: { display: 'grid', gridTemplateColumns: { default: 'repeat(3, minmax(0, 1fr))', '@media (max-width: 840px)': 'minmax(0, 1fr)' }, gap: { default: 96, '@media (max-width: 840px)': 40 } },
  pillar: { position: 'relative', minWidth: 0, display: 'grid', gridTemplateRows: 'auto 1fr auto', gap: 20 },
  second: { '--pillar-stagger': '80ms' },
  third: { '--pillar-stagger': '160ms' },
  separator: { display: { default: 'block', '@media (max-width: 840px)': 'none' }, position: 'absolute', top: 0, left: -48, width: 6, height: '100%', maxHeight: 320, transform: 'rotate(12deg)', pointerEvents: 'none' },
  stroke: { display: 'block', width: '100%', height: '100%', backgroundColor: tokens.textSecondary, opacity: .72, transform: 'scaleY(var(--pillar-stroke))', transformOrigin: 'center top', transitionProperty: 'transform', transitionDuration: { default: '0ms', ':is([data-pillar-reveal="visible"] *)': '360ms' }, transitionDelay: { default: '0ms', ':is([data-pillar-reveal="visible"] *)': '160ms' }, transitionTimingFunction: 'cubic-bezier(.22, 1, .36, 1)', '@media (prefers-reduced-motion: reduce)': { transitionDuration: '0ms', transitionDelay: '0ms' } },
  motion: {
    opacity: 'var(--pillar-opacity)', transform: 'translateY(var(--pillar-shift))',
    transitionProperty: 'opacity, transform, clip-path', transitionTimingFunction: 'cubic-bezier(.22, 1, .36, 1)',
    transitionDuration: { default: '0ms', ':is([data-pillar-reveal="visible"] *)': '400ms' },
    transitionDelay: { default: '0ms', ':is([data-pillar-reveal="visible"] *)': 'calc(var(--pillar-stagger, 0ms) + var(--pillar-part-delay, 0ms))' },
    '@media (prefers-reduced-motion: reduce)': { transitionDuration: '0ms', transitionDelay: '0ms' },
  },
  heading: { display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', alignContent: 'start', gap: '8px 16px' },
  numberWindow: { width: 'fit-content', flexShrink: 0, overflow: 'hidden' },
  number: { display: 'block', fontSize: { default: 'clamp(80px, 6vw, 96px)', '@media (max-width: 840px)': 72 }, fontWeight: 700, lineHeight: 1, letterSpacing: '-.04em', clipPath: 'inset(0 0 var(--pillar-clip) 0)', '--pillar-part-delay': '360ms', transitionDuration: { default: '0ms', ':is([data-pillar-reveal="visible"] *)': '440ms', '@media (prefers-reduced-motion: reduce)': '0ms' } },
  title: { margin: 0, maxWidth: '100%', flexShrink: 0, fontSize: 24, lineHeight: 1.35, fontWeight: 650, letterSpacing: '-.02em', '--pillar-part-delay': '420ms' },
  body: { display: 'flow-root', minWidth: 0 },
  icon: { display: 'block', float: 'inline-start', width: { default: 64, '@media (max-width: 480px)': 48 }, height: { default: 64, '@media (max-width: 480px)': 48 }, marginInlineEnd: 16, marginBottom: { default: 8, '@media (max-width: 480px)': 0 }, color: tokens.textSecondary, '--pillar-part-delay': '560ms' },
  iconSvg: { display: 'block', width: '100%', height: '100%' },
  description: { minWidth: 0, margin: 0, fontSize: 14, lineHeight: 1.8, textWrap: 'pretty', color: tokens.textSecondary, '--pillar-part-delay': '620ms', transitionDuration: { default: '0ms', ':is([data-pillar-reveal="visible"] *)': '440ms', '@media (prefers-reduced-motion: reduce)': '0ms' } },
  links: { display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0 20px', '--pillar-part-delay': '740ms' },
});
