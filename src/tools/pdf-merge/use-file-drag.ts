import { useEffect, useRef, useState, type PointerEvent, type TouchEvent, type RefObject } from 'react';

type Position = { clientY: number; clientX: number };
type Drag = { id: string; boundary: number };

/** A vertical insertion gesture only. The parent rows remain the sole order;
 * touch keeps native scrolling until a stationary long press activates sorting. */
export function useFileDrag(host: RefObject<HTMLUListElement | null>, ids: readonly string[], disabled: boolean,
  move: (id: string, index: number) => void) {
  const [drag, setDrag] = useState<Drag>();
  const latest = useRef({ ids, disabled, move }); latest.current = { ids, disabled, move };
  const cleanup = useRef<(() => void) | undefined>(undefined);
  const suppressClick = useRef(0);
  const cancel = () => { cleanup.current?.(); cleanup.current = undefined; setDrag(undefined); };
  const orderKey = ids.join('|');
  useEffect(() => { cancel(); }, [orderKey, disabled]);
  useEffect(() => () => { cleanup.current?.(); cleanup.current = undefined; }, []);

  const start = (id: string, point: Position, element: HTMLElement, touch: boolean, pointerId?: number, touchId?: number) => {
    if (latest.current.disabled) return;
    cancel();
    const origin = { x: point.clientX, y: point.clientY };
    let y = point.clientY, active = false, boundary = -1, frame = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const hit = () => {
      const nodes = [...(host.current?.querySelectorAll<HTMLElement>('[data-pdf-file-id]') ?? [])];
      const at = nodes.findIndex(node => { const r = node.getBoundingClientRect(); return y < r.top + r.height / 2; });
      const next = at < 0 ? nodes.length : at;
      if (next !== boundary) { boundary = next; setDrag({ id, boundary }); }
    };
    const scroll = () => {
      if (!active || latest.current.disabled) return;
      const delta = y < 48 ? -Math.min(18, (48 - y) / 3) : y > window.innerHeight - 48 ? Math.min(18, (y - window.innerHeight + 48) / 3) : 0;
      if (delta) { window.scrollBy(0, delta); hit(); }
      frame = requestAnimationFrame(scroll);
    };
    const activate = () => {
      if (latest.current.disabled || !element.isConnected) { cancel(); return; }
      active = true;
      element.querySelector<HTMLElement>('[data-pdf-drag-handle]')?.focus({ preventScroll: true });
      if (pointerId !== undefined) element.setPointerCapture?.(pointerId);
      hit(); frame = requestAnimationFrame(scroll);
    };
    const update = (point: Position, event: Event) => {
      if (latest.current.disabled) { cancel(); return; }
      y = point.clientY;
      const distance = Math.hypot(point.clientX - origin.x, y - origin.y);
      if (!active) {
        if (touch && distance > 8) { cancel(); return; }
        if (!touch && distance >= 6) activate();
      }
      if (active) { if (event.cancelable) event.preventDefault(); hit(); }
    };
    const finish = (commit: boolean) => {
      const from = latest.current.ids.indexOf(id);
      const to = Math.max(0, Math.min(latest.current.ids.length - 1, boundary > from ? boundary - 1 : boundary));
      if (active) suppressClick.current = Date.now() + 400;
      cancel();
      if (commit && active && !latest.current.disabled && boundary >= 0 && from >= 0 && from !== to) latest.current.move(id, to);
    };
    const pointerMove = (e: globalThis.PointerEvent) => { if (e.pointerId === pointerId) update(e, e); };
    const pointerUp = (e: globalThis.PointerEvent) => { if (e.pointerId === pointerId) { update(e, e); finish(true); } };
    const abort = () => finish(false);
    const touchMove = (e: globalThis.TouchEvent) => {
      if (e.touches.length !== 1 || e.touches[0].identifier !== touchId) { abort(); return; }
      update(e.touches[0], e);
    };
    const touchEnd = (e: globalThis.TouchEvent) => {
      if (active && e.cancelable) e.preventDefault();
      const point = [...e.changedTouches].find(t => t.identifier === touchId);
      if (point) update(point, e);
      finish(!!point && e.touches.length === 0);
    };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); abort(); } };
    const onScroll = () => { if (active) hit(); };
    cleanup.current = () => {
      clearTimeout(timer); cancelAnimationFrame(frame);
      document.removeEventListener('pointermove', pointerMove);
      document.removeEventListener('pointerup', pointerUp);
      document.removeEventListener('pointercancel', abort);
      document.removeEventListener('touchmove', touchMove);
      document.removeEventListener('touchend', touchEnd);
      document.removeEventListener('touchcancel', abort);
      document.removeEventListener('keydown', key);
      window.removeEventListener('blur', abort);
      window.removeEventListener('scroll', onScroll, true);
      if (pointerId !== undefined && element.hasPointerCapture?.(pointerId)) element.releasePointerCapture(pointerId);
    };
    document.addEventListener('keydown', key);
    window.addEventListener('blur', abort);
    window.addEventListener('scroll', onScroll, true);
    if (touch) {
      timer = setTimeout(activate, 240);
      document.addEventListener('touchmove', touchMove, { passive: false });
      document.addEventListener('touchend', touchEnd, { passive: false });
      document.addEventListener('touchcancel', abort);
    } else {
      document.addEventListener('pointermove', pointerMove, { passive: false });
      document.addEventListener('pointerup', pointerUp);
      document.addEventListener('pointercancel', abort);
    }
  };
  const blocked = (target: EventTarget) => target instanceof Element && !!target.closest('button:not([data-pdf-drag-handle]), a, input');
  return {
    drag,
    pointerDown: (id: string, e: PointerEvent<HTMLElement>) => {
      if (e.pointerType === 'touch' || e.button !== 0 || e.isPrimary === false || blocked(e.target)) return;
      start(id, e, e.currentTarget, false, e.pointerId);
    },
    touchStart: (id: string, e: TouchEvent<HTMLElement>) => {
      if (e.touches.length !== 1) { cancel(); return; }
      if (!blocked(e.target)) start(id, e.touches[0], e.currentTarget, true, undefined, e.touches[0].identifier);
    },
    contextMenu: (e: { preventDefault(): void }) => { if (cleanup.current) e.preventDefault(); },
    clickCapture: (e: { detail: number; preventDefault(): void; stopPropagation(): void }) => {
      if (e.detail !== 0 && Date.now() < suppressClick.current) { e.preventDefault(); e.stopPropagation(); }
    },
  };
}
