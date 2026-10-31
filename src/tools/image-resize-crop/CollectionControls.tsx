import { useRef, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { ArrowsClockwiseIcon, TrashIcon } from '@phosphor-icons/react';
import { Button, IconButton } from '../../ui/Button';
import { SelectField } from '../../ui/SelectField';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { Tooltip } from '../../ui/Tooltip';
import { imageAccept } from '../image-converter/intake';
import type { ResizeCollection, CollectionView } from './collection';
import type { ResizeMessages } from './ParameterControls';
import { resizeStyles as s } from './resize.styles';

/** The only current-file selector and replace/remove controls in single mode. */
export function CollectionControls({
  manager,
  view,
  t,
}: {
  manager: ResizeCollection;
  view: CollectionView;
  t: ResizeMessages;
}) {
  const [confirm, setConfirm] = useState<'replace' | 'remove'>();
  const replacement = useRef<HTMLInputElement>(null);
  const selected = view.files.find((item) => item.id === view.selectedId);
  if (!selected) return null;
  return (
    <div {...stylex.props(s.fileManager)}>
      <SelectField
        label={t.currentFile}
        value={selected.id}
        options={view.files.map((item) => ({
          value: item.id,
          label: `${item.file.name}${item.intake === 'failed' ? ` · ${t.intakeStates.failed}` : ''}`,
        }))}
        onValueChange={(id) => manager.select(id)}
      />
      <div {...stylex.props(s.actions)}>
        {selected.source && (
          <ConfirmDialog
            open={confirm === 'replace'}
            onOpenChange={(open) => setConfirm(open ? 'replace' : undefined)}
            title={t.replace}
            description={t.confirmText}
            confirmLabel={t.replace}
            cancelLabel={t.cancel}
            onConfirm={() => replacement.current?.click()}
            trigger={
              <IconButton
                variant="ghost"
                label={t.replace}
                title={t.replace}
                disabled={view.editor.status === 'loading'}
              >
                <ArrowsClockwiseIcon size={20} />
              </IconButton>
            }
          />
        )}
        <ConfirmDialog
          open={confirm === 'remove'}
          onOpenChange={(open) => setConfirm(open ? 'remove' : undefined)}
          title={t.remove}
          description={t.confirmText}
          confirmLabel={t.remove}
          cancelLabel={t.cancel}
          danger
          onConfirm={() => manager.remove(selected.id)}
          trigger={
            <IconButton variant="ghost" label={t.remove} title={t.remove}>
              <TrashIcon size={20} />
            </IconButton>
          }
        />
      </div>
      <input
        type="file"
        ref={replacement}
        accept={imageAccept}
        hidden
        aria-label={t.replace}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) manager.replace(file);
        }}
      />
      {selected.intake === 'failed' && (
        <Tooltip content={t.retryFile}>
          <Button variant="ghost" onClick={() => manager.retry(selected.id)}>
            {t.retryFile}
          </Button>
        </Tooltip>
      )}
    </div>
  );
}
