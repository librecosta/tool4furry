import { useEffect, useRef, useState, type PointerEvent } from 'react';
import * as stylex from '@stylexjs/stylex';
import { controls } from '../../styles/controls';
import { constrainFraming, drawShare, loadShareAssets, templateLayout, templates, visibleColors, zoomFraming, type Framing, type ShareOptions } from './render';
import { styles as s } from './styles';
import type { Labels } from './messages';

/** One bounded live canvas; no Blob generation on pointer movement. */
export function ShareCanvas({ image, colors, options, onFrame, onInteraction, onError, t }: {
  image: HTMLCanvasElement; colors: readonly string[]; options: ShareOptions;
  onFrame: (frame: Framing) => void; onInteraction: (active: boolean) => void; onError: () => void; t: Labels;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const bed = useRef<HTMLDivElement>(null), hit = useRef<HTMLDivElement>(null);
  const [hitBox, setHitBox] = useState({left: 0, top: 0, width: 0, height: 0});
  const [assets, setAssets] = useState<{key: string; value: Awaited<ReturnType<typeof loadShareAssets>>}>();
  const assetKey = JSON.stringify([options.title, options.signature]);
  const latest = useRef({ image, options, onFrame, onInteraction });
  latest.current = { image, options, onFrame, onInteraction };
  const gesture = useRef<{id: number; x: number; y: number; frame: Framing; image: HTMLCanvasElement; template: ShareOptions['template']} | undefined>(undefined);
  const cancel = () => {
    const drag = gesture.current; gesture.current = undefined;
    if (!drag) return;
    if (drag.image === latest.current.image && drag.template === latest.current.options.template) latest.current.onFrame(drag.frame);
    if (hit.current?.hasPointerCapture?.(drag.id)) hit.current.releasePointerCapture(drag.id);
    latest.current.onInteraction(false);
  };
  useEffect(() => {
    let valid = true;
    loadShareAssets(options.title, options.signature).then(value => { if (valid) setAssets({key: assetKey, value}); }).catch(() => { if (valid) onError(); });
    return () => { valid = false; };
  }, [assetKey, onError]);
  useEffect(() => {
    if (!canvas.current || assets?.key !== assetKey) return;
    const frame = requestAnimationFrame(() => {
      const node = canvas.current;
      if (!node) return;
      try {
        if (!image.width || !image.height) throw new Error('source');
        const [w, h] = templates[options.template], scale = Math.min(1, 1000 / Math.max(w, h));
        const width = Math.round(w * scale), height = Math.round(h * scale);
        if (node.width !== width || node.height !== height) { node.width = width; node.height = height; }
        const ctx = node.getContext('2d');
        if (!ctx) throw new Error('draw');
        ctx.setTransform(width / w, 0, 0, height / h, 0, 0);
        drawShare(ctx, image, colors, options, assets.value);
      } catch { onError(); }
    });
    return () => cancelAnimationFrame(frame);
  }, [image, colors, options, assets, assetKey, onError]);
  useEffect(() => { cancel(); }, [image, options.template]);
  useEffect(() => {
    const node = canvas.current, parent = bed.current;
    if (!node || !parent) return;
    const measure = () => {
      const [w, h] = templates[options.template], box = templateLayout(options.template, 1).image;
      // Layout coordinates stay stable during the Dialog's CSS scale reveal.
      const next = {left: node.offsetLeft + box.x / w * node.clientWidth, top: node.offsetTop + box.y / h * node.clientHeight, width: box.w / w * node.clientWidth, height: box.h / h * node.clientHeight};
      setHitBox(previous => Object.keys(next).every(key => previous[key as keyof typeof next] === next[key as keyof typeof next]) ? previous : next);
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure);
    observer?.observe(node); observer?.observe(parent); window.addEventListener('resize', measure);
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); };
  }, [options.template]);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && gesture.current) { event.preventDefault(); event.stopPropagation(); cancel(); }
    };
    const visibility = () => { if (document.hidden) cancel(); };
    window.addEventListener('keydown', escape, true); window.addEventListener('blur', cancel);
    document.addEventListener('visibilitychange', visibility);
    const node = canvas.current;
    return () => {
      window.removeEventListener('keydown', escape, true); window.removeEventListener('blur', cancel);
      document.removeEventListener('visibilitychange', visibility);
      gesture.current = undefined; latest.current.onInteraction(false);
      if (node) { node.width = 0; node.height = 0; }
    };
  }, []);
  const layout = templateLayout(options.template, visibleColors(colors, options).length, options.swatches);
  const point = (event: PointerEvent<HTMLElement>) => {
    const rect = canvas.current!.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / rect.width * layout.width, y: (event.clientY - rect.top) / rect.height * layout.height };
  };
  const current = constrainFraming(image, layout.image, options.frames[options.template]);
  return <div {...stylex.props(s.composerArt)}>
    <div ref={bed} {...stylex.props(s.composerBed)}>
      <canvas ref={canvas} role="img" aria-label={t.composition} aria-description={t.compositionHint} tabIndex={0} data-share-canvas
        {...stylex.props(s.composerCanvas, controls.workspaceFocus)} style={{aspectRatio: `${layout.width} / ${layout.height}`}}
        onKeyDownCapture={event => { delete event.currentTarget.dataset.pointerFocus; }}
        onBlur={event => { delete event.currentTarget.dataset.pointerFocus; }}
        onKeyDown={event => {
          if (event.ctrlKey || event.metaKey || event.altKey || gesture.current) return;
          if (['+', '=', '-'].includes(event.key)) onFrame(zoomFraming(image, layout.image, current, current.zoom + (event.key === '-' ? -.1 : .1)));
          else if (event.key === '0') onFrame({zoom: 1, x: 0, y: 0});
          else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) onFrame(constrainFraming(image, layout.image, {...current, x: current.x + (event.key === 'ArrowLeft' ? -.025 : event.key === 'ArrowRight' ? .025 : 0), y: current.y + (event.key === 'ArrowUp' ? -.025 : event.key === 'ArrowDown' ? .025 : 0)}));
          else return;
          event.preventDefault();
        }}
      />
      <div ref={hit} aria-hidden="true" data-share-image {...stylex.props(s.composerHit)} style={hitBox}
        onPointerDown={event => {
          if (event.button !== 0) return;
          if (gesture.current) { cancel(); return; }
          const p = point(event), box = layout.image;
          if (p.x < box.x || p.y < box.y || p.x > box.x + box.w || p.y > box.y + box.h) return;
          event.preventDefault(); if (canvas.current) { canvas.current.dataset.pointerFocus = ''; canvas.current.focus({preventScroll: true}); }
          gesture.current = {id: event.pointerId, ...p, frame: current, image, template: options.template};
          event.currentTarget.setPointerCapture?.(event.pointerId); onInteraction(true);
        }}
        onPointerMove={event => {
          const drag = gesture.current;
          if (!drag || drag.id !== event.pointerId || drag.image !== image || drag.template !== options.template) return;
          const p = point(event);
          onFrame(constrainFraming(image, layout.image, {...drag.frame, x: drag.frame.x + (p.x - drag.x) / layout.image.w, y: drag.frame.y + (p.y - drag.y) / layout.image.h}));
        }}
        onPointerUp={event => {
          const drag = gesture.current;
          if (!drag || drag.id !== event.pointerId) return;
          if (drag.image === image && drag.template === options.template) {
            const p = point(event);
            onFrame(constrainFraming(image, layout.image, {...drag.frame, x: drag.frame.x + (p.x - drag.x) / layout.image.w, y: drag.frame.y + (p.y - drag.y) / layout.image.h}));
          }
          gesture.current = undefined;
          if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
          onInteraction(false);
        }}
        onPointerCancel={cancel} onLostPointerCapture={() => { if (gesture.current) cancel(); }}
      />
    </div>
    <p {...stylex.props(s.composerHint)}>{t.compositionHint}</p>
  </div>;
}
