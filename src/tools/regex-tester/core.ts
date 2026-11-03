export type RegexRequest = {
  pattern: string;
  flags: string;
  text: string;
  replacement: string;
};
export type RegexMatch = {
  index: number;
  end: number;
  value: string;
  groups: (string | null)[];
  named: Record<string, string | null>;
};
export function evaluateRegex({
  pattern,
  flags,
  text,
  replacement,
}: RegexRequest) {
  if (
    pattern.length > 500 ||
    text.length > 200000 ||
    replacement.length > 10000 ||
    !pattern
  )
    throw new Error(
      'Input limit: pattern 500, text 200000, replacement 10000 characters.',
    );
  if (!/^[gimsuyd]*$/.test(flags) || new Set(flags).size !== flags.length)
    throw new Error('Invalid flags.');
  const regex = new RegExp(pattern, flags),
    matches: RegexMatch[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text))) {
    if (matches.length >= 1000)
      throw new Error('More than 1000 matches. Narrow the expression.');
    matches.push({
      index: match.index,
      end: match.index + match[0].length,
      value: match[0],
      groups: match.slice(1).map((v) => v ?? null),
      named: Object.fromEntries(
        Object.entries(match.groups ?? {}).map(([k, v]) => [k, v ?? null]),
      ),
    });
    if (!regex.global) break;
    if (!match[0].length) {
      const at = regex.lastIndex;
      regex.lastIndex +=
        regex.unicode && at < text.length && text.codePointAt(at)! > 0xffff
          ? 2
          : 1;
    }
  }
  regex.lastIndex = 0;
  const replaced = text.replace(regex, replacement);
  if (replaced.length > 2000000)
    throw new Error('Replacement result exceeds 2000000 characters.');
  return { matches, replaced };
}
export type RegexResult = ReturnType<typeof evaluateRegex>;
