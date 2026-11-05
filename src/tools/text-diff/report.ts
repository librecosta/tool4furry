import type { Locale } from '../../i18n/locale';
import type { DiffLine, DiffResult } from './core';

export type DisplayRow =
  | { kind: 'line'; line: DiffLine; oldNumber?: number; newNumber?: number; text: string }
  | { kind: 'gap'; count: number };

export const endingLabel = (value: string, locale: Locale) => value === 'none' ? (locale === 'zh' ? '无' : 'none') : value === 'mixed' ? (locale === 'zh' ? '混合' : 'mixed') : value;

/** Changes-only is a projection, never another diff. Two context lines per side. */
export function displayRows(result: DiffResult, changesOnly: boolean): DisplayRow[] {
  const keep = new Set<number>();
  if (changesOnly) {
    result.lines.forEach((line, index) => {
      if (line.type !== 'equal') for (let i = Math.max(0, index - 2); i <= Math.min(result.lines.length - 1, index + 2); i++) keep.add(i);
    });
    if (result.eof.changed) for (let i = Math.max(0, result.lines.length - 2); i < result.lines.length; i++) keep.add(i);
  }
  const rows: DisplayRow[] = [];
  let hidden = 0;
  const gap = () => { if (hidden) rows.push({ kind: 'gap', count: hidden }); hidden = 0; };
  result.lines.forEach((line, index) => {
    if (changesOnly && !keep.has(index)) { hidden++; return; }
    gap();
    // Ignored whitespace matches can contain two genuine source strings.
    if (line.type === 'equal' && line.oldText !== line.newText) {
      rows.push({ kind: 'line', line, oldNumber: line.oldNumber, text: line.oldText! });
      rows.push({ kind: 'line', line, newNumber: line.newNumber, text: line.newText! });
    } else rows.push({ kind: 'line', line, oldNumber: line.oldNumber, newNumber: line.newNumber, text: line.text });
  });
  gap();
  return rows;
}
export function diffReport(result: DiffResult, changesOnly = false, locale: Locale = 'en') {
  const zh = locale === 'zh';
  const yes = (value: boolean) => value ? (zh ? '有' : 'yes') : (zh ? '无' : 'no');
  const lines = [
    zh ? '文本差异报告' : 'Text difference report',
    `+${result.added} ${zh ? '新增' : 'added'} · −${result.removed} ${zh ? '删除' : 'removed'}`,
    `${zh ? '视图' : 'View'}: ${changesOnly ? (zh ? '仅变化（含两行上下文）' : 'Changes only (two context lines)') : (zh ? '全部' : 'All')}`,
    `${zh ? '忽略行尾空白' : 'Ignore trailing whitespace'}: ${yes(result.ignoreEndWhitespace)}`,
    `${zh ? '末尾换行（原文 → 新文）' : 'EOF newline (original → revised)'}: ${yes(result.eof.old)} → ${yes(result.eof.new)}`,
    `${zh ? '换行符（原文 → 新文）' : 'Line endings (original → revised)'}: ${endingLabel(result.endings.old, locale)} → ${endingLabel(result.endings.new, locale)}`,
    '',
    zh ? '原文行\t新文行\t标识\t内容' : 'Original\tRevised\tSign\tText',
  ];
  for (const row of displayRows(result, changesOnly)) {
    if (row.kind === 'gap') lines.push(`… ${row.count} ${zh ? '行未变化内容已隐藏' : 'unchanged lines hidden'} …`);
    else lines.push(`${row.oldNumber ?? ''}\t${row.newNumber ?? ''}\t${row.line.type === 'added' ? '+' : row.line.type === 'removed' ? '−' : ' '}\t${row.text}`);
  }
  return lines.join('\n');
}
export function createDiffNamer() {
  let previous = '', collision = 0;
  return (now = new Date()) => {
    const pad = (value: number, width = 2) => String(value).padStart(width, '0');
    const stamp = `${pad(now.getFullYear(), 4)}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}-${pad(now.getMilliseconds(), 3)}`;
    collision = stamp === previous ? collision + 1 : 0; previous = stamp;
    return `text-diff-${stamp}${collision ? `-${collision + 1}` : ''}.txt`;
  };
}
export const diffDownloadName = createDiffNamer();
