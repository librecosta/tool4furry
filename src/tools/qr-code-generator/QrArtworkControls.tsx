import { motion, useReducedMotion } from 'motion/react';
import { MinusIcon, PlusIcon } from '@phosphor-icons/react';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { Locale } from '../../i18n/locale';
import { IconButton } from '../../ui/Button';
import { tr } from '../general/ui';
import { artStyleIds, type ArtStyleId } from './recipe/types';
import s from './qr-workspace.module.scss';

const presets = ['128', '256', '512', '1024', '2048'];
const artLabels = {
  aeolian: ['风蚀沙丘', 'Aeolian'],
  contour: ['地形等高线', 'Contour'],
  strata: ['峡谷岩层', 'Strata'],
} as const;
const wrap = (index: number) => (index + artStyleIds.length) % artStyleIds.length;
const sideOf = (index: number, center: number) => wrap(index - center + 1) - 1;

export function OutputSize({ locale, value, onChange }: { locale: Locale; value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const presetsId = useId();
  const sizeLabel = tr(locale, '输出尺寸（像素）', 'Output size (pixels)');
  const toggleLabel = open ? tr(locale, '收起尺寸预设', 'Hide size presets') : tr(locale, '展开尺寸预设', 'Show size presets');

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);

  return <div className={s.sizeControl} ref={root}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}
    onKeyDown={event => {
      if (event.key !== 'Escape' || !open) return;
      event.stopPropagation();
      setOpen(false);
      trigger.current?.focus();
    }}>
    <IconButton ref={trigger} label={toggleLabel} title={toggleLabel} variant="ghost" aria-expanded={open}
      aria-controls={presetsId} onClick={() => setOpen(current => !current)}>
      {open ? <MinusIcon size={15} aria-hidden /> : <PlusIcon size={15} aria-hidden />}
    </IconButton>
    <input aria-label={sizeLabel} inputMode="numeric" value={value} onChange={event => onChange(event.target.value)} />
    <span aria-hidden="true">px</span>
    <div id={presetsId} className={s.sizePresets} data-open={open || undefined} inert={!open} role="group" aria-label={sizeLabel}>
      <div className={s.presetClip}>
        <div className={s.presetList}>
          {presets.map(preset => <button key={preset} type="button" aria-pressed={value === preset}
            onClick={() => {
              onChange(preset);
              setOpen(false);
              trigger.current?.focus();
            }}>{preset}</button>)}
        </div>
      </div>
    </div>
  </div>;
}

export function ArtworkCarousel({ locale, selected, images, onSelect }: {
  locale: Locale;
  selected: ArtStyleId;
  images: string[];
  onSelect: (id: ArtStyleId) => void;
}) {
  const center = artStyleIds.indexOf(selected);
  const [previous, setPrevious] = useState(center);
  const dragged = useRef(false);
  const reducedMotion = useReducedMotion();
  useLayoutEffect(() => { setPrevious(center); }, [center]);

  const selectNext = (direction: number) => onSelect(artStyleIds[wrap(center + direction)]);

  return <div className={s.artCarousel} role="group" aria-label={tr(locale, '艺术风格', 'Art style')}
    onPointerDownCapture={() => { dragged.current = false; }}
    onKeyDown={event => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      selectNext(event.key === 'ArrowLeft' ? -1 : 1);
    }}>
    <motion.div className={s.carouselTrack} drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.22}
      dragSnapToOrigin dragMomentum={false} onDragStart={() => { dragged.current = true; }}
      onDragEnd={(_, { offset, velocity }) => {
        if (Math.abs(offset.x) >= 30 || (Math.abs(offset.x) > 10 && Math.abs(velocity.x) > 260))
          selectNext(offset.x < 0 ? 1 : -1);
      }}>
      {artStyleIds.map((id, index) => {
        const side = sideOf(index, center);
        const label = tr(locale, artLabels[id][0], artLabels[id][1]);
        return <motion.button key={id} type="button" className={s.artThumb} data-side={side}
          aria-label={label} title={label} aria-pressed={side === 0} initial={false}
          animate={{ x: `${side * 110}%`, scale: side === 0 ? 1 : 0.84, opacity: side === 0 ? 1 : 0.55 }}
          transition={{ duration: reducedMotion ? 0 : 0.32, ease: [0.22, 1, 0.36, 1],
            x: { duration: reducedMotion || Math.abs(side - sideOf(index, previous)) === 2 ? 0 : 0.32 } }}
          onClick={event => { if (!dragged.current || event.detail === 0) onSelect(id); }}>
          <img src={images[index]} alt="" draggable={false} width={288} height={288} />
        </motion.button>;
      })}
    </motion.div>
  </div>;
}
