import { useRef, useState } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { Radio } from '@base-ui/react/radio';
import { RadioGroup } from '@base-ui/react/radio-group';
import { CheckIcon, FolderOpenIcon, ImagesIcon, XIcon } from '@phosphor-icons/react';
import { creativeCategories, creativeThumbnailUrl, getCreativeAsset, listCreativeAssets,
  type CreativeAsset, type CreativeCategory } from '../../assets/creative';
import type { Locale } from '../../i18n/locale';
import motion from '../../styles/motion.module.scss';
import { Button, IconButton } from '../Button';
import { Tooltip } from '../Tooltip';
import s from './CreativeAssetPicker.module.scss';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: Locale;
  target: 'canvas' | 'window';
  currentId?: string;
  onSelect: (asset: CreativeAsset) => void;
  onImport: (file: File) => void;
  accept?: string;
  container?: HTMLElement | null;
  finalFocus?: () => HTMLElement | null;
};

const categories = Object.keys(creativeCategories) as CreativeCategory[];

export default function CreativeAssetPicker({ open, onOpenChange, container, finalFocus, ...gallery }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={next => onOpenChange(next)}>
      <Dialog.Portal container={container}>
        <Dialog.Backdrop className={`${s.backdrop} ${motion.backdrop}`} />
        <Dialog.Popup className={`${s.popup} ${motion.dialog}`} finalFocus={finalFocus} data-creative-asset-picker>
          <Gallery key={gallery.target} {...gallery} close={() => onOpenChange(false)} />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Gallery({ locale, target, currentId, onSelect, onImport, accept, close }: Omit<Props, 'open' | 'onOpenChange' | 'container' | 'finalFocus'> & {
  close: () => void;
}) {
  const t = (zh: string, en: string) => locale === 'zh' ? zh : en;
  const [category, setCategory] = useState<CreativeCategory | 'all'>('all');
  const [selection, setSelection] = useState(currentId ?? '');
  const asset = getCreativeAsset(selection);
  const matches = listCreativeAssets(category === 'all' ? undefined : category, target);
  const input = useRef<HTMLInputElement>(null);
  const filters = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const closeLabel = t('关闭素材选择器', 'Close asset picker');

  return <>
    <header className={s.header}>
      <div className={s.heading}>
        <Dialog.Title className={s.title}>{t('选择背景图片', 'Choose background image')}</Dialog.Title>
        <Dialog.Description className={s.subtitle}>Creative Collection · Vol. 01</Dialog.Description>
      </div>
      <Tooltip borderless content={closeLabel}>
        <Dialog.Close render={<IconButton variant="ghost" size="sm" label={closeLabel} className={s.close}><XIcon size={20} /></IconButton>} />
      </Tooltip>
    </header>
    <div className={s.browse}>
      <div className={s.sources} aria-label={t('图片来源', 'Image source')} role="group">
        <Button variant="ghost" size="sm" className={s.library} onClick={() => {
          filters.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus();
          if (viewport.current) viewport.current.scrollTop = 0;
        }}><ImagesIcon size={17} aria-hidden /> {t('内置素材', 'Built-in assets')}</Button>
        <Button variant="ghost" size="sm" className={s.action} onClick={() => input.current?.click()}>
          <FolderOpenIcon size={17} aria-hidden /> {t('导入本地图片', 'Import local image')}
        </Button>
        <input ref={input} type="file" hidden accept={accept} aria-label={t('本地图片文件', 'Local image file')} onChange={event => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = '';
          if (!file) return;
          onImport(file);
          close();
        }} />
      </div>
      <RadioGroup ref={filters} className={s.filters} aria-label={t('素材分类', 'Asset category')} value={category}
        onValueChange={(value: CreativeCategory | 'all') => {
          setCategory(value);
          if (viewport.current) viewport.current.scrollTop = 0;
        }}>
        <Radio.Root className={s.filter} value="all">{t('全部', 'All')}</Radio.Root>
        {categories.map(id => <Radio.Root key={id} className={s.filter} value={id}>{creativeCategories[id][locale]}</Radio.Root>)}
      </RadioGroup>
    </div>
    <div ref={viewport} className={s.viewport}>
      <RadioGroup className={s.grid} aria-label={t('背景素材', 'Background assets')} value={selection} onValueChange={setSelection}>
        {matches.map(item => <Radio.Root key={item.id} value={item.id} className={s.item}>
          <span className={s.art}>
            <img src={creativeThumbnailUrl(item)} alt="" width={item.thumbnailWidth} height={item.thumbnailHeight} loading="lazy" decoding="async" />
            <span className={s.check} aria-hidden><CheckIcon size={15} weight="bold" /></span>
          </span>
          <span className={s.name}>{item.title[locale]}</span>
        </Radio.Root>)}
      </RadioGroup>
    </div>
    <footer className={s.footer}>
      <div className={s.selection} aria-live="polite">
        <strong>{asset ? asset.title[locale] : t('请选择一张图片', 'Select an image')}</strong>
        {asset && <span>{asset.width} × {asset.height} px</span>}
      </div>
      <div className={s.actions}>
        <Dialog.Close render={<Button variant="ghost" className={s.action} />}>{t('取消', 'Cancel')}</Dialog.Close>
        <Button variant="primary" className={s.action} disabled={!asset} onClick={() => {
          if (!asset) return;
          onSelect(asset);
          close();
        }}>{t('使用图片', 'Use image')}</Button>
      </div>
    </footer>
  </>;
}
