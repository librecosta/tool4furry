import { Fragment, useEffect, useRef, useState } from 'react';
import { ArrowsLeftRightIcon, ArrowCounterClockwiseIcon, CheckCircleIcon } from '@phosphor-icons/react';
import { Button, IconButton } from '../../ui/Button';
import { useToast } from '../../ui/Toast';
import { Tooltip } from '../../ui/Tooltip';
import { Frame, tr } from '../general/ui';
import type { ToolProps } from '../types';
import { ColorEditor, readColor } from './ColorEditor';
import { ContrastResults } from './ContrastResults';
import { contrast, type ContrastTarget } from './core';
import notice from '../palette-extractor/react-colorful.NOTICE.txt?url';
import s from './color-contrast.module.scss';

const sides = ['foreground', 'background'] as const;
type Side = typeof sides[number];
const defaults = { foreground: '#F7CDAD', background: '#383131' };
const defaultTarget: ContrastTarget = 4.5;
type ScreenPicker = { open: (options: { signal: AbortSignal }) => Promise<{ sRGBHex: string }> };
const getScreenPicker = () => (window as Window & { EyeDropper?: new () => ScreenPicker }).EyeDropper;

export default function ColorContrast({ locale }: ToolProps) {
  const [values, setValues] = useState(defaults);
  const [target, setTarget] = useState<ContrastTarget>(defaultTarget);
  const [screenPickerAvailable, setScreenPickerAvailable] = useState(false);
  const [picking, setPicking] = useState<Side>();
  const pending = useRef<AbortController | null>(null);
  const { notify } = useToast();
  const t = (zh: string, en: string) => tr(locale, zh, en);
  const foreground = readColor(values.foreground, locale);
  const background = readColor(values.background, locale);
  const ratio = foreground.color && background.color ? contrast(foreground.color.channels, background.color.channels) : undefined;

  useEffect(() => {
    setScreenPickerAvailable(typeof getScreenPicker() === 'function');
    return () => {
      const controller = pending.current;
      pending.current = null;
      controller?.abort();
    };
  }, []);

  function cancelPick() {
    const controller = pending.current;
    pending.current = null;
    controller?.abort();
    setPicking(undefined);
  }

  function edit(side: Side, value: string) {
    cancelPick();
    setValues(previous => ({ ...previous, [side]: value }));
  }

  async function pick(side: Side) {
    const EyeDropper = getScreenPicker();
    if (!EyeDropper) return;
    cancelPick();
    const controller = new AbortController();
    pending.current = controller;
    setPicking(side);
    try {
      const result = await new EyeDropper().open({ signal: controller.signal });
      if (pending.current === controller && !controller.signal.aborted) {
        setValues(previous => ({ ...previous, [side]: result.sRGBHex.toUpperCase() }));
      }
    } catch (error) {
      if (!controller.signal.aborted && !(error instanceof DOMException && error.name === 'AbortError')) {
        notify({ title: t('无法完成屏幕取色', 'Could not pick a screen color'), type: 'error' });
      }
    } finally {
      if (pending.current === controller) {
        pending.current = null;
        setPicking(undefined);
      }
    }
  }

  return <Frame locale={locale}>
    <span hidden data-color-license={notice} />
    <div data-color-contrast-workspace className={s.workspace}>
      <div className={s.heading}>
        <h2>{t('颜色设置', 'Color settings')}</h2>
        <Button variant="ghost" size="sm" onClick={() => {
          cancelPick();
          setValues(defaults);
          setTarget(defaultTarget);
        }}>
          {t('重置', 'Reset')} <ArrowCounterClockwiseIcon size={16} aria-hidden />
        </Button>
      </div>
      <div className={s.editors}>
        {sides.map(side => <Fragment key={side}>
          <ColorEditor side={side} locale={locale} value={values[side]}
            parsed={side === 'foreground' ? foreground : background} onChange={value => edit(side, value)}
            onPick={screenPickerAvailable ? () => void pick(side) : undefined} picking={picking === side} />
          {side === 'foreground' && <Tooltip borderless content={t('交换前景色和背景色', 'Swap foreground and background')}>
            <IconButton className={s.swap} variant="ghost" label={t('交换颜色', 'Swap colors')} onClick={() => {
              cancelPick();
              setValues(({ foreground, background }) => ({ foreground: background, background: foreground }));
            }}>
              <ArrowsLeftRightIcon size={23} aria-hidden />
            </IconButton>
          </Tooltip>}
        </Fragment>)}
      </div>
      <div className={s.resultsGrid}>
        <section aria-label={t('实时预览', 'Live preview')} className={s.previewSection}>
          <h2>{t('实时预览', 'Live preview')}</h2>
          {foreground.color && background.color ? (
            <div lang="en" className={s.preview} style={{ color: foreground.color.hex, backgroundColor: background.color.hex }}>
              <p className={s.eyebrow}>DESIGN &amp; ACCESSIBILITY</p>
              <p className={s.headline}>Good design starts here.</p>
              <p className={s.sampleText}>The quick brown fox jumps over the lazy dog. Every detail matters.</p>
              <div className={s.sampleActions}>
                <span className={s.sampleButton} style={{ color: background.color.hex, backgroundColor: foreground.color.hex }}>Button preview</span>
                <CheckCircleIcon size={24} aria-hidden />
              </div>
            </div>
          ) : <p className={s.noPreview}>{t('两侧颜色有效时显示预览。', 'Enter two valid colors to see the preview.')}</p>}
        </section>
        <ContrastResults locale={locale} ratio={ratio} foreground={foreground.color?.channels} background={background.color?.channels}
          target={target} onTarget={setTarget} onApply={edit} />
      </div>
    </div>
  </Frame>;
}
