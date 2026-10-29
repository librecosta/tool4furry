(() => {
  const root = document.querySelector('[data-home-stories]');
  if (!root || root.dataset.storiesEnhanced) return;
  root.dataset.storiesEnhanced = 'true';
  const groups = [...root.querySelectorAll('[data-home-story]')];
  const pending = new Set();
  let observer, motion;
  const cleanup = () => {
    observer?.disconnect();
    motion?.removeEventListener?.('change', preference);
    root.removeEventListener('focusin', focus);
    window.removeEventListener('pagehide', finish);
  };
  const settle = group => {
    group.dataset.storyReveal = 'done';
    observer?.unobserve(group);
    pending.delete(group);
  };
  const finish = () => {
    groups.forEach(group => { group.dataset.storyReveal = 'done'; });
    pending.clear();
    cleanup();
  };
  const preference = () => { if (motion.matches) finish(); };
  const focus = event => {
    const group = event.target.closest('[data-home-story]');
    if (groups.includes(group)) settle(group);
    if (!pending.size) observer?.disconnect();
  };
  try {
    motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motion.matches || typeof IntersectionObserver !== 'function') return;
    const anchor = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
    const candidates = groups.filter(group => group.getBoundingClientRect().top >= window.innerHeight
      && !group.contains(document.activeElement)
      && !(anchor && (group.contains(anchor) || (group.compareDocumentPosition(anchor) & Node.DOCUMENT_POSITION_FOLLOWING))));
    if (!candidates.length) return;
    observer = new IntersectionObserver(entries => {
      try {
        for (const { target, isIntersecting } of entries) {
          if (!isIntersecting || !pending.has(target)) continue;
          target.dataset.storyReveal = 'visible';
          pending.delete(target);
          observer.unobserve(target);
        }
        if (!pending.size) observer.disconnect();
      } catch { finish(); }
    }, { threshold: 0, rootMargin: '0px 0px -48px 0px' });
    // Only arm after every registration succeeds. Static HTML stays visible on failure.
    candidates.forEach(group => observer.observe(group));
    motion.addEventListener('change', preference);
    root.addEventListener('focusin', focus);
    window.addEventListener('pagehide', finish, { once: true });
    candidates.forEach(group => { pending.add(group); group.dataset.storyReveal = 'pending'; });
  } catch { finish(); }
})();
