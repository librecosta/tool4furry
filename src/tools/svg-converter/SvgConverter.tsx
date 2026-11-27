import { lazy, Suspense, useEffect, useState } from 'react';
import type { ToolProps } from '../types';
import { Frame, tr } from '../general/ui';
import { resolveImageLimits } from '../image/limits';
import { createSvgNamer } from './core';
import { Choice } from './Preview';
import { Rasterize } from './Rasterize';
import notice from './svg-converter.NOTICE.txt?url&no-inline';
import s from './studio.module.scss';

const BitmapStudio = lazy(() => import('./BitmapStudio'));
type Mode = 'rasterize' | 'vectorize' | 'embed';

export default function SvgConverter({ locale }: ToolProps) {
  const [mode, setMode] = useState<Mode>('rasterize');
  const [visited, setVisited] = useState<ReadonlySet<Mode>>(new Set(['rasterize']));
  const [nameOutput] = useState(createSvgNamer);
  const [limits, setLimits] = useState(resolveImageLimits);
  useEffect(() => {
    setLimits(resolveImageLimits({
      userAgent: navigator.userAgent,
      mobile: (navigator as Navigator & { userAgentData?: { mobile: boolean } }).userAgentData?.mobile,
      coarsePointer: window.matchMedia('(pointer: coarse)').matches,
    }));
  }, []);
  const t = (zh: string, en: string) => tr(locale, zh, en);
  const items: { value: Mode; label: string }[] = [
    { value: 'rasterize', label: t('SVG 栅格化', 'Rasterize') },
    { value: 'vectorize', label: t('位图矢量化', 'Vectorize') },
    { value: 'embed', label: t('图片封装', 'Embed') },
  ];
  return <Frame locale={locale}>
    <div className={s.stack} data-svg-converter-studio data-svg-license={notice}>
      <Choice className={s.modeNav} label={t('转换模式', 'Conversion mode')} value={mode} items={items}
        onChange={next => { setMode(next); setVisited(previous => previous.has(next) ? previous : new Set([...previous, next])); }}/>
      <div hidden={mode !== 'rasterize'}><Rasterize locale={locale} t={t} imageLimits={limits} nameOutput={nameOutput}/></div>
      {(['vectorize', 'embed'] as const).map(kind => visited.has(kind) &&
        <div key={kind} hidden={mode !== kind}>
          <Suspense fallback={<p role="status" className={s.status}>{t('加载工作区…', 'Loading workspace…')}</p>}>
            <BitmapStudio embed={kind === 'embed'} locale={locale} t={t} limits={limits} nameOutput={nameOutput}/>
          </Suspense>
        </div>)}
    </div>
  </Frame>;
}
