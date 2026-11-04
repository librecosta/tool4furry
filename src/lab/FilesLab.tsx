import s from './FilesLab.module.scss';
import { useRef, useState, type ReactNode } from 'react';
import { TrashIcon } from '@phosphor-icons/react';
import WorkbenchShell from '../workbench/WorkbenchShell';
import { FileDropzone } from '../ui/FileDropzone';
import { ScrollDock } from '../ui/ScrollDock';
import { CheckboxField } from '../ui/CheckboxField';
import { Button, IconButton } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useToast } from '../ui/Toast';
import c from '../ui/controls.module.scss';
import type { LabMessages } from './messages';

export default function FilesLab({
  t,
  header,
}: {
  t: LabMessages;
  header: ReactNode;
}) {
  const [entries, setEntries] = useState<{ id: number; file: File }[]>([]);
  const [rounds, setRounds] = useState(0);
  const [disabled, setDisabled] = useState(false);
  const [multiple, setMultiple] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const nextId = useRef(1);
  const toast = useToast();
  const guides = [
    [t.fileGuideTitle, t.fileGuide],
    [t.fileCountGuideTitle, t.fileCountGuide],
    [t.fileScrollGuideTitle, t.fileScrollGuide],
    [t.filePrivacyGuideTitle, t.filePrivacyGuide],
  ];
  return (
    <WorkbenchShell mode="custom" labels={t} header={header}>
      <div data-files-lab className={[c.stack, s.page].filter(Boolean).join(' ')}>
        <p className={c.muted}>{t.filesIntro}</p>
        <section className={[c.card, c.stack].filter(Boolean).join(' ')} aria-label={t.files}>
          <div className={c.row}>
            <CheckboxField
              label={t.fileDisable}
              checked={disabled}
              onCheckedChange={setDisabled}
            />
            <CheckboxField
              label={t.fileMultiple}
              checked={multiple}
              onCheckedChange={setMultiple}
            />
          </div>
          <FileDropzone
            label={t.fileChoose}
            hint={t.fileHint}
            accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
            multiple={multiple}
            maxFiles={3}
            maxSizeBytes={2 * 1024 * 1024}
            disabled={disabled}
            issueMessages={{
              type: t.fileTypeIssue,
              size: t.fileSizeIssue,
              count: t.fileCountIssue,
            }}
            onFilesSelected={(files) => {
              const added = files.map((file) => ({
                id: nextId.current++,
                file,
              }));
              setEntries((current) => [...current, ...added]);
              setRounds((value) => value + 1);
              toast.notify({
                id: 'file-selection',
                type: 'success',
                title: t.fileSelected,
              });
            }}
            onRejected={() =>
              toast.notify({
                id: 'file-rejection',
                type: 'warning',
                title: t.fileRejected,
              })
            }
          />
        </section>
        <section className={[c.card, c.stack].filter(Boolean).join(' ')} aria-label={t.fileList}>
          <div className={c.row}>
            <h2 className={c.heading}>{t.fileList}</h2>
            <ConfirmDialog
              open={confirmOpen}
              onOpenChange={setConfirmOpen}
              title={t.fileClearTitle}
              description={t.fileClearDescription}
              cancelLabel={t.cancel}
              confirmLabel={t.fileClear}
              danger
              trigger={
                <Button disabled={entries.length === 0}>{t.fileClear}</Button>
              }
              onConfirm={() => setEntries([])}
            />
          </div>
          <p role="status" className={c.muted}>
            {t.fileCount}: {entries.length} · {t.fileRounds}: {rounds}
          </p>
          {entries.length === 0 ? (
            <p className={c.muted}>{t.fileEmpty}</p>
          ) : (
            <ul className={s.list}>
              {entries.map(({ id, file }) => (
                <li key={id} className={s.item}>
                  <dl className={s.metadata}>
                    <dt>{t.fileName}</dt>
                    <dd className={s.value}>{file.name}</dd>
                    <dt>{t.fileSize}</dt>
                    <dd className={s.value}>{file.size} B</dd>
                    <dt>{t.fileType}</dt>
                    <dd className={s.value}>
                      {file.type || t.fileUnknownType}
                    </dd>
                  </dl>
                  <IconButton
                    label={`${t.remove} ${file.name}`}
                    onClick={() =>
                      setEntries((current) =>
                        current.filter((entry) => entry.id !== id),
                      )
                    }
                  >
                    <TrashIcon size={18} aria-hidden="true" />
                  </IconButton>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className={c.stack} aria-label={t.scrollTitle}>
          <h2 className={c.heading}>{t.scrollTitle}</h2>
          <p className={c.muted}>{t.scrollIntro}</p>
          {guides.map(([title, body], index) => (
            <article key={title} className={[c.card, s.guide].filter(Boolean).join(' ')}>
              <span className={c.muted}>0{index + 1}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </section>
      </div>
      <ScrollDock
        getLabel={(progress) =>
          t.scrollStep.replace('{progress}', String(progress))
        }
      />
    </WorkbenchShell>
  );
}
