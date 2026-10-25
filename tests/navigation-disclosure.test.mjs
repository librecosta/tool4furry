import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const source = readFileSync('src/styles/navigation-disclosure.js', 'utf8');
let dom;
function page(fine = true, scripted = true) {
  dom = new JSDOM(`<body><details data-tool-disclosure><summary>Featured Tools</summary><div data-tool-panel><a href="/tools/">Browse all</a><a href="/tools/example/">Example</a></div></details><button>Outside</button>${scripted ? `<script>${source}</script>` : ''}</body>`, {
    runScripts: scripted ? 'dangerously' : undefined,
    beforeParse(window) { window.matchMedia = () => ({ matches: fine }); },
  });
  const { window } = dom;
  const details = window.document.querySelector('details');
  const summary = details.querySelector('summary');
  const link = details.querySelector('a');
  const panel = details.querySelector('[data-tool-panel]');
  const outside = window.document.querySelector('button');
  const pointer = (target, type, relatedTarget = null, pointerType = 'mouse') => target.dispatchEvent(Object.assign(new window.Event(type, { bubbles: true }), { relatedTarget, pointerType }));
  return { window, details, summary, link, panel, outside, pointer };
}
afterEach(() => { dom?.window.close(); vi.useRealTimers(); });

describe('shared native toolbox enhancement', () => {
  it('delays fine-pointer hover, bridges the panel, and delays leaving', () => {
    vi.useFakeTimers();
    const { details, summary, link, panel, pointer } = page();
    pointer(summary, 'pointerover');
    vi.advanceTimersByTime(119);
    expect(details.open).toBe(false);
    vi.advanceTimersByTime(1);
    expect(details.open).toBe(true);
    pointer(summary, 'pointerout', panel);
    pointer(panel, 'pointerover', summary);
    pointer(panel, 'pointerout', link);
    pointer(link, 'pointerover', panel);
    vi.advanceTimersByTime(200);
    expect(details.open).toBe(true);
    pointer(link, 'pointerout');
    vi.advanceTimersByTime(179);
    expect(details.open).toBe(true);
    vi.advanceTimersByTime(1);
    expect(details.open).toBe(false);
  });

  it('does not immediately reopen after click-close until the pointer leaves', () => {
    vi.useFakeTimers();
    const { details, summary, pointer } = page();
    pointer(summary, 'pointerover'); vi.advanceTimersByTime(120);
    summary.click();
    pointer(summary, 'pointerover'); vi.advanceTimersByTime(300);
    expect(details.open).toBe(false);
    pointer(summary, 'pointerout'); pointer(summary, 'pointerover');
    vi.advanceTimersByTime(120);
    expect(details.open).toBe(true);
    summary.click(); summary.click();
    expect(details.open).toBe(true);
  });

  it.each([false, true])('keeps touch click-only even with fine media=%s', fine => {
    vi.useFakeTimers();
    const { details, summary, pointer } = page(fine);
    pointer(summary, 'pointerover', null, 'touch'); vi.advanceTimersByTime(300);
    expect(details.open).toBe(false);
    summary.click();
    expect(details.open).toBe(true);
    summary.click();
    expect(details.open).toBe(false);
  });

  it('dismisses on outside pointer and Escape, restoring focus from hidden content', () => {
    const { window, details, summary, link, outside, pointer } = page();
    summary.click(); link.focus(); pointer(outside, 'pointerdown');
    expect(details.open).toBe(false);
    expect(window.document.activeElement).toBe(summary);
    summary.click(); link.focus();
    link.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(details.open).toBe(false);
    expect(window.document.activeElement).toBe(summary);
    expect(window.document.body.style.overflow).toBe('');
  });

  it('allows normal focus movement through links and closes when focus leaves', () => {
    vi.useFakeTimers();
    const { details, summary, link, outside, pointer } = page();
    summary.click(); link.focus(); pointer(link, 'pointerout');
    vi.advanceTimersByTime(180);
    expect(details.open).toBe(true);
    outside.focus();
    expect(details.open).toBe(false);
    expect(outside.ownerDocument.activeElement).toBe(outside);
  });

  it('enhances React disclosures mounted after the initial document script', () => {
    const { window } = page();
    const added = window.document.createElement('details');
    added.dataset.toolDisclosure = '';
    added.innerHTML = '<summary>New toolbox</summary><a href="/tools/">All</a>';
    window.document.body.append(added);
    added.querySelector('summary').click();
    expect(added.open).toBe(true);
  });

  it('retains native summary expansion and the catalog link without JavaScript', () => {
    const { details, summary, link } = page(false, false);
    summary.click();
    expect(details.open).toBe(true);
    expect(link.getAttribute('href')).toBe('/tools/');
    expect(details.querySelector('[role="menu"]')).toBeNull();
  });
});
