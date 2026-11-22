import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { describe, expect, it, vi } from 'vitest';

const metrics = readFileSync('src/ui/scroll-metrics.js', 'utf8').replace('export function ', 'function ');
const source = `(() => {${metrics}\n${readFileSync('src/styles/document-scroll.js', 'utf8')}\n})();`;
function page(reduced = false) {
  const dom = new JSDOM(`<main id="main-content"></main><footer data-site-footer></footer><button data-document-dock data-label="Back to top, current scroll progress" hidden inert aria-hidden="true"><svg>
    ${'<rect data-scroll-segment />'.repeat(24)}
    <g data-scroll-number>${'<use data-scroll-digit />'.repeat(3)}</g>
    ${'<rect data-scroll-particle />'.repeat(7)}
  </svg></button>`, {
    url: 'https://tool4furry.cn/', runScripts: 'outside-only', pretendToBeVisual: true,
  });
  const w = dom.window, root = w.document.documentElement;
  let height = 2500, y = 0, footer = 5000, time = 0, nextFrame = 0;
  const frames = new Map();
  Object.defineProperties(root, { scrollHeight: { get: () => height }, clientHeight: { value: 500 } });
  Object.defineProperty(w, 'scrollY', { get: () => y });
  w.document.querySelector('footer').getBoundingClientRect = () => ({ top: footer });
  const motionPreference = Object.assign(new w.EventTarget(), { matches: reduced });
  w.matchMedia = query => query.includes('reduced-motion') ? motionPreference : Object.assign(new w.EventTarget(), { matches: true });
  vi.spyOn(w.performance, 'now').mockImplementation(() => time);
  w.requestAnimationFrame = vi.fn(callback => { frames.set(++nextFrame, callback); return nextFrame; });
  w.cancelAnimationFrame = vi.fn(id => frames.delete(id));
  w.scrollTo = vi.fn();
  const disconnect = vi.fn();
  w.ResizeObserver = class { observe() {} disconnect = disconnect; };
  w.eval(source);
  const flush = (elapsed = 0) => {
    time += elapsed;
    for (const id of [...frames.keys()]) {
      const callback = frames.get(id);
      frames.delete(id);
      callback?.(time);
    }
  };
  return { dom, w, button: w.document.querySelector('button'), flush, disconnect, motionPreference,
    geometry(next = {}) { y = next.y ?? y; height = next.height ?? height; footer = next.footer ?? footer; w.dispatchEvent(new w.Event('scroll')); flush(); } };
}

describe('static document dock', () => {
  it('keeps top/short pages hidden and inert, batches scroll updates and returns to the top', () => {
    const p = page(true);
    expect(p.button.getAttribute('aria-hidden')).toBe('true');
    expect(p.button.inert).toBe(true);
    p.geometry({ y: 600 });
    expect(p.button.hidden).toBe(false);
    expect(p.button.getAttribute('aria-label')).toBe('Back to top, current scroll progress 30%');
    expect(p.button.querySelectorAll('[data-scroll-segment][data-active]')).toHaveLength(7);
    p.button.click();
    expect(p.w.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'instant' });
    p.geometry({ height: 700 });
    expect(p.button.getAttribute('aria-hidden')).toBe('true');
    p.geometry({ height: 2500, y: 0 });
    expect(p.button.getAttribute('aria-hidden')).toBe('true');
    p.w.requestAnimationFrame.mockClear();
    p.w.dispatchEvent(new p.w.Event('scroll'));
    p.w.dispatchEvent(new p.w.Event('scroll'));
    p.w.dispatchEvent(new p.w.Event('resize'));
    expect(p.w.requestAnimationFrame).toHaveBeenCalledTimes(1);
    p.dom.window.close();
  });
  it('renders centered two- and three-digit pixel values and clears progress after returning to top', () => {
    const p = page();
    for (const [percent, value, active] of [[0, '00', 0], [3, '03', 1], [9, '09', 2], [10, '10', 2], [50, '50', 12], [99, '99', 24], [100, '100', 24], [3, '03', 1], [0, '00', 0]]) {
      p.geometry({ height: 10500, y: percent * 100 });
      const visible = [...p.button.querySelectorAll('[data-scroll-digit]')].filter(digit => digit.getAttribute('display') !== 'none');
      expect(visible.map(digit => digit.getAttribute('href').split('-').at(-1)).join('')).toBe(value);
      expect(p.button.querySelector('[data-scroll-number]').getAttribute('transform')).toBe(`translate(${value.length === 3 ? 11.5 : 17.5} 20.5)`);
      expect(p.button.querySelectorAll('[data-scroll-segment][data-active]')).toHaveLength(active);
      expect(p.button.getAttribute('aria-label')).toBe(`Back to top, current scroll progress ${percent}%`);
      expect(p.button.hasAttribute('title')).toBe(false);
    }
    expect(p.button.getAttribute('aria-hidden')).toBe('true');
    p.dom.window.close();
  });
  it('yields to Footer/modal controls, restores focus when hidden and resumes after bfcache', async () => {
    const p = page();
    p.geometry({ y: 1000 });
    p.button.focus();
    p.geometry({ footer: 200 });
    expect(p.button.hasAttribute('data-scroll-obstructed')).toBe(true);
    expect(p.button.inert).toBe(true);
    const main = p.w.document.activeElement;
    expect(main.tagName).toBe('MAIN');
    expect(main.getAttribute('tabindex')).toBe('-1');
    main.blur();
    expect(main.hasAttribute('tabindex')).toBe(false);
    p.geometry({ footer: 5000 });
    const modal = p.w.document.createElement('div');
    modal.setAttribute('aria-modal', 'true'); p.w.document.body.append(modal);
    await Promise.resolve(); p.flush();
    expect(p.button.getAttribute('aria-hidden')).toBe('true');
    expect(p.button.hasAttribute('data-scroll-obstructed')).toBe(true);
    modal.remove(); await Promise.resolve(); p.flush();
    expect(p.button.getAttribute('aria-hidden')).toBe('false');
    expect(p.button.hasAttribute('data-scroll-obstructed')).toBe(false);
    p.w.dispatchEvent(new p.w.Event('pagehide'));
    expect(p.disconnect).toHaveBeenCalled();
    p.w.scrollTo.mockClear(); p.button.click();
    expect(p.w.scrollTo).not.toHaveBeenCalled();
    p.w.dispatchEvent(new p.w.Event('pageshow'));
    p.button.click();
    p.flush(400);
    expect(p.w.scrollTo).toHaveBeenCalledTimes(1);
    p.dom.window.close();
  });
  it('returns to the top in 400 ms and yields to manual scroll input', () => {
    const p = page();
    p.geometry({ y: 1000 });
    p.button.click();
    p.flush(200);
    expect(p.w.scrollTo).toHaveBeenLastCalledWith({ top: 500, behavior: 'instant' });
    p.flush(200);
    expect(p.w.scrollTo).toHaveBeenLastCalledWith({ top: 0, behavior: 'instant' });
    for (const input of [new p.w.Event('wheel'), new p.w.Event('pointerdown'), new p.w.KeyboardEvent('keydown', { key: 'PageDown' })]) {
      p.button.click();
      p.flush(100);
      p.w.scrollTo.mockClear();
      p.w.dispatchEvent(input);
      p.flush(300);
      expect(p.w.scrollTo).not.toHaveBeenCalled();
    }
    p.dom.window.close();
  });
  it('staggers pixel particles on mouse hover and clears them on leave or reduced motion', () => {
    const p = page();
    p.geometry({ y: 1000 });
    const particles = [...p.button.querySelectorAll('[data-scroll-particle]')];
    const enter = pointerType => Object.assign(new p.w.Event('pointerenter'), { pointerType });
    p.button.dispatchEvent(enter('touch'));
    p.flush(100);
    expect(particles.every(pixel => pixel.style.opacity === '')).toBe(true);
    p.button.dispatchEvent(enter('mouse'));
    p.flush(50);
    expect(Number(particles[0].style.opacity)).toBeGreaterThan(0);
    expect(particles[1].style.opacity).toBe('');
    expect(particles[0].style.transform).toMatch(/translate\(-\d/);
    p.flush(650);
    expect(particles.every(pixel => Number(pixel.style.opacity) > 0)).toBe(true);
    p.button.dispatchEvent(new p.w.Event('pointerleave'));
    expect(particles.every(pixel => pixel.style.opacity === '')).toBe(true);
    p.button.dispatchEvent(enter('mouse'));
    p.flush(50);
    p.motionPreference.matches = true;
    p.motionPreference.dispatchEvent(new p.w.Event('change'));
    p.flush(50);
    expect(particles.every(pixel => pixel.style.opacity === '')).toBe(true);
    p.dom.window.close();
  });
});
