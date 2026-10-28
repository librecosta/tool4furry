import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const source = readFileSync('src/styles/pillars-reveal.js', 'utf8');
let dom;
function page({ reduced = false, observer = true, failure = '', top = 1200, scripted = true, hash = '' } = {}) {
  dom = new JSDOM('<section data-home-pillars id="pillars-heading">' + ['experience', 'safety', 'privacy'].map(id => `<article data-pillar="${id}"><h3 id="pillar-${id}">${id}</h3><a href="/tools/">Tools</a></article>`).join('') + '</section>', { runScripts: 'outside-only', pretendToBeVisual: true, url: `https://tool4furry.test/${hash}` });
  const w = dom.window, root = w.document.querySelector('[data-home-pillars]'), items = [...root.querySelectorAll('[data-pillar]')];
  root.getBoundingClientRect = () => ({ top });
  const motion = Object.assign(new w.EventTarget(), { matches: reduced });
  w.matchMedia = () => motion;
  let callback, options;
  const disconnect = vi.fn();
  const observe = vi.fn(() => { if (failure === 'observe') throw Error('Observe failed'); });
  if (observer) w.IntersectionObserver = class {
    constructor(fn, config) { if (failure === 'constructor') throw Error('Unavailable'); callback = fn; options = config; }
    observe = observe; disconnect = disconnect;
  };
  if (scripted) w.eval(source);
  return { w, root, items, motion, observe, disconnect, options,
    enter(intersecting = true, target = root) { callback?.([{ target, isIntersecting: intersecting }]); },
    state() { return root.dataset.pillarReveal; },
  };
}

afterEach(() => dom?.window.close());

describe('one-shot grouped pillar reveal', () => {
  it('observes only the complete group, starts one timeline and disconnects at first entry', () => {
    const p = page();
    expect(p.state()).toBe('pending');
    expect(p.observe).toHaveBeenCalledExactlyOnceWith(p.root);
    expect(p.options).toEqual({ threshold: 0, rootMargin: '0px 0px -64px 0px' });
    expect(p.items.every(item => !item.hasAttribute('data-pillar-reveal'))).toBe(true);
    p.enter(false); p.enter(true, p.items[0]); expect(p.state()).toBe('pending');
    p.enter(); expect(p.state()).toBe('visible');
    expect(p.disconnect).toHaveBeenCalledTimes(1);
    p.enter(false); p.enter(); expect(p.disconnect).toHaveBeenCalledTimes(1);
    p.w.eval(source); expect(p.observe).toHaveBeenCalledTimes(1);
    p.w.document.documentElement.dataset.appearance = 'light';
    p.w.dispatchEvent(new p.w.Event('pageshow')); expect(p.state()).toBe('visible');
  });
  it.each([{ scripted: false }, { reduced: true }, { observer: false }])('leaves static text and links exposed for %j', options => {
    const p = page(options);
    expect(p.state()).toBeUndefined();
    expect(p.root.querySelectorAll('a[href="/tools/"]')).toHaveLength(3);
    expect(p.observe).not.toHaveBeenCalled();
  });
  it.each(['constructor', 'observe'])('restores the whole group when initialization fails at %s', failure => {
    const p = page({ failure });
    expect(p.state()).toBe('done');
    expect(p.items.every(item => !item.hidden && !item.hasAttribute('aria-hidden'))).toBe(true);
  });
  it.each([-500, 100])('does not replay a group already visible or above the restored viewport (%i)', top => {
    const p = page({ top });
    expect(p.state()).toBeUndefined();
    expect(p.observe).not.toHaveBeenCalled();
  });
  it.each(['#pillars-heading', '#pillar-privacy'])('leaves an initial anchor visible before the browser applies its scroll (%s)', hash => {
    const p = page({ hash });
    expect(p.state()).toBeUndefined();
    expect(p.observe).not.toHaveBeenCalled();
  });
  it('reveals the whole group immediately when any pending link receives keyboard focus', () => {
    const p = page();
    p.items[1].querySelector('a').focus();
    expect(p.state()).toBe('done');
    p.enter(); expect(p.state()).toBe('done');
    expect(p.disconnect).toHaveBeenCalled();
  });
  it('settles the whole group on reduced motion without rearming or accepting a queued callback', () => {
    const p = page();
    p.motion.matches = true; p.motion.dispatchEvent(new p.w.Event('change'));
    expect(p.state()).toBe('done');
    p.motion.matches = false; p.motion.dispatchEvent(new p.w.Event('change'));
    p.enter(); expect(p.state()).toBe('done');
    expect(p.disconnect).toHaveBeenCalled();
  });
  it('clears pending state and observer on pagehide without rearming after bfcache restore', () => {
    const p = page();
    p.w.dispatchEvent(new p.w.Event('pagehide'));
    expect(p.state()).toBe('done');
    p.w.dispatchEvent(new p.w.Event('pageshow')); p.enter();
    expect(p.state()).toBe('done');
    expect(p.disconnect).toHaveBeenCalled();
  });
});
