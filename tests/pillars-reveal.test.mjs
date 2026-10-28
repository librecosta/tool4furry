import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const source = readFileSync('src/styles/pillars-reveal.js', 'utf8');
let dom;
function page({ reduced = false, observer = true, failure = '', tops = [1200, 1200, 1200], scripted = true } = {}) {
  dom = new JSDOM('<section data-home-pillars>' + ['experience', 'safety', 'privacy'].map(id => `<article data-pillar="${id}"><h3>${id}</h3><a href="/tools/">Tools</a></article>`).join('') + '</section>', { runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window, items = [...w.document.querySelectorAll('[data-pillar]')];
  items.forEach((item, i) => { item.getBoundingClientRect = () => ({ top: tops[i] }); });
  const motion = Object.assign(new w.EventTarget(), { matches: reduced });
  w.matchMedia = () => motion;
  let callback;
  const disconnect = vi.fn(), unobserve = vi.fn();
  const observe = vi.fn(() => { if (failure === 'observe' && observe.mock.calls.length === 2) throw Error('Observe failed'); });
  if (observer) w.IntersectionObserver = class {
    constructor(fn) { if (failure === 'constructor') throw Error('Unavailable'); callback = fn; }
    observe = observe; unobserve = unobserve; disconnect = disconnect;
  };
  if (scripted) w.eval(source);
  return { w, items, motion, observe, unobserve, disconnect,
    enter(indices, ratio = .2) { callback?.(indices.map(i => ({ target: items[i], isIntersecting: ratio > 0, intersectionRatio: ratio }))); },
    states() { return items.map(item => item.dataset.pillarReveal); },
  };
}
afterEach(() => dom?.window.close());

describe('one-shot progressive pillar reveal', () => {
  it('arms only future entries, reveals each column once and disconnects after the last one', () => {
    const p = page();
    expect(p.states()).toEqual(['pending', 'pending', 'pending']);
    p.enter([0], .01); expect(p.states()[0]).toBe('pending');
    p.enter([0]); expect(p.states()).toEqual(['visible', 'pending', 'pending']);
    p.enter([0], 0); p.enter([0]); expect(p.unobserve).toHaveBeenCalledTimes(1);
    p.enter([1, 2]); expect(p.states()).toEqual(['visible', 'visible', 'visible']);
    expect(p.disconnect).toHaveBeenCalled();
    p.w.eval(source); expect(p.observe).toHaveBeenCalledTimes(3);
    p.w.document.documentElement.dataset.appearance = 'light';
    p.w.dispatchEvent(new p.w.Event('pageshow')); expect(p.states()).toEqual(['visible', 'visible', 'visible']);
  });
  it.each([{ scripted: false }, { reduced: true }, { observer: false }])('leaves static text and links exposed for %j', options => {
    const p = page(options);
    expect(p.states()).toEqual([undefined, undefined, undefined]);
    expect(p.w.document.querySelectorAll('a[href="/tools/"]')).toHaveLength(3);
    expect(p.observe).not.toHaveBeenCalled();
  });
  it.each(['constructor', 'observe'])('restores every column when initialization fails at %s', failure => {
    const p = page({ failure });
    expect(p.states()).toEqual(['done', 'done', 'done']);
    expect(p.items.every(item => !item.hidden && !item.hasAttribute('aria-hidden'))).toBe(true);
  });
  it('does not replay content already visible or above the restored viewport', () => {
    const p = page({ tops: [-500, 100, 1200] });
    expect(p.states()).toEqual(['done', 'done', 'pending']);
    expect(p.observe).toHaveBeenCalledTimes(1);
  });
  it('reveals pending keyboard targets immediately and settles everything on reduced motion', () => {
    const p = page();
    p.items[1].querySelector('a').focus();
    expect(p.states()).toEqual(['pending', 'done', 'pending']);
    p.motion.matches = true; p.motion.dispatchEvent(new p.w.Event('change'));
    expect(p.states()).toEqual(['done', 'done', 'done']);
    p.enter([0, 2]); expect(p.states()).toEqual(['done', 'done', 'done']);
    expect(p.disconnect).toHaveBeenCalled();
  });
  it('clears pending states and observers on pagehide without rearming after bfcache restore', () => {
    const p = page(); p.enter([0]);
    p.w.dispatchEvent(new p.w.Event('pagehide'));
    expect(p.states()).toEqual(['done', 'done', 'done']);
    p.w.dispatchEvent(new p.w.Event('pageshow')); p.enter([1, 2]);
    expect(p.states()).toEqual(['done', 'done', 'done']);
    expect(p.disconnect).toHaveBeenCalled();
  });
});
