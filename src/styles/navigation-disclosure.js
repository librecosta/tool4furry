// Shared progressive enhancement for Astro and React native disclosures.
// Without this script, summary and ordinary catalog links remain usable.
(() => {
  const selector = 'details[data-tool-disclosure]';
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const states = new WeakMap();
  const state = (el) => {
    if (!states.has(el)) states.set(el, { timer: 0, exit: 0, cleanup: null, suppressed: false, inside: false, pointerFocus: false });
    return states.get(el);
  };
  const cancel = (el) => clearTimeout(state(el).timer);
  const cancelExit = (el) => {
    clearTimeout(state(el).exit);
    state(el).cleanup?.();
    state(el).cleanup = null;
  };
  const interactive = (el, enabled) => {
    el.querySelector('summary').setAttribute('aria-expanded', String(enabled));
    const panel = el.querySelector('[data-tool-positioner]');
    panel.toggleAttribute('inert', !enabled);
    panel.setAttribute('aria-hidden', String(!enabled));
  };
  const finish = (el) => {
    cancelExit(el);
    el.open = false;
    delete el.dataset.toolMotion;
  };
  const close = (el, restore = false) => {
    cancel(el);
    if (restore || el.contains(document.activeElement)) el.querySelector('summary').focus();
    if (!el.open || el.dataset.toolMotion === 'closing') return;
    // Keep details rendered for the 420ms exit, but remove its links from
    // pointer, keyboard and accessibility navigation as soon as closing starts.
    interactive(el, false);
    el.dataset.toolMotion = 'closing';
    if (reducedMotion.matches) { finish(el); return; }
    const panel = el.querySelector('[data-tool-panel]');
    const ended = event => {
      if (event.target === panel && event.propertyName === 'mask-size') finish(el);
    };
    panel.addEventListener('transitionend', ended);
    state(el).cleanup = () => panel.removeEventListener('transitionend', ended);
    // Detached islands or interrupted CSS transitions may not emit an end event.
    state(el).exit = setTimeout(() => finish(el), 480);
  };
  const open = (el) => {
    cancel(el);
    cancelExit(el);
    if (!el.isConnected) return;
    document.querySelectorAll(`${selector}[open]`).forEach(other => {
      if (other !== el) close(other);
    });
    if (!el.open) {
      el.dataset.toolMotion = 'opening';
      el.open = true;
      // Establish the masked first frame after native details becomes visible.
      el.querySelector('[data-tool-panel]').getBoundingClientRect();
    }
    delete el.dataset.toolMotion;
    interactive(el, true);
    state(el).suppressed = false;
  };
  const disclosure = (target) => target instanceof Element ? target.closest(selector) : null;
  const finePointer = (event) => event.pointerType !== 'touch' && matchMedia('(hover: hover) and (pointer: fine)').matches;
  document.addEventListener('pointerover', event => {
    const el = disclosure(event.target);
    if (!el || !finePointer(event)) return;
    state(el).inside = true;
    if (el.contains(event.relatedTarget)) return;
    cancel(el);
    if (!state(el).suppressed) state(el).timer = setTimeout(() => open(el), 120);
  });
  document.addEventListener('pointerout', event => {
    const el = disclosure(event.target);
    if (!el || !finePointer(event) || el.contains(event.relatedTarget)) return;
    state(el).inside = false;
    cancel(el);
    state(el).suppressed = false;
    state(el).timer = setTimeout(() => {
      if (state(el).inside) return;
      // Keyboard focus keeps the links usable. A pointer-selected filter should
      // not pin the drawer open after the pointer has genuinely left its box.
      if (state(el).pointerFocus || !el.contains(document.activeElement) || document.activeElement === el.querySelector('summary')) close(el);
    }, 180);
  });
  document.addEventListener('click', event => {
    const el = disclosure(event.target);
    const filter = event.target instanceof Element ? event.target.closest('[data-tool-filter]') : null;
    if (el && filter && el.contains(filter)) {
      const group = filter.dataset.toolFilter;
      if (!Array.from(el.querySelectorAll('[data-tool-group]')).some(panel => panel.dataset.toolGroup === group)) return;
      cancel(el);
      el.querySelectorAll('[data-tool-filter]').forEach(button => {
        button.setAttribute('aria-pressed', String(button === filter));
      });
      el.querySelectorAll('[data-tool-group]').forEach(panel => {
        panel.hidden = panel.dataset.toolGroup !== group;
        if (!panel.hidden) panel.scrollTop = 0;
      });
      return;
    }
    const summary = event.target instanceof Element ? event.target.closest('summary') : null;
    if (!el || summary?.parentElement !== el) return;
    event.preventDefault();
    cancel(el);
    if (el.open && el.dataset.toolMotion !== 'closing') { state(el).suppressed = true; close(el); }
    else open(el);
  });
  document.addEventListener('pointerdown', event => {
    const target = disclosure(event.target);
    if (target) state(target).pointerFocus = true;
    document.querySelectorAll(`${selector}[open]`).forEach(el => {
      if (!el.contains(event.target)) close(el);
    });
  });
  document.addEventListener('keydown', event => {
    const target = disclosure(event.target);
    if (target) state(target).pointerFocus = false;
    if (event.key !== 'Escape') return;
    const opened = document.querySelector(`${selector}[open]`);
    if (opened) { event.preventDefault(); state(opened).suppressed = true; close(opened, true); }
  });
  document.addEventListener('focusout', event => {
    const el = disclosure(event.target);
    if (el && !el.contains(event.relatedTarget)) close(el);
  });
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches)
      document.querySelectorAll(`${selector}[data-tool-motion="closing"]`).forEach(finish);
  });
})();
