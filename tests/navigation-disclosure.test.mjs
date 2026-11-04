import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { compile } from 'sass-embedded';
import { afterEach, describe, expect, it, vi } from 'vitest';

const source = readFileSync('src/styles/navigation-disclosure.js', 'utf8');
let dom;
function page(fine = true, scripted = true, reduced = false) {
  let motion;
  dom = new JSDOM(`<body><details data-tool-disclosure><summary>Featured Tools</summary><div data-tool-positioner><div data-tool-panel><a href="/tools/">Browse all</a><a href="/tools/example/">Example</a></div></div></details><button>Outside</button>${scripted ? `<script>${source}</script>` : ''}</body>`, {
    runScripts: scripted ? 'dangerously' : undefined,
    beforeParse(window) {
      motion = Object.assign(new window.EventTarget(), { matches: reduced });
      window.matchMedia = query => query.includes('prefers-reduced-motion') ? motion : { matches: fine };
    },
  });
  const { window } = dom;
  const details = window.document.querySelector('details');
  const summary = details.querySelector('summary');
  const link = details.querySelector('a');
  const panel = details.querySelector('[data-tool-panel]');
  const positioner = details.querySelector('[data-tool-positioner]');
  const outside = window.document.querySelector('button');
  const pointer = (target, type, relatedTarget = null, pointerType = 'mouse') => target.dispatchEvent(Object.assign(new window.Event(type, { bubbles: true }), { relatedTarget, pointerType }));
  const endExit = () => panel.dispatchEvent(Object.assign(new window.Event('transitionend', { bubbles: true }), { propertyName: 'mask-size' }));
  return { window, details, summary, link, panel, positioner, outside, pointer, motion, endExit };
}
afterEach(() => { dom?.window.close(); vi.useRealTimers(); });

describe('shared native toolbox enhancement', () => {
  it('keeps the full positioner hit box independent of the 420ms visual clip', () => {
    const css = compile('src/components/site/ToolboxDisclosure.module.scss').css;
    const positioner = css.match(/\.positioner\s*\{([^}]+)\}/)[1];
    const panel = css.match(/\.panel\s*\{([^}]+)\}/)[1];
    expect(positioner).toContain('pointer-events: auto');
    expect(positioner).not.toMatch(/clip-path:|opacity:|transition/);
    expect(css).toMatch(/\.positioner:where\([^}]+pointer-events: none/s);
    expect(panel).not.toContain('clip-path:');
    expect(panel).toContain('mask-size: 100% calc(100% - var(--toolbox-hidden))');
    expect(panel).toContain('mask-size 420ms');
    expect(css).toContain('transition-duration: 0ms');
  });

  it('cancels a pending leave when the pointer returns to the stable outer area', () => {
    vi.useFakeTimers();
    const { details, summary, positioner, outside, pointer } = page();
    pointer(summary, 'pointerover'); vi.advanceTimersByTime(120);
    pointer(summary, 'pointerout', outside); vi.advanceTimersByTime(150);
    pointer(positioner, 'pointerover', outside); vi.advanceTimersByTime(200);
    expect(details.open).toBe(true);
    expect(details.dataset.toolMotion).not.toBe('closing');
  });

  it('finishes the exit from the visual panel event, not the outer box or its children', () => {
    vi.useFakeTimers();
    const { window, details, summary, positioner, panel, endExit } = page();
    summary.click(); summary.click();
    positioner.dispatchEvent(Object.assign(new window.Event('transitionend', { bubbles: true }), { propertyName: 'mask-size' }));
    panel.dispatchEvent(Object.assign(new window.Event('transitionend', { bubbles: true }), { propertyName: 'opacity' }));
    expect(details.open).toBe(true);
    vi.advanceTimersByTime(420); endExit();
    expect(details.open).toBe(false);
    vi.advanceTimersByTime(0); // Native details queues its own toggle event.
    expect(vi.getTimerCount()).toBe(0);
  });

  it('switches identity panels without navigation or closing, including nested icon clicks and keyboard activation', () => {
    const { window, details, summary, panel } = page();
    panel.insertAdjacentHTML('afterbegin', `<div role="group"><button type="button" data-tool-filter="featured" aria-pressed="true">All picks</button><button type="button" data-tool-filter="composer" aria-pressed="false"><svg><path /></svg>Audio Engineers</button><button type="button" data-tool-filter="missing">Unknown</button></div>
      <section data-tool-group="featured"><a href="/tools/example/">Example</a></section><section data-tool-group="composer" hidden><p>No tools available yet.</p></section>`);
    summary.click();
    const select = panel.querySelector('[data-tool-filter="composer"]');
    select.querySelector('path').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    expect(details.open).toBe(true);
    expect(select.getAttribute('aria-pressed')).toBe('true');
    expect(panel.querySelector('[data-tool-filter="featured"]').getAttribute('aria-pressed')).toBe('false');
    expect(panel.querySelector('[data-tool-group="featured"]').hidden).toBe(true);
    expect(panel.querySelector('[data-tool-group="composer"]').hidden).toBe(false);
    expect(window.location.href).toBe('about:blank');
    panel.querySelector('[data-tool-filter="missing"]').click();
    expect(select.getAttribute('aria-pressed')).toBe('true');
    const featured = panel.querySelector('[data-tool-filter="featured"]');
    featured.focus(); featured.click(); // Native button click is also Enter/Space activation.
    expect(window.document.activeElement).toBe(featured);
    expect(panel.querySelector('[data-tool-group="featured"]').hidden).toBe(false);
    expect(panel.querySelector('[data-tool-group="composer"]').hidden).toBe(true);
    expect(details.open).toBe(true);
  });

  it('delays fine-pointer hover, bridges the panel, and delays leaving', () => {
    vi.useFakeTimers();
    const { details, summary, link, panel, pointer, endExit } = page();
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
    expect(details.dataset.toolMotion).toBe('closing');
    vi.advanceTimersByTime(420); endExit();
    expect(details.open).toBe(false);
  });

  it('does not immediately reopen after click-close until the pointer leaves', () => {
    vi.useFakeTimers();
    const { details, summary, pointer, endExit } = page();
    pointer(summary, 'pointerover'); vi.advanceTimersByTime(120);
    summary.click();
    pointer(summary, 'pointerover'); vi.advanceTimersByTime(300);
    expect(details.dataset.toolMotion).toBe('closing');
    vi.advanceTimersByTime(120); endExit();
    expect(details.open).toBe(false);
    pointer(summary, 'pointerout'); pointer(summary, 'pointerover');
    vi.advanceTimersByTime(120);
    expect(details.open).toBe(true);
    summary.click(); summary.click();
    expect(details.open).toBe(true);
  });

  it.each([false, true])('keeps touch click-only even with fine media=%s', fine => {
    vi.useFakeTimers();
    const { details, summary, pointer, endExit } = page(fine);
    pointer(summary, 'pointerover', null, 'touch'); vi.advanceTimersByTime(300);
    expect(details.open).toBe(false);
    summary.click();
    expect(details.open).toBe(true);
    summary.click();
    vi.advanceTimersByTime(420); endExit();
    expect(details.open).toBe(false);
  });

  it('dismisses on outside pointer and Escape, restoring focus from hidden content', () => {
    const { window, details, summary, link, outside, pointer, endExit } = page();
    summary.click(); link.focus(); pointer(outside, 'pointerdown');
    expect(details.open).toBe(true); // Remains rendered throughout the exit.
    expect(details.querySelector('[data-tool-positioner]').hasAttribute('inert')).toBe(true);
    expect(summary.getAttribute('aria-expanded')).toBe('false');
    endExit();
    expect(details.open).toBe(false);
    expect(window.document.activeElement).toBe(summary);
    summary.click(); link.focus();
    link.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    endExit();
    expect(details.open).toBe(false);
    expect(window.document.activeElement).toBe(summary);
    expect(window.document.body.style.overflow).toBe('');
  });

  it('allows normal focus movement through links and closes when focus leaves', () => {
    vi.useFakeTimers();
    const { details, summary, link, outside, pointer, endExit } = page();
    summary.click(); link.focus(); pointer(link, 'pointerout');
    vi.advanceTimersByTime(180);
    expect(details.open).toBe(true);
    outside.focus();
    endExit();
    expect(details.open).toBe(false);
    expect(outside.ownerDocument.activeElement).toBe(outside);
  });

  it('allows leaving a pointer-focused item while retaining keyboard focus semantics', () => {
    vi.useFakeTimers();
    const { window, details, summary, link, pointer, endExit } = page();
    summary.click(); pointer(link, 'pointerdown'); link.focus();
    pointer(link, 'pointerout'); vi.advanceTimersByTime(180);
    expect(details.dataset.toolMotion).toBe('closing'); endExit();
    summary.click(); pointer(link, 'pointerdown'); link.focus();
    link.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    pointer(link, 'pointerout'); vi.advanceTimersByTime(180);
    expect(details.open).toBe(true);
    expect(details.dataset.toolMotion).not.toBe('closing');
  });

  it('enhances React disclosures mounted after the initial document script', () => {
    const { window } = page();
    const added = window.document.createElement('details');
    added.dataset.toolDisclosure = '';
    added.innerHTML = '<summary>New toolbox</summary><div data-tool-positioner><div data-tool-panel><a href="/tools/">All</a></div></div>';
    window.document.body.append(added);
    added.querySelector('summary').click();
    expect(added.open).toBe(true);
  });

  it('keeps exit links inert/hidden and ignores child transition ends, with a bounded fallback', () => {
    vi.useFakeTimers();
    const { window, details, summary, link, positioner } = page();
    summary.click(); summary.click();
    expect(positioner.hasAttribute('inert')).toBe(true);
    expect(positioner.getAttribute('aria-hidden')).toBe('true');
    link.dispatchEvent(Object.assign(new window.Event('transitionend', { bubbles: true }), { propertyName: 'mask-size' }));
    vi.advanceTimersByTime(420);
    expect(details.open).toBe(true);
    vi.advanceTimersByTime(60);
    expect(details.open).toBe(false);
    expect(details.hasAttribute('data-tool-motion')).toBe(false);
  });

  it('reverses an exit on click or renewed hover without a stale completion closing the new panel', () => {
    vi.useFakeTimers();
    const { details, summary, positioner, pointer, endExit } = page();
    summary.click(); summary.click(); vi.advanceTimersByTime(200);
    summary.click(); endExit(); vi.advanceTimersByTime(500);
    expect(details.open).toBe(true);
    expect(positioner.hasAttribute('inert')).toBe(false);
    expect(summary.getAttribute('aria-expanded')).toBe('true');
    pointer(summary, 'pointerout'); vi.advanceTimersByTime(180);
    expect(details.dataset.toolMotion).toBe('closing');
    pointer(summary, 'pointerover'); vi.advanceTimersByTime(120);
    endExit(); vi.advanceTimersByTime(500);
    expect(details.open).toBe(true);
    expect(details.hasAttribute('data-tool-motion')).toBe(false);
  });

  it('closes immediately with reduced motion, including a preference change mid-exit', () => {
    const { window, details, summary, motion } = page(true, true, true);
    summary.click(); summary.click();
    expect(details.open).toBe(false);
    motion.matches = false;
    summary.click(); summary.click();
    expect(details.dataset.toolMotion).toBe('closing');
    motion.matches = true; motion.dispatchEvent(new window.Event('change'));
    expect(details.open).toBe(false);
  });

  it('does not let a removed disclosure exit affect its remounted replacement', () => {
    vi.useFakeTimers();
    const { details, summary } = page();
    summary.click(); summary.click();
    const replacement = details.cloneNode(true);
    replacement.open = false;
    replacement.removeAttribute('data-tool-motion');
    details.replaceWith(replacement);
    replacement.querySelector('summary').click();
    vi.advanceTimersByTime(600);
    expect(replacement.open).toBe(true);
    expect(replacement.querySelector('[data-tool-positioner]').hasAttribute('inert')).toBe(false);
  });

  it('ignores a pending hover opening on an island that has been removed', () => {
    vi.useFakeTimers();
    const { details, summary, pointer } = page();
    pointer(summary, 'pointerover');
    const replacement = details.cloneNode(true);
    details.replaceWith(replacement);
    replacement.querySelector('summary').click();
    vi.advanceTimersByTime(700);
    expect(details.open).toBe(false);
    expect(replacement.open).toBe(true);
    expect(replacement.dataset.toolMotion).toBeUndefined();
  });

  it('retains native summary expansion and the catalog link without JavaScript', () => {
    const { details, summary, link } = page(false, false);
    summary.click();
    expect(details.open).toBe(true);
    expect(link.getAttribute('href')).toBe('/tools/');
    expect(details.querySelector('[role="menu"]')).toBeNull();
  });
});
