import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const source = readFileSync('src/styles/appearance-controller.js', 'utf8');
const html = `<html class="dark-theme root-style unrelated" data-appearance="dark"><head>
<script id="t4f-appearance" data-dark="dark-theme" data-light="light-theme" data-default="dark" data-region-origins='["https://tool4furry.cn","https://tool4furry.com","http://127.0.0.1:54321","http://127.0.0.1:54322"]'>${source}</script>
</head><body><button disabled data-appearance-toggle="static" data-light-label="Light" data-dark-label="Dark"></button></body></html>`;

function page(preference, blocked = false, scripts = true, options = {}) {
  return new JSDOM(html, { url: options.url || 'https://tool4furry.cn/', pretendToBeVisual: true, runScripts: scripts ? 'dangerously' : undefined,
    beforeParse(window) {
      options.setup?.(window);
      if (blocked) Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } });
      else if (preference !== undefined) window.localStorage.setItem('t4f.appearance', preference);
    },
  });
}

describe('synchronous appearance controller', () => {
  it('restores before body parsing, replaces only theme classes, and toggles static controls', () => {
    const dom = page('light');
    const { window } = dom;
    const root = window.document.documentElement;
    expect(root.dataset.appearance).toBe('light');
    expect(root.style.colorScheme).toBe('light');
    expect(root.className).toBe('root-style unrelated light-theme');
    window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
    const button = window.document.querySelector('button');
    expect(button.disabled).toBe(false);
    expect(button.getAttribute('aria-label')).toBe('Dark');
    button.click();
    expect(window.t4fAppearance.get()).toBe('dark');
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(window.localStorage.getItem('t4f.appearance')).toBe('dark');
    dom.window.close();
  });
  it.each([undefined, 'invalid'])('uses dark for missing/invalid preference %s', preference => {
    const dom = page(preference);
    expect(dom.window.t4fAppearance.get()).toBe('dark');
    dom.window.close();
  });
  it('works in memory when storage access throws and falls back on next load', () => {
    const dom = page(undefined, true);
    expect(() => dom.window.t4fAppearance.toggle()).not.toThrow();
    expect(dom.window.t4fAppearance.get()).toBe('light');
    dom.window.close();
    const next = page(undefined, true);
    expect(next.window.t4fAppearance.get()).toBe('dark');
    next.window.close();
  });
  it('synchronizes local storage changes/clear and ignores unrelated/session storage', () => {
    const dom = page();
    const { window } = dom;
    const change = (key, value, area = window.localStorage) =>
      window.dispatchEvent(new window.StorageEvent('storage', { key, newValue: value, storageArea: area }));
    change('t4f.appearance', 'light');
    expect(window.t4fAppearance.get()).toBe('light');
    change('unrelated', 'dark');
    change('t4f.appearance', 'dark', window.sessionStorage);
    expect(window.t4fAppearance.get()).toBe('light');
    change(null, null);
    expect(window.t4fAppearance.get()).toBe('dark');
    dom.window.close();
  });
  it('keeps the static dark page and disabled theme control usable without scripting', () => {
    const dom = page('light', false, false);
    expect(dom.window.document.documentElement.dataset.appearance).toBe('dark');
    expect(dom.window.document.querySelector('button').disabled).toBe(true);
    expect(dom.window.t4fAppearance).toBeUndefined();
    dom.window.close();
  });
});

describe('one-shot cross-origin appearance relay', () => {
  it.each(['light', 'dark'])('overrides the target preference before paint, persists and removes only its known hash (%s)', theme => {
    for (const origin of ['https://tool4furry.com', 'http://127.0.0.1:54322', 'http://127.0.0.1:54321']) {
      const dom = page(theme === 'light' ? 'dark' : 'light', false, true, { url: `${origin}/tools/image-converter/?keep=1#t4f-theme=${theme}` });
      expect(dom.window.t4fAppearance.get()).toBe(theme);
      expect(dom.window.localStorage.getItem('t4f.appearance')).toBe(theme);
      expect(dom.window.location.href).toBe(`${origin}/tools/image-converter/?keep=1`);
      dom.window.close();
    }
  });
  it('handles denied storage and preserves unrelated fragments and unknown origins', () => {
    const blocked = page(undefined, true, true, { url: 'https://tool4furry.com/#t4f-theme=light' });
    expect(blocked.window.t4fAppearance.get()).toBe('light');
    expect(blocked.window.location.hash).toBe('');
    blocked.window.close();
    for (const url of ['https://tool4furry.cn/#section', 'https://tool4furry.cn/#t4f-theme=system', 'https://unknown.test/#t4f-theme=light']) {
      const dom = page('dark', false, true, { url });
      expect(dom.window.t4fAppearance.get()).toBe('dark');
      expect(dom.window.location.href).toBe(url);
      dom.window.close();
    }
  });
  it('relays explicit activation only to known origins, leaving the static href clean', () => {
    const dom = page('light', false, false);
    const { window: w } = dom;
    Object.defineProperty(w.document, 'currentScript', { value: w.document.querySelector('script') });
    const assign = vi.fn();
    runInNewContext(source, { document: w.document, window: w, Element: w.Element, Event: w.Event,
      localStorage: w.localStorage, history: w.history, URL, location: { origin: w.location.origin, hash: '', assign } });
    const link = w.document.createElement('a');
    link.dataset.regionLink = '';
    link.href = 'https://tool4furry.com/tools/';
    w.document.body.append(link);
    link.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(assign).toHaveBeenCalledWith('https://tool4furry.com/tools/#t4f-theme=light');
    expect(link.href).toBe('https://tool4furry.com/tools/');
    assign.mockClear();
    delete link.dataset.regionLink;
    link.dataset.languageLink = '';
    link.href = '/en/tools/';
    const local = new w.MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(local);
    expect(assign).not.toHaveBeenCalled();
    expect(local.defaultPrevented).toBe(false);
    link.dataset.regionLink = '';
    link.href = 'https://unknown.test/tools/';
    const activation = new w.MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(activation);
    expect(assign).not.toHaveBeenCalled();
    expect(activation.defaultPrevented).toBe(false);
    w.close();
  });
});

function revealPage({ reduced = false, fail = false, pending = false, reject = false } = {}) {
  let complete, update;
  const finished = new Promise(resolve => { complete = resolve; });
  const skip = vi.fn(complete), animate = vi.fn(() => ({ finished: new Promise(() => {}), cancel: vi.fn() }));
  const start = vi.fn(apply => {
    update = apply;
    if (fail) throw new Error('unsupported snapshot');
    if (!pending) apply();
    return { ready: reject ? Promise.reject(new Error('snapshot rejected')) : Promise.resolve(), updateCallbackDone: Promise.resolve(), finished, skipTransition: skip };
  });
  const dom = page(undefined, false, true, { setup(w) {
    w.matchMedia = () => ({ matches: reduced, addEventListener() {} });
    w.document.startViewTransition = start;
    w.HTMLElement.prototype.animate = animate;
  } });
  dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
  const button = dom.window.document.querySelector('button');
  button.getBoundingClientRect = () => ({ left: 100, top: 20, width: 44, height: 44 });
  return { dom, button, start, animate, skip, complete, update: () => update() };
}

describe('native theme reveal is presentation only', () => {
  it('uses the actual button center and one 420ms reveal, ignoring repeat clicks until completion', async () => {
    const p = revealPage();
    p.button.click(); p.button.click();
    await Promise.resolve();
    expect(p.start).toHaveBeenCalledTimes(1);
    expect(p.dom.window.t4fAppearance.get()).toBe('light');
    expect(p.animate.mock.calls[0][0].clipPath[0]).toBe('circle(0px at 122px 42px)');
    expect(p.animate.mock.calls[0][1]).toMatchObject({ duration: 420, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' });
    p.complete(); await Promise.resolve();
    expect(p.button.hasAttribute('aria-busy')).toBe(false);
    expect(p.dom.window.document.documentElement.dataset.themeTransition).toBeUndefined();
    p.dom.window.close();
  });
  it.each(['resize', 'pagehide', 'pageswap', 'visibilitychange'])('finishes the selected state and unlocks on %s, even before snapshot apply', event => {
    const p = revealPage({ pending: true });
    p.button.click();
    if (event === 'visibilitychange') {
      Object.defineProperty(p.dom.window.document, 'hidden', { value: true });
      p.dom.window.document.dispatchEvent(new p.dom.window.Event(event));
    } else p.dom.window.dispatchEvent(new p.dom.window.Event(event));
    expect(p.dom.window.t4fAppearance.get()).toBe('light');
    expect(p.button.hasAttribute('aria-busy')).toBe(false);
    p.update();
    expect(p.dom.window.t4fAppearance.get()).toBe('light');
    p.dom.window.close();
  });
  it.each([{ reduced: true }, { fail: true }])('falls back without busy state for reduced motion or snapshot failure %j', option => {
    const p = revealPage(option);
    p.button.click();
    expect(p.dom.window.t4fAppearance.get()).toBe('light');
    expect(p.button.hasAttribute('aria-busy')).toBe(false);
    p.dom.window.close();
  });
  it('recovers from asynchronous snapshot rejection without losing the requested state', async () => {
    const p = revealPage({ pending: true, reject: true });
    p.button.click();
    await Promise.resolve(); await Promise.resolve();
    expect(p.dom.window.t4fAppearance.get()).toBe('light');
    expect(p.button.hasAttribute('aria-busy')).toBe(false);
    expect(p.skip).toHaveBeenCalled();
    p.dom.window.close();
  });
  it('lets storage updates cancel a pending reveal and prevents late apply from overwriting them', () => {
    const p = revealPage({ pending: true });
    p.button.click();
    const w = p.dom.window;
    w.localStorage.setItem('t4f.appearance', 'dark');
    w.dispatchEvent(new w.StorageEvent('storage', { key: 't4f.appearance', newValue: 'dark', storageArea: w.localStorage }));
    p.update();
    expect(w.t4fAppearance.get()).toBe('dark');
    expect(w.localStorage.getItem('t4f.appearance')).toBe('dark');
    expect(p.button.hasAttribute('aria-busy')).toBe(false);
    p.dom.window.close();
  });
});
