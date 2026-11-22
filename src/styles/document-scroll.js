// Inlined with the same getScrollMetrics used by the opt-in React ScrollDock.
// Lifecycle adapted from Gopher Atlas 1f730584, apps/web/src/lib/scroll-dock.ts.
// Copyright (c) 2026 DeepFurry, BSD-3-Clause; full notice: /licenses/gopher-atlas.txt.
// Motion adapted from TuneShape 06c1fd3, effects/src/pixel-scroll-orb.ts and PixelScrollOrbPreview.tsx.
// Copyright (c) 2026 TuneShape contributors, MIT; full notice: /licenses/tuneshape.txt.
const particleAnchors = [
  { x: -6, y: 47, size: 2, duration: 1800, delay: 0, rise: 14, opacity: .25 },
  { x: 60, y: 43, size: 3, duration: 2400, delay: 90, rise: 22, opacity: .5 },
  { x: -7, y: 23, size: 4, duration: 2800, delay: 275, rise: 18, opacity: .42 },
  { x: 61, y: 18, size: 2, duration: 1900, delay: 440, rise: 16, opacity: .26 },
  { x: 10, y: -4, size: 2, duration: 2200, delay: 180, rise: 14, opacity: .35 },
  { x: 43, y: -5, size: 3, duration: 2600, delay: 650, rise: 20, opacity: .55 },
  { x: -1, y: 61, size: 2, duration: 2100, delay: 520, rise: 16, opacity: .3 },
];

function placeParticle(element, anchor) {
  const centerX = anchor.x + anchor.size / 2;
  const centerY = anchor.y + anchor.size / 2;
  const dx = centerX - 28;
  const dy = centerY - 28;
  const radius = Math.hypot(dx, dy);
  const along = (Math.random() < .5 ? -1 : 1) * (2 + Math.floor(Math.random() * 3));
  const outward = Math.floor(Math.random() * 3);
  const sizeRoll = Math.random();
  const size = sizeRoll < .55 ? 2 : sizeRoll < .88 ? 3 : 4;
  element.setAttribute('x', Math.round(centerX - size / 2 + (dx * outward - dy * along) / radius));
  element.setAttribute('y', Math.round(centerY - size / 2 + (dy * outward + dx * along) / radius));
  element.setAttribute('width', size);
  element.setAttribute('height', size);
  return Math.sign(dx) * (2 + Math.floor(Math.random() * 2));
}

function mountOrbParticles(button, reduced) {
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const particles = [...button.querySelectorAll('[data-scroll-particle]')].map((element, index) => ({
    element, anchor: particleAnchors[index], cycle: -1, drift: 0,
  }));
  let frame = 0;
  let start = 0;
  const draw = (now) => {
    for (const particle of particles) {
      const { element, anchor } = particle;
      const elapsed = now - start - anchor.delay;
      if (elapsed < 0) continue;
      const cycle = Math.floor(elapsed / anchor.duration);
      if (cycle !== particle.cycle) {
        particle.cycle = cycle;
        particle.drift = placeParticle(element, anchor);
      }
      const phase = elapsed % anchor.duration / anchor.duration;
      const travel = 1 - (1 - phase) ** 2;
      const opacity = anchor.opacity * Math.min(phase * anchor.duration / 100, 1, (1 - phase) / .88);
      element.style.transform = `translate(${particle.drift * travel}px, ${-anchor.rise * travel}px)`;
      element.style.opacity = String(opacity);
    }
    frame = requestAnimationFrame(draw);
  };
  const startParticles = (event) => {
    if (frame || button.inert || reduced.matches || !finePointer.matches || event.pointerType !== 'mouse') return;
    start = performance.now();
    frame = requestAnimationFrame(draw);
  };
  const stop = () => {
    if (!frame) return;
    cancelAnimationFrame(frame);
    frame = 0;
    for (const particle of particles) {
      particle.cycle = -1;
      particle.element.style.removeProperty('opacity');
      particle.element.style.removeProperty('transform');
    }
  };
  button.addEventListener('pointerenter', startParticles);
  button.addEventListener('pointerleave', stop);
  finePointer.addEventListener('change', stop);
  return {
    stop,
    dispose() {
      stop();
      button.removeEventListener('pointerenter', startParticles);
      button.removeEventListener('pointerleave', stop);
      finePointer.removeEventListener('change', stop);
    },
  };
}

const scrollKeys = ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '];

function mountDocumentDock() {
  const button = document.querySelector('[data-document-dock]');
  if (!button) return;
  const segments = [...button.querySelectorAll('[data-scroll-segment]')];
  const number = button.querySelector('[data-scroll-number]');
  const digits = [...button.querySelectorAll('[data-scroll-digit]')];
  const footer = document.querySelector('[data-site-footer]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const particles = mountOrbParticles(button, reduced);
  let frame = 0, percent = -1;
  let returnFrame = 0;
  const measure = () => {
    const root = document.scrollingElement || document.documentElement;
    return getScrollMetrics(scrollY, root.scrollHeight, root.clientHeight);
  };
  const update = () => {
    frame = 0;
    const metrics = measure();
    if (percent !== metrics.percent) {
      percent = metrics.percent;
      const active = Math.round(percent * segments.length / 100);
      segments.forEach((segment, index) => segment.toggleAttribute('data-active', index < active));
      const value = String(percent).padStart(2, '0');
      number.setAttribute('transform', `translate(${(56 - (value.length * 12 - 3)) / 2} 20.5)`);
      digits.forEach((digit, index) => {
        digit.setAttribute('display', index < value.length ? 'inline' : 'none');
        if (index < value.length) digit.setAttribute('href', `#t4f-scroll-digit-${value[index]}`);
      });
      const label = `${button.dataset.label} ${percent}%`;
      button.setAttribute('aria-label', label);
    }
    // Yield to footer links and modal surfaces; no collisions or private scroll.
    const obstructed = Boolean((footer && footer.getBoundingClientRect().top < innerHeight) ||
      document.querySelector('[aria-modal="true"]'));
    const visible = metrics.canShow && !obstructed;
    if (!visible && document.activeElement === button) {
      const main = document.querySelector('#main-content');
      if (main) {
        if (!main.hasAttribute('tabindex')) {
          main.setAttribute('tabindex', '-1');
          main.addEventListener('blur', () => main.removeAttribute('tabindex'), { once: true });
        }
        main.focus({ preventScroll: true });
      }
    }
    button.toggleAttribute('data-scroll-obstructed', obstructed);
    if (button.inert === !visible) return;
    if (!visible) particles.stop();
    // Keep the SVG painted through fade-out while removing interaction immediately.
    if (visible) button.hidden = false;
    button.inert = !visible;
    button.setAttribute('aria-hidden', String(!visible));
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
  const stopReturn = () => {
    if (returnFrame) cancelAnimationFrame(returnFrame);
    returnFrame = 0;
  };
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'instant' });
  const up = () => {
    stopReturn();
    if (reduced.matches) {
      scrollToTop();
      return;
    }
    const { top } = measure();
    const start = performance.now();
    const step = (now) => {
      const progress = Math.min((now - start) / 400, 1);
      window.scrollTo({ top: top * (1 - progress), behavior: 'instant' });
      returnFrame = progress < 1 ? requestAnimationFrame(step) : 0;
    };
    returnFrame = requestAnimationFrame(step);
  };
  const onScrollKey = (event) => {
    if (scrollKeys.includes(event.key)) stopReturn();
  };
  const onMotionChange = () => {
    if (!reduced.matches) return;
    particles.stop();
    if (returnFrame) {
      stopReturn();
      scrollToTop();
    }
  };
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : undefined;
  observer?.observe(document.documentElement);
  observer?.observe(document.body);
  const mutations = new MutationObserver(schedule);
  mutations.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-modal'] });
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  window.addEventListener('pageshow', schedule);
  window.addEventListener('wheel', stopReturn, { passive: true });
  window.addEventListener('pointerdown', stopReturn, { passive: true });
  window.addEventListener('keydown', onScrollKey);
  reduced.addEventListener('change', onMotionChange);
  button.addEventListener('click', up);
  update();
  return () => {
    cancelAnimationFrame(frame);
    frame = 0;
    observer?.disconnect();
    mutations.disconnect();
    particles.dispose();
    stopReturn();
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
    window.removeEventListener('pageshow', schedule);
    window.removeEventListener('wheel', stopReturn);
    window.removeEventListener('pointerdown', stopReturn);
    window.removeEventListener('keydown', onScrollKey);
    reduced.removeEventListener('change', onMotionChange);
    button.removeEventListener('click', up);
  };
}
let disposeDock = mountDocumentDock();
window.addEventListener('pagehide', () => { disposeDock?.(); disposeDock = undefined; });
window.addEventListener('pageshow', () => { if (!disposeDock) disposeDock = mountDocumentDock(); });
