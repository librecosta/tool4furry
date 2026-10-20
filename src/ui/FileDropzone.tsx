import { useEffect, useId, useRef, useState, type DragEvent } from 'react';
import { FolderOpenIcon } from '@phosphor-icons/react';
import * as stylex from '@stylexjs/stylex';
import { controls } from '../styles/controls';
import { tokens } from '../styles/tokens.stylex';
import { fieldStyles } from './Field';
import {
  validateFiles,
  type FileConstraints,
  type FileIssue,
  type FileIssueReason,
  type FileSelection,
} from './file-constraints';

export interface FileDropzoneProps extends FileConstraints {
  id?: string;
  label: string;
  hint?: string;
  disabled?: boolean;
  appearance?: 'expanded' | 'compact';
  issueMessages: Record<FileIssueReason, string>;
  onFilesSelected: (files: File[]) => void;
  onRejected?: (issues: FileIssue[]) => void;
  onSelection?: (selection: FileSelection) => void;
}
const hasFiles = (event: DragEvent) =>
  Array.from(event.dataTransfer.types).includes('Files') ||
  event.dataTransfer.files.length > 0;

/** Owns only interaction feedback. File ownership and queues belong to the caller. */
export function FileDropzone({
  id,
  label,
  hint,
  disabled = false,
  appearance = 'expanded',
  accept,
  multiple = false,
  maxFiles,
  maxSizeBytes,
  issueMessages,
  onFilesSelected,
  onRejected,
  onSelection,
}: FileDropzoneProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const input = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [issues, setIssues] = useState<FileIssue[]>([]);
  const describedBy =
    [hint && `${inputId}-hint`, issues.length > 0 && `${inputId}-issues`]
      .filter(Boolean)
      .join(' ') || undefined;
  const resetDrag = () => {
    dragDepth.current = 0;
    setDragging(false);
  };
  useEffect(resetDrag, [disabled]);
  const receive = (files: File[]) => {
    if (disabled || files.length === 0) return;
    const result = validateFiles(files, {
      accept,
      multiple,
      maxFiles,
      maxSizeBytes,
    });
    setIssues(result.rejected);
    onSelection?.(result);
    if (result.accepted.length) onFilesSelected(result.accepted);
    if (result.rejected.length) onRejected?.(result.rejected);
  };
  return (
    <div {...stylex.props(controls.field)}>
      <input
        ref={input}
        id={inputId}
        type="file"
        hidden
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        aria-label={label}
        aria-describedby={describedBy}
        aria-invalid={issues.length > 0 || undefined}
        onChange={(event) => {
          const target = event.currentTarget;
          try {
            receive(Array.from(target.files ?? []));
          } finally {
            target.value = '';
          }
        }}
      />
      <button
        id={`${inputId}-button`}
        type="button"
        disabled={disabled}
        aria-label={label}
        aria-describedby={describedBy}
        aria-invalid={issues.length > 0 || undefined}
        data-dragging={dragging && !disabled ? '' : undefined}
        {...stylex.props(
          controls.button,
          styles.zone,
          appearance === 'compact' && styles.compact,
          dragging && !disabled && styles.dragging,
          issues.length > 0 && controls.invalid,
        )}
        onClick={() => input.current?.click()}
        onDragEnter={(event) => {
          if (!hasFiles(event)) return;
          event.preventDefault();
          event.stopPropagation();
          if (!disabled) {
            dragDepth.current += 1;
            setDragging(true);
          }
        }}
        onDragLeave={() => {
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (dragDepth.current === 0) setDragging(false);
        }}
        onDragOver={(event) => {
          if (!hasFiles(event)) return;
          event.preventDefault();
          event.stopPropagation();
          event.dataTransfer.dropEffect = disabled ? 'none' : 'copy';
        }}
        onDrop={(event) => {
          if (!hasFiles(event)) return;
          event.preventDefault();
          event.stopPropagation();
          resetDrag();
          receive(Array.from(event.dataTransfer.files));
        }}
      >
        <FolderOpenIcon size={28} aria-hidden="true" />
        <span {...stylex.props(styles.label)}>{label}</span>
        {hint && (
          <span id={`${inputId}-hint`} {...stylex.props(controls.muted)}>
            {hint}
          </span>
        )}
      </button>
      {issues.length > 0 && (
        <ul
          id={`${inputId}-issues`}
          role="alert"
          {...stylex.props(styles.issues, fieldStyles.error)}
        >
          {issues.map((issue, index) => (
            <li key={index}>
              {issue.name}: {issueMessages[issue.reason]}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
const styles = stylex.create({
  zone: {
    backgroundColor: {
      default: tokens.surface,
      ':hover': tokens.surfaceMuted,
      ':disabled': tokens.surface,
    },
    flexDirection: 'column',
    width: '100%',
    minHeight: 156,
    padding: tokens.space24,
    borderRadius: tokens.radiusLg,
    borderStyle: 'dashed',
    textAlign: 'center',
    overflowWrap: 'anywhere',
    opacity: { default: 1, ':disabled': 0.55 },
  },
  dragging: {
    backgroundColor: {
      default: tokens.actionTint,
      ':hover': tokens.actionTint,
    },
    borderColor: tokens.action,
    outlineStyle: 'solid',
    outlineWidth: 2,
    outlineColor: tokens.focus,
    outlineOffset: 2,
  },
  compact: {
    minHeight: 44,
    padding: tokens.space8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    textAlign: 'start',
  },
  label: { fontWeight: 600, maxWidth: '100%' },
  issues: { paddingInlineStart: 24 },
});
