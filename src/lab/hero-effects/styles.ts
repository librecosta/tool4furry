import * as stylex from '@stylexjs/stylex';
import { tokens } from '../../styles/tokens.stylex';

export const heroLabStyles = stylex.create({
  page: { paddingBottom: 40, minWidth: 0 },
  controls: { padding: '24px clamp(16px, 2vw, 36px)', display: 'grid', gap: 16 },
  note: { margin: 0, fontSize: 13, lineHeight: 1.7, color: tokens.textSecondary, maxWidth: 960 },
  row: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  label: { display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, minHeight: 44 },
  select: { minHeight: 44, padding: '8px 12px', borderRadius: tokens.radiusSm, backgroundColor: tokens.inputSurface, borderColor: tokens.controlBorder, borderStyle: 'solid', borderWidth: tokens.controlBorderWidth, color: tokens.textPrimary },
  stage: { position: 'relative', isolation: 'isolate', width: '100%', height: { default: 'clamp(460px, 38vw, 640px)', '@media (max-width: 760px)': 500 }, overflow: 'hidden', backgroundColor: '#060B12', color: '#EFF6FF', touchAction: 'pan-y' },
  tallStage: { height: { default: 'clamp(460px, 38vw, 640px)', '@media (max-width: 760px)': 680 } },
  canvas: { display: 'block', position: 'absolute', inset: 0, width: '100%', height: '100%', touchAction: 'pan-y' },
  overlay: { position: 'absolute', top: { default: '50%', '@media (max-width: 760px)': 32 }, transform: { default: 'translateY(-50%)', '@media (max-width: 760px)': 'none' }, left: 'clamp(16px, 3vw, 48px)', width: { default: '38%', '@media (max-width: 760px)': 'calc(100% - 32px)' }, pointerEvents: 'none', zIndex: 2 },
  title: { marginBlock: '0 20px', fontSize: 'clamp(28px, 3vw, 48px)', fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.035em', textWrap: 'balance' },
  line: { display: 'block' },
  intro: { fontSize: 15, lineHeight: 1.8, color: '#CBD5E1', maxWidth: 470, margin: 0 },
  fallback: { position: 'absolute', insetInline: 16, bottom: 16, margin: 0, color: '#CBD5E1', fontSize: 13, textAlign: 'center', zIndex: 3 },
  metrics: { display: 'flex', flexWrap: 'wrap', gap: '12px 28px', margin: 0, padding: '20px clamp(16px, 2vw, 36px)', fontSize: 13 },
  metric: { minWidth: 100, maxWidth: '100%', overflowWrap: 'anywhere' },
  term: { color: tokens.textSecondary, fontSize: 12 },
  value: { margin: '4px 0 0', fontVariantNumeric: 'tabular-nums' },
});
