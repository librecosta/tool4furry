export const MiB = 1024 ** 2;
export class LocalError extends Error {
  constructor(
    public zh: string,
    public en: string,
  ) {
    super(en);
  }
}
export function fail(zh: string, en: string): never {
  throw new LocalError(zh, en);
}
export function boundedFiles(
  files: readonly File[],
  maxCount = 100,
  maxTotal = 96 * MiB,
  maxFile = 32 * MiB,
) {
  if (
    !files.length ||
    files.length > maxCount ||
    files.some((f) => f.size > maxFile) ||
    files.reduce((n, f) => n + f.size, 0) > maxTotal
  )
    fail('文件数量或体积超限。', 'File count or size limit exceeded.');
}
export function boundedText(text: string, max = 500000) {
  if (text.length > max) fail('文本过长。', 'Text is too long.');
}
export function integer(text: string, min: number, max: number) {
  if (
    !/^\d+$/.test(text) ||
    !Number.isSafeInteger(Number(text)) ||
    Number(text) < min ||
    Number(text) > max
  )
    fail('无效或超限的数值。', 'Invalid or excessive value.');
  return Number(text);
}
export function safeName(name: string) {
  return (
    !!name &&
    name.length <= 160 &&
    !/[\x00-\x1f\x7f<>:"/\\|?*]/.test(name) &&
    !/[. ]$/.test(name) &&
    !/^\.{1,2}$/.test(name) &&
    !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name)
  );
}
