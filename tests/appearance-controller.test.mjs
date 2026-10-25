import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';

const source = readFileSync('src/styles/appearance-controller.js', 'utf8');
const html = `<html class="dark-theme root-style unrelated" data-appearance="dark"><head>
<script id="t4f-appearance" data-dark="dark-theme" data-light="light-theme" data-default="dark">${source}</script>
</head><body><button disabled data-appearance-toggle="static" data-light-label="Light" data-dark-label="Dark"></button></body></html>`;

function page(preference, blocked = false, scripts = true) {
  return new JSDOM(html, { url: 'https://tool4furry.cn/', runScripts: scripts ? 'dangerously' : undefined,
    beforeParse(window) {
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
