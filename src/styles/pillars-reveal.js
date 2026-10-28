(() => {
  const root = document.querySelector('[data-home-pillars]');
  if (!root || root.dataset.pillarsEnhanced) return;
  root.dataset.pillarsEnhanced = 'true';
  const items = [...root.querySelectorAll('[data-pillar]')];
  const pending = new Set();
  let observer, motion;
  const cleanup = () => {
    observer?.disconnect();
    motion?.removeEventListener?.('change', preference);
    root.removeEventListener('focusin', focus);
    window.removeEventListener('pagehide', finish);
  };
  const finish = () => {
    for (const item of items) item.dataset.pillarReveal = 'done';
    pending.clear();
    cleanup();
  };
  const preference = () => { if (motion.matches) finish(); };
  const focus = event => {
    const item = event.target.closest('[data-pillar]');
    if (!pending.delete(item)) return;
    item.dataset.pillarReveal = 'done';
    observer.unobserve(item);
    if (!pending.size) cleanup();
  };
  try {
    motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motion.matches || typeof IntersectionObserver !== 'function') return;
    observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting || entry.intersectionRatio < .12 || !pending.delete(entry.target)) continue;
        entry.target.dataset.pillarReveal = 'visible';
        observer.unobserve(entry.target);
      }
      if (!pending.size) cleanup();
    }, { threshold: .12, rootMargin: '0px 0px -32px 0px' });
    for (const item of items) {
      // Restored/anchored content is already readable; only future natural entry animates.
      if (item.getBoundingClientRect().top < window.innerHeight) {
        item.dataset.pillarReveal = 'done';
        continue;
      }
      observer.observe(item);
      pending.add(item);
      item.dataset.pillarReveal = 'pending';
    }
    if (!pending.size) { cleanup(); return; }
    motion.addEventListener('change', preference);
    root.addEventListener('focusin', focus);
    window.addEventListener('pagehide', finish, { once: true });
  } catch {
    // Never leave content concealed after partial initialization or a missing browser API.
    finish();
  }
})();
