import { clamp, qualities, waveY, type Quality } from './geometry';
import type { Renderer } from './useScene';

export function createWavesRenderer(canvas: HTMLCanvasElement, quality: Quality, overlay: boolean): Renderer {
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas 2D unavailable');
  const { lines, samples } = qualities[quality];
  let width = 1, height = 1, enabled = false, gradient: CanvasGradient;
  const pointer = { x: 0.7, y: 0.5, strength: 0, target: 0 };
  const move = (event: PointerEvent) => {
    if (!enabled) return;
    const rect = canvas.getBoundingClientRect();
    pointer.x = clamp((event.clientX - rect.left) / width, 0, 1);
    pointer.y = clamp((event.clientY - rect.top) / height, 0, 1);
    pointer.target = 1;
  };
  const leave = () => { pointer.target = 0; };
  canvas.addEventListener('pointermove', move, { passive: true });
  canvas.addEventListener('pointerleave', leave); canvas.addEventListener('pointercancel', leave);
  return {
    backend: 'Canvas 2D', count: lines, vertexBytes: 0,
    resize(w, h, dpr) {
      width = w; height = h; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      gradient = ctx.createLinearGradient(0, 0, w, 0);
      gradient.addColorStop(0, overlay ? 'rgba(99,149,207,0.03)' : '#345E89');
      gradient.addColorStop(0.32, overlay ? 'rgba(99,149,207,0.12)' : '#6995C3');
      gradient.addColorStop(0.58, '#99C5EB'); gradient.addColorStop(0.76, '#C0E1F3');
      gradient.addColorStop(1, '#4C799F');
    },
    active(next) { enabled = next; if (!next) pointer.target = 0; },
    draw(dt, time) {
      pointer.strength += (pointer.target - pointer.strength) * (1 - Math.exp(-dt * 7));
      ctx.fillStyle = '#060B12'; ctx.fillRect(0, 0, width, height);
      ctx.lineWidth = 0.8; ctx.lineJoin = 'round'; ctx.strokeStyle = gradient;
      for (let i = 0; i < lines; i++) {
        const layer = i / (lines - 1);
        ctx.globalAlpha = 0.22 + layer * 0.35 + Math.pow(Math.sin(layer * Math.PI), 8) * 0.2;
        ctx.beginPath();
        for (let j = 0; j <= samples; j++) {
          const u = j / samples;
          const y = waveY(u, layer, time);
          const distance = Math.pow((u - pointer.x) / 0.13, 2) + Math.pow((y - pointer.y) / 0.28, 2);
          const disturbance = Math.exp(-distance * 1.7) * pointer.strength * Math.sin(u * 16 + layer * 3) * 0.024;
          const pixelY = (y + disturbance) * height + (overlay && width <= 760 ? height * 0.19 : 0);
          if (j === 0) ctx.moveTo(u * width, pixelY); else ctx.lineTo(u * width, pixelY);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    },
    dispose() { enabled = false; canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerleave', leave); canvas.removeEventListener('pointercancel', leave); },
  };
}
