import { validateFiles } from '../../ui/file-constraints';
import { imageBudget } from '../image/types';

export const intakeBudget = { files: 20, bytes: 100 * 1024 ** 2 } as const;
export const imageAccept =
  '.png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp';
export type IntakeReason = 'type' | 'size' | 'count' | 'total';
export type IntakeSummary = Readonly<{
  accepted: number;
  rejected: Readonly<Record<IntakeReason, number>>;
}>;

/** Metadata only; real format and dimensions are still checked serially by Image Core. */
export function planIntake(
  files: readonly File[],
  existing: readonly { file: Pick<File, 'size'> }[],
) {
  const checked = validateFiles(files, {
    accept: imageAccept,
    multiple: true,
    maxSizeBytes: imageBudget.bytes,
  });
  const rejected = { type: 0, size: 0, count: 0, total: 0 };
  checked.rejected.forEach((issue) => rejected[issue.reason]++);
  let bytes = existing.reduce((total, task) => total + task.file.size, 0);
  const accepted: File[] = [];
  for (const file of checked.accepted) {
    if (existing.length + accepted.length >= intakeBudget.files)
      rejected.count++;
    else if (bytes + file.size > intakeBudget.bytes) rejected.total++;
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
