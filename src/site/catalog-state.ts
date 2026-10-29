import { roles } from './roles';

export const PAGE_SIZE = 12;
export const MAX_QUERY_LENGTH = 160;
export type CatalogState = { category: string; group: string; role: string; q: string; page: number };
export type SearchEntry = { id: string; categoryId: string; groupId: string; roles: readonly string[]; search: string };
export type CatalogScope = { categories: readonly string[]; groups: Readonly<Record<string, string>> };
export const emptyCatalogState = (): CatalogState => ({ category: '', group: '', role: '', q: '', page: 1 });
export function normalizeSearch(value: string) { return value.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase(); }

/** Only known IDs survive; a valid group takes precedence over a parent. */
export function parseCatalogState(search: string, scope: CatalogScope): CatalogState {
  const params = new URLSearchParams(search), state = emptyCatalogState();
  const group = params.get('group') ?? '', category = params.get('category') ?? '', role = params.get('role') ?? '';
  if (Object.hasOwn(scope.groups, group)) state.group = group;
  else if (scope.categories.includes(category)) state.category = category;
  if (Object.hasOwn(roles, role)) state.role = role;
  const q = (params.get('q') ?? '').normalize('NFKC').trim().replace(/\s+/gu, ' ');
  if (q.length <= MAX_QUERY_LENGTH) state.q = q;
  const page = params.get('page') ?? '1';
  if (/^\d+$/.test(page) && Number.isSafeInteger(Number(page)) && Number(page) >= 1) state.page = Number(page);
  return state;
}
export function catalogQuery(state: CatalogState) {
  const params = new URLSearchParams();
  if (state.group) params.set('group', state.group);
  else if (state.category) params.set('category', state.category);
  if (state.role) params.set('role', state.role);
  if (state.q) params.set('q', state.q);
  if (state.page > 1) params.set('page', String(state.page));
  const query = params.toString();
  return query ? `?${query}` : '';
}
export function catalogPage<T extends SearchEntry>(entries: readonly T[], state: CatalogState) {
  const words = normalizeSearch(state.q).split(' ').filter(Boolean);
  const matches = entries.filter(entry => (!state.group || entry.groupId === state.group)
    && (!state.category || entry.categoryId === state.category) && (!state.role || entry.roles.includes(state.role))
    && words.every(word => normalizeSearch(entry.search).includes(word)));
  const total = matches.length, totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.max(1, Math.min(Number.isSafeInteger(state.page) ? state.page : 1, totalPages));
  const start = (page - 1) * PAGE_SIZE;
  return { items: matches.slice(start, start + PAGE_SIZE), total, totalPages, page, start: total ? start + 1 : 0, end: Math.min(start + PAGE_SIZE, total) };
}
export function pageNumbers(page: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  const selected = new Set([1, total, page - 1, page, page + 1].filter(n => n >= 1 && n <= total));
  if (page <= 3) { selected.add(2); selected.add(3); selected.add(4); }
  if (page >= total - 2) { selected.add(total - 1); selected.add(total - 2); selected.add(total - 3); }
  const result: (number | '…')[] = [], sorted = [...selected].sort((a, b) => a - b);
  for (let i = 0; i < sorted.length; i++) {
    if (i && sorted[i] - sorted[i - 1] === 2) result.push(sorted[i] - 1);
    else if (i && sorted[i] - sorted[i - 1] > 2) result.push('…');
    result.push(sorted[i]);
  }
  return result;
}
export function validJump(value: string, total: number): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const page = Number(value);
  return Number.isSafeInteger(page) && page >= 1 && page <= total ? page : null;
}

/** Catalog-only same-origin locale navigation. Never forwards arbitrary query. */
export function catalogLanguageHref(href: string, state: CatalogState) { return href.split(/[?#]/u)[0] + catalogQuery(state); }
