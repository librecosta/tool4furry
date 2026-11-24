import { CheckIcon, XIcon } from '@phosphor-icons/react';
import type { Locale } from '../../i18n/locale';
import { Button } from '../../ui/Button';
import { tr } from '../general/ui';
import { contrastTargets, suggestContrast, type ContrastTarget, type RGB } from './core';
import s from './color-contrast.module.scss';

function Threshold({ ratio, minimum, locale }: { ratio: number; minimum?: number; locale: Locale }) {
  if (minimum === undefined) return <td aria-label={tr(locale, '不适用', 'Not applicable')}>—</td>;
  const pass = ratio >= minimum;
  const Icon = pass ? CheckIcon : XIcon;
  const status = pass ? tr(locale, '通过', 'Pass') : tr(locale, '不通过', 'Fail');
  return <td data-pass={pass} aria-label={`${status} · ${minimum.toFixed(1)}:1`}>
    <span className={s.threshold}>
      <Icon size={14} weight="bold" aria-hidden /> {minimum.toFixed(1)}
    </span>
  </td>;
}

export function ContrastResults({ locale, ratio, foreground, background, target, onTarget, onApply }: {
  locale: Locale;
  ratio: number | undefined;
  foreground?: RGB;
  background?: RGB;
  target: ContrastTarget;
  onTarget: (target: ContrastTarget) => void;
  onApply: (side: 'foreground' | 'background', hex: string) => void;
}) {
  const t = (zh: string, en: string) => tr(locale, zh, en);
  const rows = [
    { name: t('普通文字', 'Normal text'), aa: 4.5, aaa: 7 },
    { name: t('大号文字', 'Large text'), aa: 3, aaa: 4.5 },
    { name: t('UI 组件与必要图形', 'UI components and essential graphics'), aa: 3 },
  ];
  const needsFix = ratio !== undefined && ratio < target;
  const suggestions = needsFix && foreground && background ? [
    { side: 'foreground' as const, label: t('调整前景', 'Adjust foreground'), result: suggestContrast(foreground, background, target) },
    { side: 'background' as const, label: t('调整背景', 'Adjust background'), result: suggestContrast(background, foreground, target) },
  ] : [];
  const meetsAA = ratio !== undefined && ratio >= 4.5;

  return <section className={s.results} aria-label={t('对比度检测', 'Contrast check')}>
    <h2>{t('对比度', 'Contrast')} · WCAG 2.2</h2>
    <div className={s.score} role="status" aria-label={t('对比度结果', 'Contrast ratio result')}>
      <strong>{ratio === undefined ? '—' : <>{ratio.toFixed(2)} <span>: 1</span></>}</strong>
      {ratio !== undefined && <span data-pass={meetsAA}>
        {meetsAA ? t('普通文字 AA 通过', 'Normal text passes AA') : t('普通文字 AA 未通过', 'Normal text fails AA')}
      </span>}
    </div>
    {ratio !== undefined && <table className={s.checks} aria-label={t('WCAG 2.2 颜色对比度阈值', 'WCAG 2.2 color contrast thresholds')}>
      <thead><tr><th scope="col">{t('检测项目', 'Check')}</th><th scope="col">AA</th><th scope="col">AAA</th></tr></thead>
      <tbody>
        {rows.map(({ name, aa, aaa }) => <tr key={name}>
          <th scope="row">{name}</th>
          <Threshold ratio={ratio} minimum={aa} locale={locale} />
          <Threshold ratio={ratio} minimum={aaa} locale={locale} />
        </tr>)}
      </tbody>
    </table>}
    <div className={s.correction}>
      <div className={s.correctionHeading}>
        <h3>{t('颜色修正', 'Color correction')}</h3>
        <label className={s.target}>
          {t('目标', 'Target')}
          <select value={target} onChange={event => {
            const next = contrastTargets.find(value => String(value) === event.currentTarget.value);
            if (next !== undefined) onTarget(next);
          }}>
            {contrastTargets.map(value => <option key={value} value={value}>{value}:1</option>)}
          </select>
        </label>
      </div>
      {ratio === undefined ? <p className={s.note}>{t('请输入两种有效颜色。', 'Enter two valid colors.')}</p>
        : needsFix ? suggestions.map(({ side, label, result }) => result ? (
          <div key={side} className={s.suggestion}>
            <span className={s.swatch} style={{ backgroundColor: result.hex }} aria-hidden />
            <div className={s.suggestionInfo}><code>{result.hex}</code><span>{label} · {result.ratio.toFixed(2)}:1</span></div>
            <Button variant="primary" size="sm" aria-label={side === 'foreground'
              ? t('应用前景色建议', 'Apply foreground suggestion') : t('应用背景色建议', 'Apply background suggestion')}
              onClick={() => onApply(side, result.hex)}>{t('应用', 'Apply')}</Button>
          </div>
        ) : <p className={s.note} key={side}>{label} · {t('单侧调整无法达到目标', 'Target is out of reach')}</p>)
          : <p className={s.note} data-pass="true">{t('当前配色已达到目标。', 'These colors meet the target.')}</p>}
    </div>
  </section>;
}
