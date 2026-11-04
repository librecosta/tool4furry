import { useId, useRef, useState } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import motion from '../../styles/motion.module.scss';
import { XIcon } from '@phosphor-icons/react';
import { IconButton } from '../../ui/Button';
import controls from '../../ui/controls.module.scss';
import type { ResizeView } from './session';
import type { ResizeMessages } from './ParameterControls';
import { CropWorkspace, type CropDisplay } from './CropWorkspace';
import s from './crop-workspace.styles.module.scss';

export function CropEditor({ view, url, t, onCrop, onReset }: {
  view: ResizeView;
  url: string;
  t: ResizeMessages;
  onCrop: (crop: NonNullable<ResizeView['crop']>) => void;
  onReset: () => void;
}) {
  const [display, setDisplay] = useState<CropDisplay>('crop');
  const [hand, setHand] = useState(false);
  const [focused, setFocused] = useState(false);
  const focusButtonId = useId();
  const done = useRef<HTMLButtonElement>(null);
  if (!view.source || !view.crop) return null;
  const workspace = (inDialog: boolean) => (
    <CropWorkspace
      key={url} view={view} url={url} t={t} display={display} onDisplay={setDisplay}
      hand={hand} onHand={setHand} focused={inDialog}
      focusButtonId={focusButtonId} onFocus={() => setFocused(true)}
      onCrop={onCrop} onReset={onReset}
    />
  );
  return (
    <Dialog.Root open={focused} onOpenChange={setFocused}>
      {/* A single interactive crop instance: remounting only changes the viewport. */}
      {focused ? <div aria-hidden="true" className={s.placeholder}/> : workspace(false)}
      <Dialog.Portal>
        <Dialog.Backdrop className={[s.backdrop, motion.backdrop].filter(Boolean).join(' ')}/>
        <Dialog.Popup
          data-image-resize-crop
          initialFocus={done}
          finalFocus={() => document.getElementById(focusButtonId)}
          className={[s.dialog, motion.dialog].filter(Boolean).join(' ')}
        >
          <header className={s.dialogHeader}>
            <div className={s.identity}>
              <Dialog.Title className={s.title}>{t.focusEdit}</Dialog.Title>
              <Dialog.Description className={s.filename}>{view.source.file.name}</Dialog.Description>
            </div>
            <Dialog.Close render={<IconButton ref={done} label={t.close} variant="ghost" className={controls.dialogClose}><XIcon size={20} aria-hidden/></IconButton>}/>
          </header>
          {focused && workspace(true)}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
