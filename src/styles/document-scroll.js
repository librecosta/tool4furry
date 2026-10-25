// Inlined with the same getScrollMetrics used by the opt-in React ScrollDock.
// Lifecycle adapted from Gopher Atlas 1f730584, apps/web/src/lib/scroll-dock.ts.
// Copyright (c) 2026 DeepFurry, BSD-3-Clause; full notice: /licenses/gopher-atlas.txt.
function mountDocumentDock() {
  const button = document.querySelector('[data-document-dock]');
  if (!button) return;
  const ring = button.querySelector('[data-scroll-progress]');
  const footer = document.querySelector('[data-site-footer]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0, percent = -1;
  const measure = () => {
    const root = document.scrollingElement || document.documentElement;
    return getScrollMetrics(scrollY, root.scrollHeight, root.clientHeight);
  };
  const update = () => {
    frame = 0;
    const metrics = measure();
    if (percent !== metrics.percent) {
      percent = metrics.percent;
      ring.style.strokeDashoffset = String(100 - percent);
      const label = `${button.dataset.label} ${percent}%`;
      button.setAttribute('aria-label', label);
      button.title = label;
    }
    // Yield to footer links and modal surfaces; no collisions or private scroll.
    const visible = metrics.canShow && !(footer && footer.getBoundingClientRect().top < innerHeight) &&
      !document.querySelector('[aria-modal="true"]');
    if (!visible && document.activeElement === button) {
      const main = document.querySelector('#main-content');
      if (main) {
        const previous = main.getAttribute('tabindex');
        main.setAttribute('tabindex', '-1');
        main.focus({ preventScroll: true });
        if (previous === null) main.removeAttribute('tabindex');
        else main.setAttribute('tabindex', previous);
      }
    }
    button.hidden = !visible;
    button.inert = !visible;
    button.setAttribute('aria-hidden', String(!visible));
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
  const up = () => window.scrollTo({ top: measure().stepTarget, behavior: reduced.matches ? 'instant' : 'smooth' });
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : undefined;
  observer?.observe(document.documentElement);
  observer?.observe(document.body);
  const mutations = new MutationObserver(schedule);
  mutations.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-modal'] });
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  window.addEventListener('pageshow', schedule);
  button.addEventListener('click', up);
  update();
  return () => {
    cancelAnimationFrame(frame);
    frame = 0;
    observer?.disconnect();
    mutations.disconnect();
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
    window.removeEventListener('pageshow', schedule);
    button.removeEventListener('click', up);
  };
}
let disposeDock = mountDocumentDock();
window.addEventListener('pagehide', () => { disposeDock?.(); disposeDock = undefined; });
window.addEventListener('pageshow', () => { if (!disposeDock) disposeDock = mountDocumentDock(); });
