import { pageRange } from '../general/pdf';

/** Zero-based ordered pages; only thumbnail interactions normalize to ascending. */
export function formatPages(pages: readonly number[]) {
  const parts: string[] = [];
  for (let i = 0; i < pages.length; i++) {
    const start = pages[i];
    let end = start;
    while (i + 1 < pages.length && pages[i + 1] === end + 1) end = pages[++i];
    parts.push(start === end ? `${start + 1}` : `${start + 1}-${end + 1}`);
  }
  return parts.join(',');
}

export function togglePage(range: string, count: number, index: number) {
  let pages: number[];
  try { pages = pageRange(range, count); } catch { pages = []; }
  const selected = new Set(pages);
  if (selected.has(index)) selected.delete(index);
  else selected.add(index);
  return formatPages([...selected].sort((a, b) => a - b));
}
