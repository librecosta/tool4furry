import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Button } from '../../ui/Button';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import type { ResizeCollection, CollectionView } from './collection';
import type { resizeMessages } from './messages';
import { resizeStyles as s } from './resize.styles';

export function CollectionControls({
  manager,
  view,
  t,
}: {
  manager: ResizeCollection;
  view: CollectionView;
  t: (typeof resizeMessages)['zh'];
}) {
  const [confirm, setConfirm] = useState<string>();
  const rejected = view.intakeSummary?.rejected;
  return (
    <div {...stylex.props(s.stack)}>
      {rejected && Object.values(rejected).some(Boolean) && (
        <p role="alert" {...stylex.props(s.note, s.error)}>
          {t.intakeRejected} {t.intake.type}: {rejected.type} · {t.intake.size}:{' '}
          {rejected.size} · {t.intake.count}: {rejected.count} ·{' '}
          {t.intake.total}: {rejected.total}
        </p>
      )}
      {!!view.files.length && (
        <div {...stylex.props(s.actions)}>
          <Button
            aria-pressed={view.mode === 'single'}
            onClick={() => manager.setMode('single')}
          >
            {t.single}
          </Button>
          <Button
            aria-pressed={view.mode === 'batch'}
            onClick={() => manager.setMode('batch')}
          >
            {t.batch}
          </Button>
          <ConfirmDialog
            open={confirm === 'all'}
            onOpenChange={(open) => setConfirm(open ? 'all' : undefined)}
            title={t.clearAll}
            description={t.clearAllText}
            confirmLabel={t.clearAll}
            cancelLabel={t.cancel}
            danger
            onConfirm={() => manager.clear()}
            trigger={<Button>{t.clearAll}</Button>}
          />
        </div>
      )}
      {view.mode === 'single' && !!view.files.length && (
        <ul aria-label={t.files} {...stylex.props(s.list)}>
          {view.files.map((item) => (
            <li key={item.id} {...stylex.props(s.row)}>
              <Button
                aria-pressed={item.id === view.selectedId}
                onClick={() => manager.select(item.id)}
              >
                <span {...stylex.props(s.filename)}>{item.file.name}</span>
              </Button>
              <span {...stylex.props(s.note)}>
                {item.source
                  ? `${item.source.width} × ${item.source.height}`
                  : t.intakeStates[item.intake]}
              </span>
              {item.error && (
                <span role="alert" {...stylex.props(s.note, s.error)}>
                  {t.errors[item.error as keyof typeof t.errors] ??
                    t.errors.fallback}
                </span>
              )}
              <ConfirmDialog
                open={confirm === item.id}
                onOpenChange={(open) => setConfirm(open ? item.id : undefined)}
                title={t.remove}
                description={t.confirmText}
                confirmLabel={t.remove}
                cancelLabel={t.cancel}
                danger
                onConfirm={() => manager.remove(item.id)}
                trigger={
                  <Button aria-label={`${t.remove}: ${item.file.name}`}>
                    {t.remove}
                  </Button>
                }
              />
              {item.intake === 'failed' && (
                <Button onClick={() => manager.retry(item.id)}>
                  {t.retryFile}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
