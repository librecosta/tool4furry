import { validateFiles } from '../../ui/file-constraints';
import { mobileImageLimits, type ImageLimits } from '../image/limits';

export const imageAccept =
  '.png,.jpg,.jpeg,.webp,.avif,image/png,image/jpeg,image/webp,image/avif';
export type IntakeReason = 'type' | 'size' | 'count' | 'total';
export type IntakeSummary = Readonly<{
  accepted: number;
  rejected: Readonly<Record<IntakeReason, number>>;
}>;

/** Metadata only; real format and dimensions are still checked serially by Image Core. */
export function planIntake(
  files: readonly File[],
  existing: readonly { file: Pick<File, 'size'> }[],
  limits: ImageLimits = mobileImageLimits,
) {
  const checked = validateFiles(files, {
    accept: imageAccept,
    multiple: true,
    maxSizeBytes: limits.bytes,
  });
  const rejected = { type: 0, size: 0, count: 0, total: 0 };
  checked.rejected.forEach((issue) => rejected[issue.reason]++);
  let bytes = existing.reduce((total, task) => total + task.file.size, 0);
  const accepted: File[] = [];
  for (const file of checked.accepted) {
    if (existing.length + accepted.length >= limits.files) rejected.count++;
    else if (bytes + file.size > limits.totalBytes) rejected.total++;
    else {
      accepted.push(file);
      bytes += file.size;
    }
  }
  return {
    accepted,
    summary: { accepted: accepted.length, rejected } satisfies IntakeSummary,
  };
}

export function sortedFolderFiles(files: readonly File[]) {
  return files
    .map((file, index) => ({
      file,
      index,
      path: file.webkitRelativePath || file.name,
    }))
    .sort((a, b) =>
      a.path < b.path ? -1 : a.path > b.path ? 1 : a.index - b.index,
    )
    .map((entry) => entry.file);
}
