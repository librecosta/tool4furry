import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { describe, expect, it, vi } from 'vitest';

const metrics = readFileSync('src/ui/scroll-metrics.js', 'utf8').replace('export function ', 'function ');
const source = `(() => {${metrics}\n${readFileSync('src/styles/document-scroll.js', 'utf8')}\n})();`;
function page(reduced = false) {
  const dom = new JSDOM('<main id="main-content"></main><footer data-site-footer></footer><button data-document-dock data-label="Progress" hidden inert><svg><rect data-scroll-progress /></svg></button>', {
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
  it('keeps top/short pages hidden and inert, batches scroll updates and steps back by 25% of total distance', () => {
    const p = page(true);
    expect(p.button.hidden).toBe(true);
    expect(p.button.inert).toBe(true);
    p.geometry({ y: 600 });
    expect(p.button.hidden).toBe(false);
    expect(p.button.getAttribute('aria-label')).toBe('Progress 30%');
    expect(p.button.querySelector('rect').style.strokeDashoffset).toBe('70');
    p.button.click();
    expect(p.w.scrollTo).toHaveBeenCalledWith({ top: 100, behavior: 'instant' });
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
  it('yields to Footer/modal controls, restores focus when hidden and resumes after bfcache', async () => {
    const p = page();
    p.geometry({ y: 1000 });
    p.button.click();
    expect(p.w.scrollTo).toHaveBeenCalledWith({ top: 500, behavior: 'smooth' });
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
