import { ArrowsOutCardinalIcon, ImageSquareIcon } from '@phosphor-icons/react';
import { Button } from '../../ui/Button';
import { NumberStepper } from '../../ui/NumberStepper';
import { SliderField } from '../../ui/SliderField';
import type { Translate } from './AppearancePanel';
import { maxPhotoZoom, type PhotoPlacement } from './settings';
import { StudioChoices } from './StudioChoices';
import type { PhotoInputState } from './use-local-photo';
import s from './studio.module.scss';

export type PhotoControlsProps = PhotoInputState & {
  choose: () => void;
  placement: PhotoPlacement;
  change: (patch: Partial<PhotoPlacement>) => void;
  reset: () => void;
  dragging: boolean;
  drag: () => void;
  panX: boolean;
  panY: boolean;
};

export function PhotoControls({ t, controls, outer = false }: { t: Translate; controls: PhotoControlsProps; outer?: boolean }) {
  const { photo, pending, error, choose, placement, change, reset, dragging, drag, panX, panY } = controls;
  const title = photo ? t('更换图片', 'Replace image') : t('导入图片', 'Import image');
  const label = outer ? t('画布背景图片', 'Canvas background image') : t('窗口背景图片', 'Window background image');
  const position = (axis: 'x' | 'y', label: string, available: boolean) =>
    <NumberStepper label={label} decreaseLabel={t('减小', 'Decrease ') + label} increaseLabel={t('增大', 'Increase ') + label}
      value={placement[axis]} min={-100} max={100} disabled={!available} locale={t('zh-CN', 'en')}
      onValueChange={value => change({ [axis]: value })} />;

  return <div className={s.photoControls} role="group" aria-label={label}>
    <Button size="sm" variant="ghost" className={s.fieldButton} onClick={choose} disabled={pending}>
      <ImageSquareIcon size={16} aria-hidden="true" /> {title}
    </Button>
    {pending && <span role="status" className={s.photoMeta}>{t('正在读取图片…', 'Reading image…')}</span>}
    {error && <span role="alert" className={s.photoError}>{error}</span>}
    {photo && <>
      <div className={s.photoInfo}>
        <span className={s.imageName} title={photo.name}>{photo.name}</span>
        <span>{photo.bitmap.width} × {photo.bitmap.height}</span>
      </div>
      <StudioChoices<PhotoPlacement['fit']> label={t('图片适应方式', 'Image fit')} value={placement.fit}
        options={[[ 'contain', t('完整显示', 'Contain')], ['cover', t('铺满裁切', 'Cover')]]} change={fit => change({ fit })} />
      <SliderField label={t('图片缩放', 'Image zoom')} value={placement.zoom} min={100} max={maxPhotoZoom} unit="%"
        onValueChange={zoom => change({ zoom })} />
      <div className={s.pair}>
        {position('x', t('横向位置（%）', 'Horizontal position (%)'), panX)}
        {position('y', t('纵向位置（%）', 'Vertical position (%)'), panY)}
      </div>
      <div className={s.photoActions}>
        <Button size="sm" variant="ghost" className={s.fieldButton} aria-pressed={dragging} onClick={drag} disabled={!dragging && !panX && !panY}>
          <ArrowsOutCardinalIcon size={15} aria-hidden="true" /> {t('在画布拖动', 'Drag on canvas')}
        </Button>
        <Button size="sm" variant="ghost" onClick={reset}>{t('重置构图', 'Reset framing')}</Button>
      </div>
    </>}
  </div>;
}
