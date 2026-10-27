import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { Locale } from '../../i18n/locale';
import { messages } from '../../i18n/messages';
import { Button } from '../../ui/Button';
import ParticleOrb from './ParticleOrb';
import FlowFieldWaves from './FlowFieldWaves';
import { type Quality } from './geometry';
import { type SceneStats, type SceneStatus } from './useScene';
import { heroLabStyles as s } from './styles';

const copy = {
  zh: {
    title: 'Hero 视觉实验', description: 'DEV ONLY · 原创程序图形。粒子球参考 Motion 公开效果，未使用付费源码。拖动球体，或移动指针轻扰流线；触屏保留纵向滚动。',
    quality: '质量', low: '低', medium: '中', high: '高', overlay: '叠加首页文案', visual: '仅视觉', pause: '暂停', resume: '恢复', reset: '重置',
    status: '状态', size: 'CSS / 画布像素', count: '粒子 / 曲线', fps: 'RAF FPS', mean: '平均 / P95 帧间隔', draw: 'JS draw 平均', frames: 'RAF 帧 / 样本', memory: '顶点数据 / 像素缓冲估算',
    explanation: '最近最多 180 个连续 RAF 间隔，每秒更新。JS draw 是同步提交/绘制耗时，不是 GPU 时间；像素缓冲按 RGBA 单缓冲估算，不代表完整显存占用。暂停/后台/离屏停止帧循环，恢复后重新采样。Reduce Motion 默认静态，恢复按钮不会覆盖系统偏好。',
    fallback: 'WebGL 不可用，显示静态标识。可切换波浪或重置重试。', canvasFallback: 'Canvas 2D 不可用。可切换粒子球或重置重试。', lost: 'WebGL 上下文丢失，等待浏览器恢复；也可重置重试。',
    states: { running: '运行中', paused: '已暂停', reduced: '减少动态效果 · 静态', hidden: '后台暂停', offscreen: '离屏暂停', unavailable: '渲染不可用', 'context-lost': '上下文丢失' } satisfies Record<SceneStatus, string>,
  },
  en: {
    title: 'Hero effects lab', description: 'DEV ONLY · Original procedural graphics. The orb references Motion’s public visual, with no paid source used. Drag the orb or move over the waves; touch keeps vertical scrolling.',
    quality: 'Quality', low: 'Low', medium: 'Medium', high: 'High', overlay: 'Overlay homepage copy', visual: 'Visual only', pause: 'Pause', resume: 'Resume', reset: 'Reset',
    status: 'Status', size: 'CSS / canvas pixels', count: 'Particles / curves', fps: 'RAF FPS', mean: 'Mean / P95 interval', draw: 'Mean JS draw', frames: 'RAF frames / samples', memory: 'Vertex data / pixel buffer estimate',
    explanation: 'Up to 180 consecutive RAF intervals, updated once per second. JS draw measures synchronous submission/drawing, not GPU time. The pixel estimate is one RGBA buffer, not total VRAM. Pause, hidden tabs and offscreen scenes stop the loop; resuming starts a fresh sample window. Reduced Motion is static and Resume does not override the system preference.',
    fallback: 'WebGL is unavailable. Showing a static mark; try Waves or Reset.', canvasFallback: 'Canvas 2D is unavailable; try Particle Orb or Reset.', lost: 'WebGL context lost. Waiting for browser recovery; Reset can retry.',
    states: { running: 'Running', paused: 'Paused', reduced: 'Reduced motion · static', hidden: 'Hidden · paused', offscreen: 'Offscreen · paused', unavailable: 'Renderer unavailable', 'context-lost': 'Context lost' } satisfies Record<SceneStatus, string>,
  },
};
const number = (n: number | null | undefined) => n == null ? '—' : n.toFixed(1);

export default function HeroEffectsLab({ locale }: { locale: Locale }) {
  const c = copy[locale], t = messages[locale];
  const [effect, setEffect] = useState<'orb' | 'waves'>('orb');
  const [quality, setQuality] = useState<Quality>('medium');
  const [overlay, setOverlay] = useState(false), [paused, setPaused] = useState(false), [reset, setReset] = useState(0);
  const [stats, setStats] = useState<SceneStats | null>(null);
  const Scene = effect === 'orb' ? ParticleOrb : FlowFieldWaves;
  const fallback = stats?.status === 'unavailable' || stats?.status === 'context-lost';
  const changeEffect = (next: typeof effect) => { if (next !== effect) { setStats(null); setEffect(next); } };
  const rows = [
    [c.status, stats ? c.states[stats.status] : '—'],
    ['Renderer', stats?.backend ?? '—'],
    [c.size, stats ? `${Math.round(stats.width)}×${Math.round(stats.height)} / ${stats.pixelWidth}×${stats.pixelHeight} · DPR ${number(stats.dpr)}` : '—'],
    [c.count, stats?.count.toLocaleString() ?? '—'],
    [c.fps, number(stats?.fps)],
    [c.mean, `${number(stats?.mean)} / ${number(stats?.p95)} ms`],
    [c.draw, `${stats?.drawMean?.toFixed(2) ?? '—'} ms`],
    [c.frames, `${stats?.frames ?? 0} / ${stats?.samples ?? 0}`],
    [c.memory, stats ? `${(stats.vertexBytes / 1048576).toFixed(2)} / ${(stats.pixelWidth * stats.pixelHeight * 4 / 1048576).toFixed(2)} MiB` : '—'],
  ];
  return <div {...stylex.props(s.page)}>
    <div {...stylex.props(s.controls)}>
      <p {...stylex.props(s.note)}>{c.description}</p>
      <div {...stylex.props(s.row)}>
        <div role="group" aria-label={c.title} {...stylex.props(s.group)}>
          <Button aria-pressed={effect === 'orb'} onClick={() => changeEffect('orb')}>Particle Orb</Button>
          <Button aria-pressed={effect === 'waves'} onClick={() => changeEffect('waves')}>Flow Field Waves</Button>
        </div>
        <label {...stylex.props(s.label)}>{c.quality}<select aria-label={c.quality} value={quality} onChange={event => { setStats(null); setQuality(event.target.value as Quality); }} {...stylex.props(s.select)}>
          {(['low', 'medium', 'high'] as const).map(level => <option key={level} value={level}>{c[level]}</option>)}
        </select></label>
        <Button aria-pressed={overlay} onClick={() => { setStats(null); setOverlay(value => !value); }}>{overlay ? c.visual : c.overlay}</Button>
        <Button onClick={() => setPaused(value => !value)}>{paused ? c.resume : c.pause}</Button>
        <Button onClick={() => { setStats(null); setReset(value => value + 1); }}>{c.reset}</Button>
      </div>
    </div>
    <div data-hero-stage={effect} {...stylex.props(s.stage, overlay && s.tallStage)}>
      <Scene key={`${effect}-${quality}-${overlay}-${reset}`} quality={quality} overlay={overlay} paused={paused} onStats={setStats} />
      {overlay && <div {...stylex.props(s.overlay)}>
        <h2 {...stylex.props(s.title)}>{t.heroLead}{locale === 'en' ? ' ' : ''}<span {...stylex.props(s.line)}>{t.heroAccent}</span></h2>
        <p {...stylex.props(s.intro)}>{t.intro}</p>
      </div>}
      {fallback && <>
        {effect === 'orb' && <div aria-hidden="true" {...stylex.props(s.fallbackRing, overlay && s.symbolOverlay)} />}
        <p role="status" {...stylex.props(s.fallback)}>{stats?.status === 'context-lost' ? c.lost : effect === 'orb' ? c.fallback : c.canvasFallback}</p>
      </>}
    </div>
    <dl data-hero-metrics data-status={stats?.status} data-frames={stats?.frames ?? 0} data-fps={stats?.fps ?? ''} data-p95={stats?.p95 ?? ''} {...stylex.props(s.metrics)}>
      {rows.map(([label, value]) => <div key={label} {...stylex.props(s.metric)}><dt {...stylex.props(s.term)}>{label}</dt><dd {...stylex.props(s.value)}>{value}</dd></div>)}
    </dl>
    <div {...stylex.props(s.controls)}><p {...stylex.props(s.note)}>{c.explanation}</p></div>
  </div>;
}
