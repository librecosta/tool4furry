import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const source = readFileSync('src/styles/stories-reveal.js', 'utf8');
let dom;
function page({ tops = [1200, 1600], reduced = false, observer = true, failure = '', scripted = true, hash = '' } = {}) {
  dom = new JSDOM('<div data-home-stories>' + ['feedback', 'collaboration'].map(id => `<section data-home-story="${id}"><h2 id="story-${id}">${id}</h2><p>Story text</p><a href="mailto:contact@librecosta.com">Contact</a><img alt="" draggable="false"></section>`).join('') + '</div>', { runScripts: 'outside-only', pretendToBeVisual: true, url: `https://tool4furry.test/${hash}` });
  const w = dom.window, root = w.document.querySelector('[data-home-stories]'), groups = [...root.children];
  groups.forEach((group, i) => { group.getBoundingClientRect = () => ({ top: tops[i] }); });
  const motion = Object.assign(new w.EventTarget(), { matches: reduced });
  w.matchMedia = () => { if (failure === 'media') throw Error('Unavailable'); return motion; };
  let callback, options;
  const disconnect = vi.fn(), unobserve = vi.fn();
  const observe = vi.fn(group => { if (failure === 'observe' && group === groups[1]) throw Error('Partial registration'); });
  if (observer) w.IntersectionObserver = class {
    constructor(fn, config) { if (failure === 'constructor') throw Error('Unavailable'); callback = fn; options = config; }
    observe = observe; unobserve = unobserve; disconnect = disconnect;
  };
  if (scripted) w.eval(source);
  return { w, root, groups, motion, observe, unobserve, disconnect, options,
    enter(index, isIntersecting = true) { callback?.([{ target: groups[index], isIntersecting }]); },
    states() { return groups.map(group => group.dataset.storyReveal); },
  };
}
afterEach(() => dom?.window.close());

describe('independent one-shot editorial story reveal', () => {
  it('uses one observer for two groups, revealing and unobserving each independently', () => {
    const p = page();
    expect(p.states()).toEqual(['pending', 'pending']);
    expect(p.observe.mock.calls.map(([group]) => group)).toEqual(p.groups);
    expect(p.options).toEqual({ threshold: 0, rootMargin: '0px 0px -48px 0px' });
    p.enter(0, false); expect(p.states()).toEqual(['pending', 'pending']);
    p.enter(0); expect(p.states()).toEqual(['visible', 'pending']);
    expect(p.unobserve).toHaveBeenCalledExactlyOnceWith(p.groups[0]);
    expect(p.disconnect).not.toHaveBeenCalled();
    p.enter(1); expect(p.states()).toEqual(['visible', 'visible']);
    expect(p.disconnect).toHaveBeenCalledTimes(1);
    p.enter(0); p.w.eval(source);
    p.w.dispatchEvent(new p.w.Event('resize'));
    p.w.document.documentElement.dataset.appearance = 'light';
    expect(p.states()).toEqual(['visible', 'visible']);
    expect(p.observe).toHaveBeenCalledTimes(2);
  });
  it.each([{ scripted: false }, { reduced: true }, { observer: false }])('keeps static content readable for %j', options => {
    const p = page(options);
    expect(p.states()).toEqual([undefined, undefined]);
    expect(p.observe).not.toHaveBeenCalled();
    expect(p.root.querySelectorAll('a[href]')).toHaveLength(2);
  });
  it.each(['media', 'constructor', 'observe'])('settles all content after initialization fails at %s', failure => {
    const p = page({ failure });
    expect(p.states()).toEqual(['done', 'done']);
    expect(p.root.querySelectorAll('[hidden], [inert]')).toHaveLength(0);
  });
  it('does not conceal content already visible or above the restored viewport', () => {
    const p = page({ tops: [-200, 1600] });
    expect(p.states()).toEqual([undefined, 'pending']);
    expect(p.observe).toHaveBeenCalledExactlyOnceWith(p.groups[1]);
  });
  it('keeps an initial anchor and preceding story visible before native scroll restoration', () => {
    const p = page({ hash: '#story-collaboration' });
    expect(p.states()).toEqual([undefined, undefined]);
    expect(p.observe).not.toHaveBeenCalled();
  });
  it('settles just the focused story immediately, including during its reveal', () => {
    const p = page();
    p.groups[0].querySelector('a').focus();
    expect(p.states()).toEqual(['done', 'pending']);
    p.enter(0); expect(p.states()[0]).toBe('done');
    p.enter(1); expect(p.states()[1]).toBe('visible');
    p.groups[1].querySelector('a').focus();
    expect(p.states()).toEqual(['done', 'done']);
  });
  it('settles and cleans up on Reduced Motion without rearming later', () => {
    const p = page();
    p.enter(0);
    p.motion.matches = true; p.motion.dispatchEvent(new p.w.Event('change'));
    expect(p.states()).toEqual(['done', 'done']);
    p.motion.matches = false; p.motion.dispatchEvent(new p.w.Event('change'));
    p.enter(1); expect(p.states()).toEqual(['done', 'done']);
    expect(p.disconnect).toHaveBeenCalled();
  });
  it('cleans up on pagehide and never replays after bfcache restoration or queued callbacks', () => {
    const p = page();
    p.w.dispatchEvent(new p.w.Event('pagehide'));
    expect(p.states()).toEqual(['done', 'done']);
    p.w.dispatchEvent(new p.w.Event('pageshow')); p.enter(0); p.enter(1);
    expect(p.states()).toEqual(['done', 'done']);
    expect(p.disconnect).toHaveBeenCalled();
  });
});
