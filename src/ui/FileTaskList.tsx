import { useId, type ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import {
  ArrowClockwiseIcon,
  DownloadSimpleIcon,
  EyeIcon,
  FileIcon,
  TrashIcon,
} from '@phosphor-icons/react';
import { IconButton } from './Button';
import { Tooltip } from './Tooltip';
import { controls } from '../styles/controls';
import { tokens as t } from '../styles/tokens.stylex';

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
    <ul aria-label={label} {...stylex.props(fileTaskStyles.list)}>
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
      {...stylex.props(fileTaskStyles.item)}
    >
      <div aria-hidden="true" {...stylex.props(fileTaskStyles.media)}>
        {item.media ?? item.icon ?? <FileIcon size={22} />}
      </div>
      <div {...stylex.props(fileTaskStyles.heading)}>
        <span id={nameId} title={item.name} {...stylex.props(fileTaskStyles.name)}>
          {item.name}
        </span>
        <span
          role="status"
          {...stylex.props(
            fileTaskStyles.status,
            item.status === 'ready' && fileTaskStyles.ready,
            item.status === 'error' && fileTaskStyles.error,
          )}
        >
          {item.statusLabel}
        </span>
      </div>
      <div {...stylex.props(fileTaskStyles.metadataRow)}>
        <div {...stylex.props(fileTaskStyles.metadata)}>
          {item.error ? (
            <span
              id={errorId}
              role="alert"
              title={item.error}
              {...stylex.props(fileTaskStyles.error)}
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
                <span {...stylex.props(fileTaskStyles.output)}> → {item.output}</span>
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
            {...stylex.props(fileTaskStyles.progress)}
          >
            <span
              {...stylex.props(
                fileTaskStyles.bar,
                !Number.isFinite(item.progress) && fileTaskStyles.indeterminate,
              )}
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
      <div {...stylex.props(fileTaskStyles.actions)}>
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
                  {...stylex.props(
                    controls.button,
                    controls.ghost,
                    fileTaskStyles.action,
                    action.kind === 'download' && fileTaskStyles.ready,
                  )}
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
                  {...stylex.props(fileTaskStyles.action)}
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

const glide = stylex.keyframes({
  from: { transform: 'translateX(-100%)' },
  to: { transform: 'translateX(280%)' },
});
export const fileTaskStyles = stylex.create({
  list: { listStyle: 'none', padding: 0, margin: 0, minWidth: 0 },
  item: {
    display: 'grid',
    gridTemplateColumns: { default: 'auto minmax(0, 1fr) auto', '@media (max-width: 600px)': 'auto minmax(0, 1fr)' },
    alignItems: 'center',
    columnGap: t.space8,
    rowGap: 2,
    minHeight: 64,
    paddingBlock: { default: t.space8, '@media (max-width: 600px)': t.space4 },
    paddingInline: t.space8,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: t.border,
    backgroundColor: { default: 'transparent', ':hover': t.surfacePanel },
  },
  heading: {
    gridColumn: 2,
    gridRow: 1,
    display: 'flex',
    alignItems: 'center',
    gap: t.space8,
    minWidth: 0,
  },
  media: {
    gridColumn: 1,
    gridRow: '1 / 3',
    minWidth: 44,
    minHeight: 44,
    display: 'grid',
    placeItems: 'center',
    overflow: 'hidden',
    borderRadius: t.radiusSm,
    backgroundColor: 'transparent',
    color: t.textSecondary,
  },
  name: {
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: 14,
    fontWeight: 500,
  },
  status: {
    flexShrink: 0,
    whiteSpace: 'nowrap',
    fontSize: 12,
    color: t.textSecondary,
  },
  ready: { color: t.accent },
  metadataRow: {
    gridColumn: 2,
    gridRow: 2,
    display: 'flex',
    alignItems: 'center',
    gap: t.space8,
    minWidth: 0,
  },
  metadata: {
    minWidth: 0,
    flexGrow: 1,
    fontSize: 12,
    lineHeight: 1.6,
    color: t.textSecondary,
    fontVariantNumeric: 'tabular-nums',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: { default: 'nowrap', '@media (max-width: 600px)': 'normal' },
  },
  progress: {
    width: 80,
    height: 3,
    flexShrink: 0,
    overflow: 'hidden',
    backgroundColor: t.border,
    borderRadius: 2,
  },
  bar: { display: 'block', height: '100%', backgroundColor: t.accent },
  indeterminate: {
    width: '35%',
    animationName: {
      default: glide,
      '@media (prefers-reduced-motion: reduce)': 'none',
    },
    animationDuration: '1.5s',
    animationTimingFunction: 'ease-in-out',
    animationIterationCount: 'infinite',
    transform: 'translateX(90%)',
  },
  output: { color: t.textPrimary },
  actions: {
    gridColumn: { default: '3', '@media (max-width: 600px)': '1 / -1' },
    gridRow: { default: '1 / 3', '@media (max-width: 600px)': '3' },
    display: 'flex',
    alignItems: 'center',
    justifySelf: 'end',
  },
  action: { width: 44, height: 44, paddingInline: 0, flexShrink: 0 },
  error: { color: t.danger },
});
