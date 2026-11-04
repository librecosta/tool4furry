import fileTaskStyles from './FileTaskList.module.scss';
import { useId, type ReactNode } from 'react';
import {
  ArrowClockwiseIcon,
  DownloadSimpleIcon,
  EyeIcon,
  FileIcon,
  TrashIcon,
} from '@phosphor-icons/react';
import { IconButton } from './Button';
import { Tooltip } from './Tooltip';
import controls from './controls.module.scss';

export type FileTaskStatus =
  'validating' | 'queued' | 'processing' | 'ready' | 'stale' | 'error';
export interface FileTaskAction {
  kind: 'preview' | 'download' | 'remove' | 'retry';
  label: string;
  id?: string;
  disabled?: boolean;
  disabledReason?: string;
  onClick?: () => void;
  href?: string;
  download?: string;
}
export interface FileTaskItem {
  id: string;
  name: string;
  icon?: ReactNode;
  media?: ReactNode;
  metadata: ReactNode;
  output?: ReactNode;
  status: FileTaskStatus;
  statusLabel: string;
  /** Actual fractional progress (0–1), only when the tool can measure it. */
  progress?: number;
  error?: string;
  actions: readonly FileTaskAction[];
}

const icons = {
  preview: EyeIcon,
  download: DownloadSimpleIcon,
  remove: TrashIcon,
  retry: ArrowClockwiseIcon,
};

/** Presentation only: the caller owns files, results, URLs and task transitions. */
export function FileTaskList({
  label,
  items,
  children,
}: {
  label: string;
  items?: readonly FileTaskItem[];
  children?: ReactNode;
}) {
  return (
    <ul aria-label={label} className={fileTaskStyles.list}>
      {items
        ? items.map((item) => <FileTaskRow key={item.id} item={item} />)
        : children}
    </ul>
  );
}

/** A tool-owned row wrapper may manage resources while this component stays presentational. */
export function FileTaskRow({ item }: { item: FileTaskItem }) {
  const id = useId();
  const nameId = `${id}-name`,
    errorId = `${id}-error`;
  return (
    <li
      aria-labelledby={nameId}
      aria-describedby={item.error ? errorId : undefined}
      data-task-id={item.id}
      data-task-status={item.status}
      className={fileTaskStyles.item}
    >
      <div aria-hidden="true" className={fileTaskStyles.media}>
        {item.media ?? item.icon ?? <FileIcon size={22} />}
      </div>
      <div className={fileTaskStyles.heading}>
        <span id={nameId} title={item.name} className={fileTaskStyles.name}>
          {item.name}
        </span>
        <span
          role="status"
          className={[
            fileTaskStyles.status,
            item.status === 'ready' && fileTaskStyles.ready,
            item.status === 'error' && fileTaskStyles.error,
          ].filter(Boolean).join(' ')}
        >
          {item.statusLabel}
        </span>
      </div>
      <div className={fileTaskStyles.metadataRow}>
        <div className={fileTaskStyles.metadata}>
          {item.error ? (
            <span
              id={errorId}
              role="alert"
              title={item.error}
              className={fileTaskStyles.error}
            >
              {item.error}
            </span>
          ) : (
            <>
              <span>
                {['processing', 'queued'].includes(item.status)
                  ? item.statusLabel
                  : item.metadata}
              </span>
              {item.status === 'ready' && item.output && (
                <span className={fileTaskStyles.output}> → {item.output}</span>
              )}
            </>
          )}
        </div>
        {item.status === 'processing' && (
          <div
            role="progressbar"
            aria-label={`${item.name}: ${item.statusLabel}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={
              Number.isFinite(item.progress)
                ? Math.round(Math.max(0, Math.min(1, item.progress!)) * 100)
                : undefined
            }
            className={fileTaskStyles.progress}
          >
            <span
              className={[
                fileTaskStyles.bar,
                !Number.isFinite(item.progress) && fileTaskStyles.indeterminate,
              ].filter(Boolean).join(' ')}
              style={
                Number.isFinite(item.progress)
                  ? {
                      width: `${Math.max(0, Math.min(1, item.progress!)) * 100}%`,
                    }
                  : undefined
              }
            />
          </div>
        )}
      </div>
      <div className={fileTaskStyles.actions}>
        {item.actions.map((action) => {
          const Icon = icons[action.kind];
          const content = <Icon size={18} aria-hidden="true" />;
          return (
            <Tooltip
              key={action.kind}
              content={action.disabledReason ?? action.label}
            >
              {action.href && !action.disabled ? (
                <a
                  id={action.id}
                  href={action.href}
                  download={action.download}
                  aria-label={action.label}
                  onClick={action.onClick}
                  className={[
                    controls.button,
                    controls.ghost,
                    fileTaskStyles.action,
                    action.kind === 'download' && fileTaskStyles.ready,
                  ].filter(Boolean).join(' ')}
                >
                  {content}
                </a>
              ) : (
                <IconButton
                  id={action.id}
                  label={action.label}
                  variant="ghost"
                  size="sm"
                  disabled={action.disabled}
                  aria-description={action.disabledReason}
                  title={action.disabledReason}
                  onClick={action.onClick}
                  className={fileTaskStyles.action}
                >
                  {content}
                </IconButton>
              )}
            </Tooltip>
          );
        })}
      </div>
    </li>
  );
}
