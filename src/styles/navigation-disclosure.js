// Shared progressive enhancement for Astro and React native disclosures.
// Without this script, summary and ordinary catalog links remain usable.
(() => {
  const selector = 'details[data-tool-disclosure]';
  const states = new WeakMap();
  const state = (el) => {
    if (!states.has(el)) states.set(el, { timer: 0, suppressed: false });
    return states.get(el);
  };
  const cancel = (el) => clearTimeout(state(el).timer);
  const close = (el, restore = false) => {
    cancel(el);
    el.open = false;
    if (restore || el.contains(document.activeElement)) el.querySelector('summary').focus();
  };
  const open = (el) => {
    cancel(el);
    document.querySelectorAll(`${selector}[open]`).forEach(other => {
      if (other !== el) close(other);
    });
    el.open = true;
  };
  const disclosure = (target) => target instanceof Element ? target.closest(selector) : null;
  const finePointer = (event) => event.pointerType !== 'touch' && matchMedia('(hover: hover) and (pointer: fine)').matches;
  document.addEventListener('pointerover', event => {
    const el = disclosure(event.target);
    if (!el || !finePointer(event) || el.contains(event.relatedTarget)) return;
    cancel(el);
    if (!state(el).suppressed) state(el).timer = setTimeout(() => open(el), 120);
  });
  document.addEventListener('pointerout', event => {
    const el = disclosure(event.target);
    if (!el || !finePointer(event) || el.contains(event.relatedTarget)) return;
    cancel(el);
    state(el).suppressed = false;
    state(el).timer = setTimeout(() => {
      if (!el.contains(document.activeElement) || document.activeElement === el.querySelector('summary')) close(el);
    }, 180);
  });
  document.addEventListener('click', event => {
    const el = disclosure(event.target);
    const summary = event.target instanceof Element ? event.target.closest('summary') : null;
    if (!el || summary?.parentElement !== el) return;
    event.preventDefault();
    cancel(el);
    if (el.open) { state(el).suppressed = true; close(el); }
    else open(el);
  });
  document.addEventListener('pointerdown', event => {
    document.querySelectorAll(`${selector}[open]`).forEach(el => {
      if (!el.contains(event.target)) close(el);
    });
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const opened = document.querySelector(`${selector}[open]`);
    if (opened) { event.preventDefault(); state(opened).suppressed = true; close(opened, true); }
  });
  document.addEventListener('focusout', event => {
    const el = disclosure(event.target);
    if (el && !el.contains(event.relatedTarget)) close(el);
  });
})();
