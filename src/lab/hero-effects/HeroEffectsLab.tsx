import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { Locale } from '../../i18n/locale';
import { messages } from '../../i18n/messages';
import { Button } from '../../ui/Button';
import FlowFieldWaves from './FlowFieldWaves';
import type { Quality } from './geometry';
import type { SceneStats, SceneStatus } from './useScene';
import { heroLabStyles as s } from './styles';

const copy = {
  zh: {
    description: 'DEV ONLY · Flow Field Waves。HSN-1 水平谱波曲面、低亮远景排线与稀疏横切线，按投影线距抑制密集细节。移动指针轻扰曲面；触屏保留页面滚动。',
    quality: '质量', low: '低', medium: '中', high: '高', overlay: '叠加首页文案', visual: '仅视觉', pause: '暂停', resume: '恢复', reset: '重置',
    status: '状态', size: 'CSS / 画布像素', density: '屏幕 / 渲染 DPR', count: '主线 / 远景 / 横切线 / 每线采样', fps: 'RAF 回调 / 实际重绘 FPS', limit: '重绘上限', mean: 'RAF 平均 / P95 间隔', draw: 'JS draw 平均 / P95', frames: 'RAF / 重绘累计', memory: '曲面数组 / 单像素缓冲估算',
    explanation: '最近最多 180 个样本，每秒更新。RAF 回调与实际重绘分开统计；低档最多 12 次重绘/秒，中/高档最多 24 次。JS draw 是同步 Canvas 调用耗时，不是 GPU 时间。像素估算按 RGBA 单缓冲计算，不代表浏览器总内存。暂停/后台/离屏停绘；Reduced Motion 默认静态，恢复按钮不会覆盖系统偏好。',
    fallback: 'Canvas 2D 暂不可用，当前为静态背景。可重置重试。',
    states: { running: '运行中', paused: '已暂停', reduced: '减少动态效果 · 静态', hidden: '后台暂停', offscreen: '离屏暂停', unavailable: '渲染不可用' } satisfies Record<SceneStatus, string>,
  },
  en: {
    description: 'DEV ONLY · Flow Field Waves. HSN-1 horizontal spectral surfaces, dim far hatching and sparse cross-lines; projected spacing suppresses crowded detail. Move the pointer for a gentle local response; touch keeps page scrolling.',
    quality: 'Quality', low: 'Low', medium: 'Medium', high: 'High', overlay: 'Overlay homepage copy', visual: 'Visual only', pause: 'Pause', resume: 'Resume', reset: 'Reset',
    status: 'Status', size: 'CSS / canvas pixels', density: 'Screen / rendering DPR', count: 'Main / far / cross-lines / samples per line', fps: 'RAF callbacks / actual redraw FPS', limit: 'Redraw limit', mean: 'RAF mean / P95 interval', draw: 'Mean / P95 JS draw', frames: 'Total RAF / redraws', memory: 'Surface array / single pixel buffer estimate',
    explanation: 'Up to 180 samples, updated once per second. RAF callbacks and actual redraws are measured separately; up to 12 redraws/s on Low, 24 on Medium/High. JS draw measures synchronous Canvas calls, not GPU time. The pixel estimate is one RGBA buffer, not total browser memory. Pause, hidden tabs and offscreen scenes stop drawing. Reduced Motion is static; Resume does not override the system preference.',
    fallback: 'Canvas 2D is unavailable. Showing a static background; Reset can retry.',
    states: { running: 'Running', paused: 'Paused', reduced: 'Reduced motion · static', hidden: 'Hidden · paused', offscreen: 'Offscreen · paused', unavailable: 'Renderer unavailable' } satisfies Record<SceneStatus, string>,
  },
};
const number = (n: number | null | undefined, digits = 1) => n == null ? '—' : n.toFixed(digits);

export default function HeroEffectsLab({ locale }: { locale: Locale }) {
  const c = copy[locale], t = messages[locale];
  const [quality, setQuality] = useState<Quality>('medium');
  const [overlay, setOverlay] = useState(false), [paused, setPaused] = useState(false), [reset, setReset] = useState(0);
  const [stats, setStats] = useState<SceneStats | null>(null);
  const rows = [
    [c.status, stats ? c.states[stats.status] : '—'],
    [c.size, stats ? `${Math.round(stats.width)}×${Math.round(stats.height)} / ${stats.pixelWidth}×${stats.pixelHeight}` : '—'],
    [c.density, `${number(stats?.screenDpr, 2)} / ${number(stats?.dpr, 2)}`],
    [c.count, stats ? `${stats.mainLines} / ${stats.farLines} / ${stats.crossLines} / ${stats.samples}` : '—'],
    [c.fps, `${number(stats?.fps)} / ${number(stats?.drawFps)}`],
    [c.limit, `${stats?.maxFps ?? '—'} / s`],
    [c.mean, `${number(stats?.mean)} / ${number(stats?.p95)} ms`],
    [c.draw, `${number(stats?.drawMean, 2)} / ${number(stats?.drawP95, 2)} ms`],
    [c.frames, `${stats?.frames ?? 0} / ${stats?.draws ?? 0}`],
    [c.memory, stats ? `${(stats.meshBytes / 1048576).toFixed(2)} / ${(stats.pixelWidth * stats.pixelHeight * 4 / 1048576).toFixed(2)} MiB` : '—'],
  ];
  return <div {...stylex.props(s.page)}>
    <div {...stylex.props(s.controls)}>
      <p {...stylex.props(s.note)}>{c.description}</p>
      <div {...stylex.props(s.row)}>
        <label {...stylex.props(s.label)}>{c.quality}<select aria-label={c.quality} value={quality} onChange={event => { setStats(null); setQuality(event.target.value as Quality); }} {...stylex.props(s.select)}>
          {(['low', 'medium', 'high'] as const).map(level => <option key={level} value={level}>{c[level]}</option>)}
        </select></label>
        <Button aria-pressed={overlay} onClick={() => { setStats(null); setOverlay(value => !value); }}>{overlay ? c.visual : c.overlay}</Button>
        <Button onClick={() => setPaused(value => !value)}>{paused ? c.resume : c.pause}</Button>
        <Button onClick={() => { setStats(null); setReset(value => value + 1); }}>{c.reset}</Button>
      </div>
    </div>
    <div data-hero-stage="waves" {...stylex.props(s.stage, overlay && s.tallStage)}>
      <FlowFieldWaves key={`${quality}-${overlay}-${reset}`} quality={quality} overlay={overlay} paused={paused} onStats={setStats} />
      {overlay && <div {...stylex.props(s.overlay)}>
        <h2 {...stylex.props(s.title)}>{t.heroLead}{locale === 'en' ? ' ' : ''}<span {...stylex.props(s.line)}>{t.heroAccent}</span></h2>
        <p {...stylex.props(s.intro)}>{t.intro}</p>
      </div>}
      {stats?.status === 'unavailable' && <p role="status" {...stylex.props(s.fallback)}>{c.fallback}</p>}
    </div>
    <dl data-hero-metrics data-status={stats?.status} data-frames={stats?.frames ?? 0} data-draws={stats?.draws ?? 0} data-fps={stats?.fps ?? ''} data-draw-fps={stats?.drawFps ?? ''} {...stylex.props(s.metrics)}>
      {rows.map(([label, value]) => <div key={label} {...stylex.props(s.metric)}><dt {...stylex.props(s.term)}>{label}</dt><dd {...stylex.props(s.value)}>{value}</dd></div>)}
    </dl>
    <div {...stylex.props(s.controls)}><p {...stylex.props(s.note)}>{c.explanation}</p></div>
  </div>;
}
