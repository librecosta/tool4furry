import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const source = readFileSync('src/styles/principles-reveal.js', 'utf8');
let dom;
function page({ top = 1200, reduced = false, observer = true, failure = '', scripted = true, hash = '', focused = false } = {}) {
  dom = new JSDOM('<section data-home-section="principles"><h2 id="principles-heading">Technology &amp; Engineering</h2><p>Current foundation</p><p>Future exploration</p><a href="https://github.com/librecosta/tool4furry">View source code</a></section><footer id="footer"></footer>', { runScripts: 'outside-only', pretendToBeVisual: true, url: `https://tool4furry.test/${hash}` });
  const w = dom.window, root = w.document.querySelector('section');
  root.getBoundingClientRect = () => ({ top });
  if (focused) root.querySelector('a').focus();
  const motion = Object.assign(new w.EventTarget(), { matches: reduced });
  w.matchMedia = () => { if (failure === 'media') throw Error('Unavailable'); return motion; };
  let callback, options;
  const disconnect = vi.fn();
  const observe = vi.fn(() => { if (failure === 'observe') throw Error('Registration failed'); });
  if (observer) w.IntersectionObserver = class {
    constructor(fn, config) { if (failure === 'constructor') throw Error('Unavailable'); callback = fn; options = config; }
    observe = observe; disconnect = disconnect;
  };
  if (scripted) w.eval(source);
  return { w, root, motion, observe, disconnect, options,
    enter(isIntersecting = true) { callback?.([{ target: root, isIntersecting }]); },
    state() { return root.dataset.principlesReveal; },
  };
}
afterEach(() => dom?.window.close());

describe('one-shot technology editorial reveal', () => {
  it('arms only after registration, enters once and does not replay after scrolling, resize or theme changes', () => {
    const p = page();
    expect(p.observe).toHaveBeenCalledExactlyOnceWith(p.root);
    expect(p.options).toEqual({ threshold: 0, rootMargin: '0px 0px -48px 0px' });
    expect(p.state()).toBe('pending');
    p.enter(false); expect(p.state()).toBe('pending');
    p.enter(); expect(p.state()).toBe('visible');
    expect(p.disconnect).toHaveBeenCalledTimes(1);
    p.enter(false); p.enter(); p.w.eval(source);
    p.w.dispatchEvent(new p.w.Event('resize'));
    p.w.document.documentElement.dataset.appearance = 'light';
    expect(p.state()).toBe('visible');
    expect(p.observe).toHaveBeenCalledTimes(1);
    expect(p.disconnect).toHaveBeenCalledTimes(1);
  });
  it.each([{ scripted: false }, { reduced: true }, { observer: false }, { top: 200 }, { top: -100 }, { focused: true }, { hash: '#principles-heading' }, { hash: '#footer' }])('leaves static, restored, anchored or reduced content immediately readable for %j', options => {
    const p = page(options);
    expect(p.state()).toBeUndefined();
    expect(p.observe).not.toHaveBeenCalled();
    expect(p.root.querySelectorAll('a[href]')).toHaveLength(1);
    expect(p.root.querySelector('[hidden], [inert]')).toBeNull();
  });
  it.each(['media', 'constructor', 'observe'])('restores content after initialization fails at %s', failure => {
    const p = page({ failure });
    expect(p.state()).toBe('done');
    p.root.querySelector('a').focus();
    expect(p.state()).toBe('done');
  });
  it.each([false, true])('settles immediately on keyboard focus, including mid-reveal (%s)', entered => {
    const p = page();
    if (entered) p.enter();
    p.root.querySelector('a').focus();
    expect(p.state()).toBe('done');
    p.enter(); expect(p.state()).toBe('done');
    expect(p.disconnect).toHaveBeenCalled();
  });
  it('settles on a Reduced Motion change, removes its listener and never rearms', () => {
    const p = page();
    p.enter();
    p.motion.matches = true; p.motion.dispatchEvent(new p.w.Event('change'));
    expect(p.state()).toBe('done');
    p.motion.matches = false; p.motion.dispatchEvent(new p.w.Event('change'));
    p.enter(); expect(p.state()).toBe('done');
    expect(p.disconnect).toHaveBeenCalled();
  });
  it('settles on pagehide so bfcache restoration and queued callbacks cannot replay it', () => {
    const p = page();
    p.w.dispatchEvent(new p.w.Event('pagehide'));
    p.w.dispatchEvent(new p.w.Event('pageshow')); p.enter();
    expect(p.state()).toBe('done');
    expect(p.disconnect).toHaveBeenCalled();
  });
});
