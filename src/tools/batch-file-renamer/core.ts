import { safeName, fail, integer } from '../general/bounds';
export type Rules = {
  prefix: string;
  suffix: string;
  find: string;
  replace: string;
  sequence: boolean;
  start: string;
  digits: string;
  keepExtension: boolean;
};
export const defaultRules: Rules = {
  prefix: '',
  suffix: '',
  find: '',
  replace: '',
  sequence: true,
  start: '1',
  digits: '3',
  keepExtension: true,
};
export function renamePlan(names: string[], rules: Rules) {
  const start = integer(rules.start, 0, 1000000),
    digits = integer(rules.digits, 1, 8),
    seen = new Set<string>();
  return names.map((original, i) => {
    const at = original.lastIndexOf('.'),
      ext = rules.keepExtension && at > 0 ? original.slice(at) : '',
      stem = ext ? original.slice(0, at) : original;
    let name = rules.find ? stem.split(rules.find).join(rules.replace) : stem;
    name =
      rules.prefix +
      name +
      rules.suffix +
      (rules.sequence ? `-${String(start + i).padStart(digits, '0')}` : '') +
      ext;
    if (!safeName(name) || new TextEncoder().encode(name).length > 180)
      fail(
        '输出文件名包含非法字符或过长。',
        'Output filename contains invalid characters or is too long.',
      );
    const key = name.toLocaleLowerCase('en-US');
    if (seen.has(key))
      fail(
        '输出文件名重复，请修改规则。',
        'Duplicate output filenames. Adjust the rules.',
      );
    seen.add(key);
    return { original, name };
  });
}
