import { useId, useRef, useState } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import * as stylex from '@stylexjs/stylex';
import { CheckIcon } from '@phosphor-icons/react';
import { Button } from '../../ui/Button';
import type { ResizeView } from './session';
import type { ResizeMessages } from './ParameterControls';
import { CropWorkspace, type CropDisplay } from './CropWorkspace';
import { cropWorkspaceStyles as s } from './crop-workspace.styles';

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
      {focused ? <div aria-hidden="true" {...stylex.props(s.placeholder)}/> : workspace(false)}
      <Dialog.Portal>
        <Dialog.Backdrop {...stylex.props(s.backdrop)}/>
        <Dialog.Popup
          data-image-resize-crop
          initialFocus={done}
          finalFocus={() => document.getElementById(focusButtonId)}
          {...stylex.props(s.dialog)}
        >
          <header {...stylex.props(s.dialogHeader)}>
            <div {...stylex.props(s.identity)}>
              <Dialog.Title {...stylex.props(s.title)}>{t.focusEdit}</Dialog.Title>
              <Dialog.Description {...stylex.props(s.filename)}>{view.source.file.name}</Dialog.Description>
            </div>
            <Dialog.Close render={<Button ref={done} size="sm" variant="ghost"><CheckIcon size={18}/>{t.doneEditing}</Button>}/>
          </header>
          {focused && workspace(true)}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
