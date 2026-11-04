import styles from './FileDropzone.module.scss';
import fieldStyles from './Field.module.scss';
import { useEffect, useId, useRef, useState, type DragEvent } from 'react';
import { FolderOpenIcon } from '@phosphor-icons/react';
import controls from './controls.module.scss';
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
  /** Opt-in visual accent; file handling and default styling stay unchanged. */
  accent?: 'lavender';
  issueMessages: Record<FileIssueReason, string>;
  onFilesSelected?: (files: File[]) => void;
  /** Delegate validation and aggregated feedback to a bounded workspace intake. */
  onFilesReceived?: (files: File[]) => void;
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
  accent,
  accept,
  multiple = false,
  maxFiles,
  maxSizeBytes,
  issueMessages,
  onFilesSelected,
  onFilesReceived,
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
    if (onFilesReceived) {
      onFilesReceived(files);
      return;
    }
    const result = validateFiles(files, {
      accept,
      multiple,
      maxFiles,
      maxSizeBytes,
    });
    setIssues(result.rejected);
    onSelection?.(result);
    if (result.accepted.length) onFilesSelected?.(result.accepted);
    if (result.rejected.length) onRejected?.(result.rejected);
  };
  return (
    <div className={controls.field}>
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
        className={[
          controls.button,
          styles.zone,
          appearance === 'compact' && styles.compact,
          accent === 'lavender' && styles.accentTransition,
          dragging && !disabled && styles.dragging,
          dragging && !disabled && accent === 'lavender' && styles.lavenderDragging,
          issues.length > 0 && controls.invalid,
        ].filter(Boolean).join(' ')}
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
        <FolderOpenIcon
          size={28}
          aria-hidden="true"
          className={[accent === 'lavender' && !disabled && styles.lavenderIcon].filter(Boolean).join(' ')}
        />
        <span className={styles.label}>{label}</span>
        {hint && (
          <span id={`${inputId}-hint`} className={controls.muted}>
            {hint}
          </span>
        )}
      </button>
      {issues.length > 0 && (
        <ul
          id={`${inputId}-issues`}
          role="alert"
          className={[styles.issues, fieldStyles.error].filter(Boolean).join(' ')}
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
