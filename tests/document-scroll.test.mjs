import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { describe, expect, it, vi } from 'vitest';

const metrics = readFileSync('src/ui/scroll-metrics.js', 'utf8').replace('export function ', 'function ');
const source = `(() => {${metrics}\n${readFileSync('src/styles/document-scroll.js', 'utf8')}\n})();`;
function page(reduced = false) {
  const dom = new JSDOM(`<main id="main-content"></main><footer data-site-footer></footer><button data-document-dock data-label="Back to top, current scroll progress" hidden inert><svg>
    ${'<rect data-scroll-segment />'.repeat(24)}
    <g data-scroll-number>${'<use data-scroll-digit />'.repeat(3)}</g>
  </svg></button>`, {
    url: 'https://tool4furry.cn/', runScripts: 'outside-only', pretendToBeVisual: true,
  });
  const w = dom.window, root = w.document.documentElement;
  let height = 2500, y = 0, footer = 5000, frame;
  Object.defineProperties(root, { scrollHeight: { get: () => height }, clientHeight: { value: 500 } });
  Object.defineProperty(w, 'scrollY', { get: () => y });
  w.document.querySelector('footer').getBoundingClientRect = () => ({ top: footer });
  w.matchMedia = () => ({ matches: reduced });
  w.requestAnimationFrame = vi.fn(callback => { frame = callback; return 1; });
  w.cancelAnimationFrame = vi.fn(() => { frame = undefined; });
  w.scrollTo = vi.fn();
  const disconnect = vi.fn();
  w.ResizeObserver = class { observe() {} disconnect = disconnect; };
  w.eval(source);
  const flush = () => { const callback = frame; frame = undefined; callback?.(); };
  return { dom, w, button: w.document.querySelector('button'), flush, disconnect,
    geometry(next = {}) { y = next.y ?? y; height = next.height ?? height; footer = next.footer ?? footer; w.dispatchEvent(new w.Event('scroll')); flush(); } };
}

describe('static document dock', () => {
  it('keeps top/short pages hidden and inert, batches scroll updates and returns to the top', () => {
    const p = page(true);
    expect(p.button.hidden).toBe(true);
    expect(p.button.inert).toBe(true);
    p.geometry({ y: 600 });
    expect(p.button.hidden).toBe(false);
    expect(p.button.getAttribute('aria-label')).toBe('Back to top, current scroll progress 30%');
    expect(p.button.querySelectorAll('[data-scroll-segment][data-active]')).toHaveLength(7);
    p.button.click();
    expect(p.w.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'instant' });
    p.geometry({ height: 700 });
    expect(p.button.hidden).toBe(true);
    p.geometry({ height: 2500, y: 0 });
    expect(p.button.hidden).toBe(true);
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
    expect(p.button.hidden).toBe(true);
    p.dom.window.close();
  });
  it('yields to Footer/modal controls, restores focus when hidden and resumes after bfcache', async () => {
    const p = page();
    p.geometry({ y: 1000 });
    p.button.click();
    expect(p.w.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    p.button.focus();
    p.geometry({ footer: 200 });
    expect(p.button.hidden).toBe(true);
    expect(p.w.document.activeElement.tagName).toBe('MAIN');
    p.geometry({ footer: 5000 });
    const modal = p.w.document.createElement('div');
    modal.setAttribute('aria-modal', 'true'); p.w.document.body.append(modal);
    await Promise.resolve(); p.flush();
    expect(p.button.hidden).toBe(true);
    modal.remove(); await Promise.resolve(); p.flush();
    expect(p.button.hidden).toBe(false);
    p.w.dispatchEvent(new p.w.Event('pagehide'));
    expect(p.disconnect).toHaveBeenCalled();
    p.w.scrollTo.mockClear(); p.button.click();
    expect(p.w.scrollTo).not.toHaveBeenCalled();
    p.w.dispatchEvent(new p.w.Event('pageshow'));
    p.button.click();
    expect(p.w.scrollTo).toHaveBeenCalledTimes(1);
    p.dom.window.close();
  });
});
