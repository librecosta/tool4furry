import { safeName, integer, LocalError } from '../general/bounds';
export type Rules = {
  name: string;
  sequence: boolean;
  start: string;
  digits: string;
  separator: '-' | '_' | ' ' | '';
};
export const defaultRules: Rules = {
  name: '',
  sequence: true,
  start: '1',
  digits: '3',
  separator: '-',
};
export type RenameItem = {
  original: string;
  name: string;
  extension: string;
  number: string;
  issue?: 'invalid' | 'duplicate' | 'number';
};
/** Invalid plans remain inspectable, but cannot be used as a successful export plan. */
export class RenamePlanError extends LocalError {
  constructor(public plan: RenameItem[], zh: string, en: string) {
    super(zh, en);
  }
}
function extension(name: string) {
  const at = name.lastIndexOf('.');
  return at > 0 ? name.slice(at) : '';
}
export function renamePlan(names: string[], rules: Rules) {
  let start = 0, digits = 1;
  if (rules.sequence) {
    try {
      start = integer(rules.start, 0, Number.MAX_SAFE_INTEGER);
      digits = integer(rules.digits, 1, 8);
      if (!Number.isSafeInteger(start + Math.max(0, names.length - 1)))
        throw new LocalError('序号超出安全整数范围。', 'Sequence exceeds the safe integer range.');
    } catch (error) {
      if (!(error instanceof LocalError)) throw error;
      throw new RenamePlanError(names.map(original => ({original, name: '', extension: extension(original), number: '', issue: 'number'})), error.zh, error.en);
    }
  }
  const plan: RenameItem[] = names.map((original, i) => {
    const ext = extension(original), number = rules.sequence ? String(start + i).padStart(digits, '0') : '';
    const name = !rules.name && !rules.sequence ? original
      : `${rules.name}${rules.name && rules.sequence ? rules.separator : ''}${number}${ext}`;
    const valid = safeName(name) && new TextEncoder().encode(name).length <= 180
      && ['-', '_', ' ', ''].includes(rules.separator)
      && (!rules.name || !!rules.name.trim() && !/^\.{1,2}$/.test(rules.name));
    return {original, name, extension: ext, number, ...(!valid && {issue: 'invalid' as const})};
  });
  const seen = new Map<string, RenameItem>();
  for (const item of plan) {
    if (item.issue) continue;
    const { name } = item;
    const key = name.toLocaleLowerCase('en-US');
    const previous = seen.get(key);
    if (previous) { previous.issue = 'duplicate'; item.issue = 'duplicate'; }
    else seen.set(key, item);
  }
  if (plan.some(item => item.issue === 'invalid'))
    throw new RenamePlanError(plan, '输出文件名包含非法字符或过长。', 'Output filename contains invalid characters or is too long.');
  if (plan.some(item => item.issue === 'duplicate'))
    throw new RenamePlanError(plan, '输出名称重复，请开启序号或修改名称。', 'Duplicate output filenames. Enable numbering or change the name.');
  return plan;
}
