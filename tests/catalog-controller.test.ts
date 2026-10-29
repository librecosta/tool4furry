import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { initCatalog } from '../src/site/catalog-controller';
import { setViewport } from './setup';

let dispose: (() => void) | undefined;
function fixture(n = 121, query = '', desktop = true) {
  const resize = setViewport(desktop);
  window.history.replaceState(null, '', '/tools/' + query);
  document.body.innerHTML = `<a data-language-link href="/en/tools/">EN</a><main data-tools-catalog data-locale="en">
    <div data-catalog-sidebar><dialog open data-catalog-filters><button data-close-filters>Close filters</button>
    <button data-catalog-control disabled data-filter="all">All</button>
    <button data-catalog-control disabled data-filter="role" data-value="painter" data-label="Artists">Artists</button>
    <button data-catalog-control disabled data-filter="role" data-value="composer" data-label="Composers">Composers</button>
    <button data-catalog-control disabled data-filter="category" data-value="images" data-label="Images" aria-controls="groups-images" aria-expanded="false">Images</button>
    <div id="groups-images" hidden><button data-catalog-control disabled data-filter="group" data-value="image-processing" data-parent="images" data-label="Processing">Processing</button></div>
    <button data-catalog-control disabled data-filter="category" data-value="development" data-label="Code" aria-controls="groups-code" aria-expanded="false">Code</button><div id="groups-code" hidden></div></dialog></div>
    <button data-toggle-sidebar hidden>Collapse</button>
    <button data-catalog-control disabled data-open-filters aria-expanded="false">Filters</button>
    <form data-catalog-search><input disabled data-catalog-control type="search"><button type="button" data-clear-search>Clear search</button><button type="button" data-search-all>Search all</button></form>
    <div data-catalog-chips></div><p data-result-count></p><section data-catalog-results tabindex="0">
    ${Array.from({length:n}, (_, i) => `<li data-catalog-item data-id="item-${i}" data-category="images" data-group="image-processing" data-roles="${i % 2 ? 'painter' : 'developer'}" data-search="Tool ${i} PNG format"><a href="/tools/item-${i}/">Tool ${i}</a></li>`).join('')}
    <div data-catalog-no-match hidden><button data-clear-all>Clear all</button></div><nav data-catalog-pagination hidden><div data-catalog-pages></div><p data-page-range></p>
    </nav></section><dialog data-catalog-jump-dialog><p data-jump-context></p><form data-catalog-jump><input id="catalog-page"><p id="catalog-page-error" hidden></p><button>Go</button><button type="button" data-close-jump>Cancel</button></form></dialog></main>`;
  for (const dialog of document.querySelectorAll('dialog')) {
    dialog.show = vi.fn(function(this: HTMLDialogElement) { this.open = true; });
    dialog.showModal = vi.fn(function(this: HTMLDialogElement) { this.open = true; });
    dialog.close = vi.fn(function(this: HTMLDialogElement) { this.open = false; this.dispatchEvent(new Event('close')); });
  }
  const root = document.querySelector<HTMLElement>('main')!;
  dispose = initCatalog(root);
  return { root, resize, search: root.querySelector<HTMLInputElement>('input[type="search"]')!, results: root.querySelector<HTMLElement>('[data-catalog-results]')! };
}
const click = (selector: string) => fireEvent.click(document.querySelector(selector)!);
const visibleIds = () => [...document.querySelectorAll<HTMLElement>('[data-catalog-item]')].filter(el => !el.hidden).map(el => el.dataset.id);
afterEach(() => { dispose?.(); dispose = undefined; document.body.innerHTML = ''; });

describe('catalog browser controller with isolated fixtures', () => {
  it('restores and clamps direct URL state, discards junk and keeps locale links local', () => {
    fixture(37, '?group=image-processing&page=999&role=painter&redirect=https://bad.test');
    expect(visibleIds()).toEqual(['item-25','item-27','item-29','item-31','item-33','item-35']);
    expect(window.location.search).toBe('?group=image-processing&role=painter&page=2');
    expect(document.querySelector('[data-language-link]')?.getAttribute('href')).toBe('/en/tools/?group=image-processing&role=painter&page=2');
    expect(document.querySelector('[data-filter="category"][data-value="images"]')?.getAttribute('aria-expanded')).toBe('true');
  });
  it('opens and selects whole parent rows, but collapsing preserves filters, page and scrolling', () => {
    const { results } = fixture();
    click('[data-filter="category"][data-value="development"]');
    click('[data-filter="category"][data-value="images"]');
    expect(window.location.search).toBe('?category=images');
    expect(document.querySelectorAll('[data-filter="category"][aria-expanded="true"]')).toHaveLength(2);
    click('[data-page="2"]'); results.scrollTop = 123;
    click('[data-filter="category"][data-value="images"]');
    expect(window.location.search).toBe('?category=images&page=2');
    expect(results.scrollTop).toBe(123);
    expect(document.querySelector('[data-filter="category"][data-value="images"]')?.getAttribute('aria-expanded')).toBe('false');
    expect(document.querySelector('[data-filter="category"][data-value="images"]')?.getAttribute('aria-pressed')).toBe('true');
    click('[data-filter="category"][data-value="images"]');
    expect(window.location.search).toBe('?category=images'); expect(results.scrollTop).toBe(0);
    click('[data-filter="role"]');
    expect(window.location.search).toBe('?category=images&role=painter');
    click('[data-filter="role"]'); expect(window.location.search).toBe('?category=images');
    click('[data-remove="category"]'); expect(window.location.search).toBe('');
  });
  it('keeps subgroup selection and expansion through search and permits clearing it', () => {
    const { search } = fixture(); click('[data-filter="category"][data-value="images"]');
    click('[data-filter="group"]'); expect(window.location.search).toBe('?group=image-processing');
    click('[data-filter="category"][data-value="images"]');
    expect(window.location.search).toBe('?group=image-processing');
    fireEvent.input(search, {target:{value:'PNG'}});
    expect(document.querySelector('[data-filter="category"][data-value="images"]')?.getAttribute('aria-expanded')).toBe('false');
    click('[data-filter="category"][data-value="images"]'); expect(window.location.search).toBe('?category=images&q=PNG');
    click('[data-filter="group"]'); click('[data-filter="group"]'); expect(window.location.search).toBe('?q=PNG');
  });
  it('filters before paging, scrolls only results and validates jump errors', () => {
    const { results } = fixture(); results.scrollTop = 600;
    click('[data-page="2"]'); expect(visibleIds()).toHaveLength(12); expect(visibleIds()[0]).toBe('item-12');
    expect(results.scrollTop).toBe(0); expect(document.activeElement).toBe(results);
    click('[data-open-jump]');
    const input = document.querySelector<HTMLInputElement>('#catalog-page')!;
    input.value = '2.5'; fireEvent.submit(document.querySelector('[data-catalog-jump]')!);
    expect(input.getAttribute('aria-invalid')).toBe('true'); expect(window.location.search).toBe('?page=2');
    expect(document.querySelector<HTMLDialogElement>('[data-catalog-jump-dialog]')!.open).toBe(true);
    input.value = '11'; fireEvent.submit(document.querySelector('[data-catalog-jump]')!);
    expect(visibleIds()).toEqual(['item-120']); expect(window.location.search).toBe('?page=11');
    expect(document.querySelector<HTMLDialogElement>('[data-catalog-jump-dialog]')!.open).toBe(false);
    expect(document.activeElement).toBe(results);
    expect(document.querySelector<HTMLButtonElement>('[data-page="12"]')?.disabled).toBe(true);
    expect(document.querySelector('[data-catalog-pages]')?.textContent).toContain('…');
    click('[data-filter="role"][data-value="composer"]'); expect(visibleIds()).toHaveLength(0);
    expect(window.location.search).toBe('?role=composer');
    expect(document.querySelector<HTMLElement>('[data-catalog-no-match]')?.hidden).toBe(false);
  });
  it('opens either ellipsis in one modal, restores cancellation focus and closes on popstate', () => {
    const { results } = fixture(181, '?page=8');
    const triggers = document.querySelectorAll<HTMLButtonElement>('[data-open-jump]');
    expect(triggers).toHaveLength(2);
    expect(triggers[0].getAttribute('aria-label')).toBe('Jump to earlier pages');
    expect(triggers[1].getAttribute('aria-label')).toBe('Jump to later pages');
    expect([...triggers].every(el => !el.hasAttribute('aria-current'))).toBe(true);
    const modal = document.querySelector<HTMLDialogElement>('[data-catalog-jump-dialog]')!;
    fireEvent.click(triggers[0]); expect(modal.open).toBe(true);
    expect(document.activeElement).toBe(document.querySelector('#catalog-page'));
    expect(document.querySelector('[data-jump-context]')?.textContent).toBe('Page 8 of 16');
    click('[data-close-jump]'); expect(document.activeElement).toBe(triggers[0]); expect(window.location.search).toBe('?page=8');
    fireEvent.click(triggers[1]); fireEvent(modal, new Event('cancel', {cancelable:true}));
    expect(document.activeElement).toBe(triggers[1]); expect(modal.open).toBe(false);
    fireEvent.click(triggers[1]); window.history.replaceState(null, '', '/tools/?page=16'); window.dispatchEvent(new PopStateEvent('popstate'));
    expect(modal.open).toBe(false); expect(document.activeElement).toBe(results); expect(window.location.search).toBe('?page=16');
  });
  it('folds only the desktop view while retaining filters, expansion, scroll and URL', () => {
    const { root, results } = fixture(181, '?group=image-processing&role=painter&q=PNG&page=3');
    const sidebar = document.querySelector<HTMLDialogElement>('[data-catalog-filters]')!;
    const toggle = document.querySelector<HTMLButtonElement>('[data-toggle-sidebar]')!;
    const query = window.location.search; sidebar.scrollTop = 91; results.scrollTop = 140;
    document.querySelector<HTMLButtonElement>('[data-filter="group"]')!.focus();
    click('[data-toggle-sidebar]');
    expect(root.dataset.sidebarCollapsed).toBe('true'); expect(sidebar.inert).toBe(true);
    expect(document.activeElement).toBe(toggle); expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(sidebar.scrollTop).toBe(91); expect(results.scrollTop).toBe(140); expect(window.location.search).toBe(query);
    expect(document.querySelector('[data-filter="category"]')!.getAttribute('aria-expanded')).toBe('true');
    click('[data-toggle-sidebar]'); expect(root.dataset.sidebarCollapsed).toBe('false'); expect(sidebar.inert).toBe(false);
    expect(results.scrollTop).toBe(140); expect(window.location.search).toBe(query);
  });
  it('never stacks jump and filter modals and cleans both up', () => {
    const { root } = fixture(181); dispose!(); setViewport(false); dispose = initCatalog(root);
    const sidebar = document.querySelector<HTMLDialogElement>('[data-catalog-filters]')!;
    const modal = document.querySelector<HTMLDialogElement>('[data-catalog-jump-dialog]')!;
    click('[data-open-jump]'); expect(modal.open).toBe(true); expect(sidebar.open).toBe(false);
    click('[data-open-filters]'); expect(modal.open).toBe(false); expect(sidebar.open).toBe(true);
    click('[data-open-jump]'); expect(sidebar.open).toBe(false); expect(modal.open).toBe(true);
    dispose!(); dispose = undefined; expect(modal.open).toBe(false); expect(sidebar.open).toBe(false);
  });
  it('keeps desktop folding separate from the mobile drawer across the breakpoint', () => {
    const { root, resize } = fixture(181);
    const sidebar = document.querySelector<HTMLDialogElement>('[data-catalog-filters]')!;
    click('[data-toggle-sidebar]'); expect(sidebar.inert).toBe(true);
    resize(false); expect(sidebar.inert).toBe(false); expect(sidebar.open).toBe(false);
    expect(root.dataset.sidebarCollapsed).toBe('false');
    click('[data-open-filters]'); expect(sidebar.open).toBe(true);
    resize(true); expect(sidebar.inert).toBe(true); expect(root.dataset.sidebarCollapsed).toBe('true');
    click('[data-toggle-sidebar]'); expect(sidebar.inert).toBe(false); expect(sidebar.open).toBe(true);
  });
  it('merges typing history, permits spaces/composition, restores popstate and searches the whole catalog', () => {
    const { search } = fixture(37, '?role=painter');
    const push = vi.spyOn(window.history, 'pushState'), replace = vi.spyOn(window.history, 'replaceState');
    search.focus(); fireEvent.input(search, {target:{value:' '}}); expect(push).not.toHaveBeenCalled();
    fireEvent.input(search, {target:{value:'PNG '}}); fireEvent.input(search, {target:{value:'PNG format'}});
    expect(push).toHaveBeenCalledTimes(1); expect(replace).toHaveBeenCalledTimes(1);
    expect(search.value).toBe('PNG format'); expect(visibleIds()).toHaveLength(12);
    fireEvent.input(search, {target:{value:'正在输入'}, isComposing:true}); expect(window.location.search).toContain('PNG+format');
    fireEvent.compositionEnd(search, {target:{value:'PNG'}}); expect(window.location.search).toBe('?role=painter&q=PNG');
    click('[data-search-all]'); expect(window.location.search).toBe('?q=PNG'); expect(document.querySelector('[data-result-count]')?.textContent).toBe('37 tools');
    window.history.replaceState(null, '', '/tools/?role=composer&q=none&page=4'); window.dispatchEvent(new PopStateEvent('popstate'));
    expect(window.location.search).toBe('?role=composer&q=none'); expect(search.value).toBe('none'); expect(visibleIds()).toHaveLength(0);
  });
  it.each([0,1,12,13])('renders honest pagination for %i items and cleans listeners', n => {
    fixture(n); expect(visibleIds()).toHaveLength(Math.min(n, 12));
    expect(document.querySelector<HTMLElement>('[data-catalog-pagination]')!.hidden).toBe(n <= 12);
    dispose!(); dispose = undefined; click('[data-filter="role"]'); expect(window.location.search).toBe('');
  });
  it('closes the mobile drawer on Escape and restores its trigger', () => {
    const { root } = fixture(1); const resize = setViewport(false);
    // Reinitialize against the mobile media source.
    dispose!(); dispose = initCatalog(root); resize(false);
    const dialog = root.querySelector('dialog')!; expect(dialog.open).toBe(false);
    click('[data-open-filters]'); expect(dialog.open).toBe(true);
    expect(root.querySelector('[data-open-filters]')?.getAttribute('aria-expanded')).toBe('true');
    fireEvent(dialog, new Event('cancel', {cancelable:true})); expect(dialog.open).toBe(false);
    expect(document.activeElement).toBe(root.querySelector('[data-open-filters]'));
  });
});
