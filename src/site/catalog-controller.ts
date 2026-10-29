import * as stylex from '@stylexjs/stylex';
import { catalogStyles as c } from '../styles/catalog';
import { catalogCopy } from './catalog-copy';
import { catalogLanguageHref, catalogPage, catalogQuery, emptyCatalogState, pageNumbers, parseCatalogState, validJump, type CatalogState, type SearchEntry } from './catalog-state';

/** One page-local enhancement. Static cards remain usable if this module fails. */
export function initCatalog(root: HTMLElement, win: Window = window) {
  const t = catalogCopy[root.dataset.locale === 'zh' ? 'zh' : 'en'];
  const find = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const input = find<HTMLInputElement>('input[type="search"]'), results = find<HTMLElement>('[data-catalog-results]');
  const chips = find<HTMLElement>('[data-catalog-chips]'), count = find<HTMLElement>('[data-result-count]');
  const pagination = find<HTMLElement>('[data-catalog-pagination]'), pages = find<HTMLElement>('[data-catalog-pages]');
  const jump = find<HTMLFormElement>('[data-catalog-jump]'), jumpInput = jump.querySelector('input')!;
  const error = find<HTMLElement>('#catalog-page-error'), dialog = find<HTMLDialogElement>('[data-catalog-filters]');
  const trigger = find<HTMLButtonElement>('[data-open-filters]'), searchAll = find<HTMLButtonElement>('[data-search-all]');
  const filters = [...root.querySelectorAll<HTMLButtonElement>('[data-filter]')];
  const parents = filters.filter(button => button.dataset.filter === 'category' && button.hasAttribute('aria-controls'));
  const language = root.ownerDocument.querySelector<HTMLAnchorElement>('[data-language-link]');
  const languagePath = language?.getAttribute('href') ?? '';
  const items = [...root.querySelectorAll<HTMLElement>('[data-catalog-item]')].map(element => ({
    element, id: element.dataset.id!, categoryId: element.dataset.category!, groupId: element.dataset.group!,
    roles: (element.dataset.roles ?? '').split(' '), search: element.dataset.search ?? '',
  } satisfies SearchEntry & { element: HTMLElement }));
  const scope = {
    categories: filters.filter(button => button.dataset.filter === 'category').map(button => button.dataset.value!),
    groups: Object.fromEntries(filters.filter(button => button.dataset.filter === 'group').map(button => [button.dataset.value!, button.dataset.parent!])),
  };
  const abort = new AbortController(), options = { signal: abort.signal };
  const media = win.matchMedia('(min-width: 900px)');
  let state = parseCatalogState(win.location.search, scope), totalPages = 1, typing = false, previousGroup = '';
  function elementButton(text: string, attrs: Record<string, string> = {}) {
    const button = root.ownerDocument.createElement('button');
    button.type = 'button'; button.textContent = text;
    button.className = stylex.props(c.button, c.page).className ?? '';
    for (const [name, value] of Object.entries(attrs)) button.setAttribute(name, value);
    return button;
  }
  function expand(button: HTMLButtonElement, open: boolean) {
    button.setAttribute('aria-expanded', String(open));
    root.ownerDocument.getElementById(button.getAttribute('aria-controls')!)!.hidden = !open;
  }
  function render(preserveInput = false) {
    const page = catalogPage(items, state); state.page = page.page; totalPages = page.totalPages;
    const visible = new Set(page.items.map(item => item.id));
    for (const item of items) item.element.hidden = !visible.has(item.id);
    if (!preserveInput) input.value = state.q;
    find<HTMLButtonElement>('[data-clear-search]').disabled = !state.q;
    count.textContent = page.total === 1 ? t.countOne : t.count.replace('{count}', String(page.total));
    find<HTMLElement>('[data-catalog-no-match]').hidden = items.length === 0 || page.total > 0;
    searchAll.hidden = !(state.category || state.group || state.role);
    for (const button of filters) {
      const kind = button.dataset.filter!;
      const pressed = kind === 'all' ? !(state.category || state.group || state.role || state.q)
        : state[kind as 'category' | 'group' | 'role'] === button.dataset.value;
      button.setAttribute('aria-pressed', String(pressed));
    }
    if (state.group && state.group !== previousGroup) {
      const parent = parents.find(button => button.dataset.value === scope.groups[state.group]);
      if (parent) expand(parent, true);
    }
    previousGroup = state.group;
    chips.replaceChildren();
    for (const key of ['category', 'group', 'role', 'q'] as const) {
      if (!state[key]) continue;
      const name = key === 'q' ? t.keyword.replace('{name}', state.q)
        : filters.find(button => button.dataset.filter === key && button.dataset.value === state[key])!.dataset.label!;
      const chip = elementButton(`${name} ×`, { 'data-remove': key, 'aria-label': t.remove.replace('{name}', name) });
      chip.className = stylex.props(c.button, c.chip).className ?? ''; chips.append(chip);
    }
    if (chips.childElementCount) chips.append(elementButton(t.clear, { 'data-clear-all': '' }));
    chips.hidden = !chips.childElementCount;
    pagination.hidden = page.total <= 12;
    pages.replaceChildren();
    if (!pagination.hidden) {
      const previous = elementButton(t.previous, { 'data-page': String(state.page - 1) }); previous.disabled = state.page === 1; pages.append(previous);
      for (const value of pageNumbers(state.page, page.totalPages)) {
        if (value === '…') { const span = root.ownerDocument.createElement('span'); span.textContent = value; span.className = stylex.props(c.ellipsis).className ?? ''; pages.append(span); continue; }
        pages.append(elementButton(String(value), { 'data-page': String(value), 'aria-label': t.page.replace('{page}', String(value)), ...(value === state.page ? { 'aria-current': 'page' } : {}) }));
      }
      const next = elementButton(t.next, { 'data-page': String(state.page + 1) }); next.disabled = state.page === page.totalPages; pages.append(next);
    }
    find<HTMLElement>('[data-page-range]').textContent = t.range.replace('{start}', String(page.start)).replace('{end}', String(page.end)).replace('{total}', String(page.total));
    jump.hidden = page.totalPages <= 7; jumpInput.value = ''; jumpInput.removeAttribute('aria-invalid'); error.hidden = true;
    if (language && languagePath.startsWith('/')) language.setAttribute('href', catalogLanguageHref(languagePath, state));
  }
  function update(next: CatalogState, mode: 'pushState' | 'replaceState', resetScroll = true, preserveInput = false) {
    state = parseCatalogState(catalogQuery(next), scope); render(preserveInput);
    const url = win.location.pathname + catalogQuery(state);
    const changed = url !== win.location.pathname + win.location.search + win.location.hash;
    if (changed) win.history[mode](win.history.state, '', url);
    if (resetScroll) results.scrollTop = 0;
    return changed;
  }
  function closeDrawer(restore = true) {
    if (dialog.open && !media.matches) dialog.close();
    trigger.setAttribute('aria-expanded', 'false');
    if (restore && !media.matches) trigger.focus({ preventScroll: true });
  }
  function syncLayout() {
    const wasModal = dialog.matches(':modal');
    if (wasModal || (!media.matches && dialog.open)) dialog.close();
    trigger.setAttribute('aria-expanded', 'false');
    if (media.matches) { dialog.setAttribute('open', ''); if (wasModal) input.focus({ preventScroll: true }); }
  }
  root.addEventListener('click', event => {
    const target = (event.target as Element).closest<HTMLButtonElement>('button'); if (!target || target.disabled) return;
    if (target.hasAttribute('data-open-filters')) { dialog.showModal(); trigger.setAttribute('aria-expanded', 'true'); return; }
    if (target.hasAttribute('data-close-filters')) { closeDrawer(); return; }
    if (target.dataset.filter === 'category' && target.hasAttribute('aria-controls')) {
      const open = target.getAttribute('aria-expanded') === 'true';
      expand(target, !open);
      // Collapsing is disclosure-only: keep the active filter, page and scroll.
      if (!open) { typing = false; update({ ...state, category: target.dataset.value!, group: '', page: 1 }, 'pushState'); }
      return;
    }
    typing = false;
    if (target.dataset.filter) {
      const key = target.dataset.filter;
      if (key === 'all') update(emptyCatalogState(), 'pushState');
      else {
        const next = { ...state, page: 1 };
        if (key === 'role') next.role = state.role === target.dataset.value ? '' : target.dataset.value!;
        else { next.category = ''; next.group = ''; next[key as 'category' | 'group'] = state[key as 'category' | 'group'] === target.dataset.value ? '' : target.dataset.value!; }
        update(next, 'pushState');
      }
    } else if (target.hasAttribute('data-clear-all')) { update(emptyCatalogState(), 'pushState'); input.focus(); }
    else if (target.hasAttribute('data-clear-search')) { update({ ...state, q: '', page: 1 }, 'pushState'); input.focus(); }
    else if (target.hasAttribute('data-search-all')) { update({ ...state, category: '', group: '', role: '', page: 1 }, 'pushState'); input.focus(); }
    else if (target.dataset.remove) { update({ ...state, [target.dataset.remove]: '', page: 1 }, 'pushState'); input.focus(); }
    else if (target.dataset.page) { update({ ...state, page: Number(target.dataset.page) }, 'pushState'); results.focus({ preventScroll: true }); }
  }, options);
  const searchInput = () => { if (update({ ...state, q: input.value, page: 1 }, typing ? 'replaceState' : 'pushState', true, true)) typing = true; };
  input.addEventListener('input', event => { if (!(event as InputEvent).isComposing) searchInput(); }, options);
  input.addEventListener('compositionend', searchInput, options);
  input.addEventListener('blur', () => { typing = false; }, options);
  find<HTMLFormElement>('[data-catalog-search]').addEventListener('submit', event => { event.preventDefault(); typing = false; update({ ...state, q: input.value, page: 1 }, 'replaceState'); }, options);
  jump.addEventListener('submit', event => {
    event.preventDefault(); const page = validJump(jumpInput.value, totalPages);
    if (page === null) { jumpInput.setAttribute('aria-invalid', 'true'); error.textContent = t.jumpError.replace('{total}', String(totalPages)); error.hidden = false; return; }
    typing = false; update({ ...state, page }, 'pushState'); results.focus({ preventScroll: true });
  }, options);
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeDrawer(); }, options);
  dialog.addEventListener('click', event => { if (event.target === dialog && !media.matches) { const box = dialog.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closeDrawer(); } }, options);
  dialog.addEventListener('close', () => { trigger.setAttribute('aria-expanded', 'false'); }, options);
  media.addEventListener('change', syncLayout, options);
  win.addEventListener('popstate', () => { typing = false; state = parseCatalogState(win.location.search, scope); update(state, 'replaceState'); }, options);
  const cleanup = () => { abort.abort(); if (dialog.open && !media.matches) dialog.close(); };
  win.addEventListener('pagehide', event => { closeDrawer(false); if (!(event as PageTransitionEvent).persisted) cleanup(); }, options);
  // Initialize in the first module task: no artificial hide/delay or JS-only cards.
  update(state, 'replaceState', false); syncLayout();
  for (const control of root.querySelectorAll<HTMLInputElement | HTMLButtonElement>('[data-catalog-control]')) control.disabled = false;
  find<HTMLButtonElement>('[data-clear-search]').disabled = !state.q;
  return cleanup;
}
