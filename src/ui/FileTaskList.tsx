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
    <ul aria-label={label} {...stylex.props(s.list)}>
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
      {...stylex.props(s.item)}
    >
      <div aria-hidden="true" {...stylex.props(s.media)}>
        {item.media ?? item.icon ?? <FileIcon size={22} />}
      </div>
      <div {...stylex.props(s.heading)}>
        <span id={nameId} title={item.name} {...stylex.props(s.name)}>
          {item.name}
        </span>
        <span
          role="status"
          {...stylex.props(
            s.status,
            item.status === 'ready' && s.ready,
            item.status === 'error' && s.error,
          )}
        >
          {item.statusLabel}
        </span>
      </div>
      <div {...stylex.props(s.metadataRow)}>
        <div {...stylex.props(s.metadata)}>
          {item.error ? (
            <span
              id={errorId}
              role="alert"
              title={item.error}
              {...stylex.props(s.error)}
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
                <span {...stylex.props(s.output)}> → {item.output}</span>
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
            {...stylex.props(s.progress)}
          >
            <span
              {...stylex.props(
                s.bar,
                !Number.isFinite(item.progress) && s.indeterminate,
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
      <div {...stylex.props(s.actions)}>
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
                    s.action,
                    action.kind === 'download' && s.ready,
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
                  {...stylex.props(s.action)}
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
const s = stylex.create({
  list: { listStyle: 'none', padding: 0, margin: 0, minWidth: 0 },
  item: {
    display: 'grid',
    gridTemplateColumns: '44px minmax(0, 1fr) auto',
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
    display: 'flex',
    alignItems: 'center',
    gap: t.space8,
    minWidth: 0,
  },
  media: {
    gridColumn: 1,
    gridRow: { default: '1 / 3', '@media (max-width: 600px)': '1' },
    width: 44,
    height: 44,
    display: 'grid',
    placeItems: 'center',
    overflow: 'hidden',
    borderRadius: t.radiusSm,
    backgroundColor: t.workspace,
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
    gridColumn: { default: '2', '@media (max-width: 600px)': '1 / -1' },
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
    whiteSpace: 'nowrap',
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
    gridColumn: 3,
    gridRow: { default: '1 / 3', '@media (max-width: 600px)': '1' },
    display: 'flex',
    alignItems: 'center',
  },
  action: { width: 44, height: 44, paddingInline: 0, flexShrink: 0 },
  error: { color: t.danger },
});
