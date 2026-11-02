import { useEffect, useRef, useState, type PointerEvent, type RefObject, type TouchEvent } from 'react';
import { galleryInsertion, galleryScroll, insertionTarget, type GalleryInsertion } from './gallery-layout';

type DragView = {id: string; x: number; y: number; width: number; height: number; offsetX: number; offsetY: number; insertion?: GalleryInsertion};
type Gesture = DragView & {startX: number; startY: number; active: boolean};
type Point = {clientX: number; clientY: number};

/** Pointer gestures for mouse/pen; long-press Touch Events for touch. Touch move
 * remains native scrolling until activation, then its non-passive listener owns
 * the gesture. No HTML Drag API and no second copy of the page order. */
export function useGalleryDrag(host: RefObject<HTMLDivElement | null>, order: readonly string[], move: (id: string, target: number) => void) {
  const [drag, setDrag] = useState<DragView>();
  const current = useRef({order, move}); current.current = {order, move};
  const gesture = useRef<Gesture | undefined>(undefined);
  const cleanup = useRef<(() => void) | undefined>(undefined);
  const suppressClick = useRef(0);
  const orderKey = order.join('|');
  const cancel = () => { cleanup.current?.(); cleanup.current = undefined; gesture.current = undefined; setDrag(undefined); };
  useEffect(() => { cancel(); }, [orderKey]); // Removal, reset, intake or an external reorder.
  useEffect(() => () => { cleanup.current?.(); gesture.current = undefined; }, []);

  const start = (id: string, point: Point, element: HTMLElement, touch: boolean, pointerId?: number) => {
    cancel();
    const rect = element.getBoundingClientRect(), scale = Math.min(1, 240 / Math.max(1, rect.width));
    const state: Gesture = {id, startX: point.clientX, startY: point.clientY, x: point.clientX, y: point.clientY,
      width: rect.width * scale, height: rect.height * scale,
      offsetX: (point.clientX - rect.x) * scale, offsetY: (point.clientY - rect.y) * scale, active: false};
    gesture.current = state;
    let timer: ReturnType<typeof setTimeout> | undefined, frame = 0;
    const hit = () => {
      const nodes = [...(host.current?.querySelectorAll<HTMLElement>('[data-page-id]') ?? [])];
      state.insertion = galleryInsertion(nodes.map(node => {
        const r = node.getBoundingClientRect(); return {x: r.x, y: r.y, width: r.width, height: r.height};
      }), state.x, state.y);
      setDrag({...state});
    };
    const scroll = () => {
      const scroller = host.current;
      if (!scroller || !state.active || gesture.current !== state) return;
      const r = scroller.getBoundingClientRect(), before = scroller.scrollTop;
      scroller.scrollTop += galleryScroll(state.y, Math.max(0, r.top), Math.min(window.innerHeight, r.bottom));
      if (scroller.scrollTop !== before) hit();
      else {
        const delta = galleryScroll(state.y, 0, window.innerHeight);
        if (delta) { window.scrollBy(0, delta); hit(); }
      }
      frame = requestAnimationFrame(scroll);
    };
    const activate = () => {
      if (gesture.current !== state) return;
      state.active = true;
      element.focus({preventScroll: true});
      if (pointerId !== undefined) element.setPointerCapture?.(pointerId);
      hit(); frame = requestAnimationFrame(scroll);
    };
    const update = (point: Point, event: Event) => {
      state.x = point.clientX; state.y = point.clientY;
      if (!state.active) {
        const distance = Math.hypot(state.x - state.startX, state.y - state.startY);
        if (touch && distance > 8) { cancel(); return; }
        if (!touch && distance >= 6) activate();
      }
      if (state.active) { if (event.cancelable) event.preventDefault(); hit(); }
    };
    const finish = (commit: boolean) => {
      const active = state.active, insertion = state.insertion;
      if (active) suppressClick.current = Date.now() + 400;
      cancel();
      if (active && commit && insertion) {
        const from = current.current.order.indexOf(id);
        if (from >= 0) current.current.move(id, insertionTarget(from, insertion.boundary, current.current.order.length));
      }
    };
    const pointerMove = (event: globalThis.PointerEvent) => { if (event.pointerId === pointerId) update(event, event); };
    const pointerUp = (event: globalThis.PointerEvent) => { if (event.pointerId === pointerId) { update(event, event); finish(true); } };
    const pointerCancel = () => finish(false);
    const touchMove = (event: globalThis.TouchEvent) => {
      if (event.touches.length !== 1) { finish(false); return; }
      update(event.touches[0], event);
    };
    const touchEnd = (event: globalThis.TouchEvent) => {
      if (state.active && event.cancelable) event.preventDefault();
      if (event.changedTouches[0]) update(event.changedTouches[0], event);
      finish(event.touches.length === 0);
    };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') {event.preventDefault(); finish(false);} };
    document.addEventListener('keydown', escape);
    window.addEventListener('blur', pointerCancel);
    if (touch) {
      timer = setTimeout(activate, 220);
      document.addEventListener('touchmove', touchMove, {passive: false});
      document.addEventListener('touchend', touchEnd, {passive: false});
      document.addEventListener('touchcancel', pointerCancel);
    } else {
      document.addEventListener('pointermove', pointerMove, {passive: false});
      document.addEventListener('pointerup', pointerUp);
      document.addEventListener('pointercancel', pointerCancel);
    }
    cleanup.current = () => {
      clearTimeout(timer); cancelAnimationFrame(frame);
      document.removeEventListener('keydown', escape);
      window.removeEventListener('blur', pointerCancel);
      document.removeEventListener('pointermove', pointerMove);
      document.removeEventListener('pointerup', pointerUp);
      document.removeEventListener('pointercancel', pointerCancel);
      document.removeEventListener('touchmove', touchMove);
      document.removeEventListener('touchend', touchEnd);
      document.removeEventListener('touchcancel', pointerCancel);
      if (pointerId !== undefined && element.hasPointerCapture?.(pointerId)) element.releasePointerCapture(pointerId);
    };
  };
  const control = (target: EventTarget) => target instanceof Element && !!target.closest('button, input, a');
  return {drag,
    pointerDown: (id: string, event: PointerEvent<HTMLElement>) => {
      if (control(event.target)) {suppressClick.current = 0; return;}
      if (event.pointerType === 'touch' || event.button !== 0 || event.isPrimary === false) return;
      start(id, event, event.currentTarget, false, event.pointerId);
    },
    touchStart: (id: string, event: TouchEvent<HTMLElement>) => {
      if (event.touches.length !== 1) {cancel(); return;}
      if (control(event.target)) {suppressClick.current = 0; return;}
      start(id, event.touches[0], event.currentTarget, true);
    },
    contextMenu: (event: {preventDefault: () => void}) => { if (gesture.current) event.preventDefault(); },
    clickCapture: (event: {detail: number; preventDefault: () => void; stopPropagation: () => void}) => {
      if (event.detail !== 0 && Date.now() < suppressClick.current) {event.preventDefault(); event.stopPropagation();}
    },
  };
}
