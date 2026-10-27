import { clamp, meshBudget, projectSurface, spacingFade, type Quality } from './geometry';
import type { Renderer } from './useScene';

const SHADES = 32;
const colors = Array.from({ length: SHADES }, (_, i) => {
  const t = i / (SHADES - 1);
  return `rgba(${Math.round(44 + t * 125)},${Math.round(79 + t * 129)},${Math.round(110 + t * 122)},${0.14 + t * 0.75})`;
});
export function createWavesRenderer(canvas: HTMLCanvasElement, quality: Quality, overlay: boolean): Renderer {
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas 2D unavailable');
  let width = 1, height = 1, dpr = 1, enabled = false, disposed = false;
  let budget = meshBudget(1, 1, 1, quality), mesh = new Float32Array(0);
  let crossColumns: number[] = [];
  const pointer = { x: 0.7, y: 0.5, strength: 0, target: 0 };
  const move = (event: PointerEvent) => {
    if (!enabled || event.pointerType === 'touch') return;
    const rect = canvas.getBoundingClientRect();
    pointer.x = clamp((event.clientX - rect.left) / width, 0, 1);
    pointer.y = clamp((event.clientY - rect.top) / height, 0, 1);
    pointer.target = 1;
  };
  const leave = () => { pointer.target = 0; };
  canvas.addEventListener('pointermove', move, { passive: true });
  canvas.addEventListener('pointerleave', leave); canvas.addEventListener('pointercancel', leave);
  const index = (row: number, column: number) => (row * (budget.columns + 1) + column) * 3;
  return {
    layout: () => ({ mainLines: budget.rows + 1, farLines: budget.farRows + 1, crossLines: crossColumns.length, samples: budget.columns + 1, meshBytes: mesh.byteLength }),
    resize(w, h, scale) {
      width = w; height = h; dpr = scale;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      budget = meshBudget(w, h, scale, quality);
      mesh = new Float32Array((budget.rows + budget.farRows + 2) * (budget.columns + 1) * 3);
      crossColumns = Array.from({ length: budget.cross }, (_, i) => Math.round((i + 0.5) / budget.cross * budget.columns));
    },
    active(next) { enabled = next; if (!next) pointer.target = 0; },
    draw(dt, time) {
      if (disposed) return;
      pointer.strength += (pointer.target - pointer.strength) * (1 - Math.exp(-dt * 3));
      const { rows, farRows, columns } = budget, farStart = rows + 1;
      for (const layer of ['main', 'far'] as const) {
        const count = layer === 'main' ? rows : farRows, start = layer === 'main' ? 0 : farStart;
        for (let row = 0; row <= count; row++) for (let column = 0; column <= columns; column++) {
          const p = projectSurface(column / columns, row / count, time, width, height, overlay, pointer, layer);
          const k = index(start + row, column);
          mesh[k] = p.x; mesh[k + 1] = p.y; mesh[k + 2] = p.shade;
        }
      }
      ctx.fillStyle = '#060B12'; ctx.fillRect(0, 0, width, height);
      // Separate weights for far hatching, cross-lines and main silver ridges.
      // All intersections use the very same projected vertices, without blur.
      const paths = Array.from({ length: 3 }, () => Array.from({ length: SHADES }, () => new Path2D()));
      const used = paths.map(() => new Set<number>());
      let previousShade = -1, previousEnd = -1;
      const add = (a: number, b: number, neighbours: number[], family: number) => {
        let fade = 1;
        for (const n of neighbours) fade = Math.min(fade, spacingFade(mesh[b] - mesh[a], mesh[b + 1] - mesh[a + 1], mesh[n] - mesh[a], mesh[n + 1] - mesh[a + 1], dpr, mesh[a + 2]));
        const intensity = (mesh[a + 2] + mesh[b + 2]) * 0.5 * fade * (family === 1 ? 0.32 : 1);
        const shade = Math.min(SHADES - 1, Math.floor(intensity * SHADES));
        if (shade < 1) { previousShade = -1; return; }
        if (shade !== previousShade || a !== previousEnd) paths[family][shade].moveTo(mesh[a], mesh[a + 1]);
        paths[family][shade].lineTo(mesh[b], mesh[b + 1]); used[family].add(shade);
        previousShade = shade; previousEnd = b;
      };
      for (const family of [0, 2]) {
        const count = family === 2 ? rows : farRows, start = family === 2 ? 0 : farStart;
        for (let row = 0; row <= count; row++) for (let column = 0; column < columns; column++) {
          const neighbours = [index(family === 2 ? farStart + farRows : 0, column)];
          if (row > 0) neighbours.push(index(start + row - 1, column));
          if (row < count) neighbours.push(index(start + row + 1, column));
          add(index(start + row, column), index(start + row, column + 1), neighbours, family);
        }
        previousShade = -1;
      }
      // Check both actual adjacent cross-lines, not the dense sampling columns.
      for (let c = 0; c < crossColumns.length; c++) for (let row = 0; row < rows; row++) {
        const column = crossColumns[c], neighbours: number[] = [];
        if (c > 0) neighbours.push(index(row, crossColumns[c - 1]));
        if (c + 1 < crossColumns.length) neighbours.push(index(row, crossColumns[c + 1]));
        add(index(row, column), index(row + 1, column), neighbours, 1);
      }
      ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
      for (let family = 0; family < paths.length; family++) for (const shade of used[family]) {
        ctx.lineWidth = family === 0 ? 0.8 : family === 1 ? 0.75 : 0.9 + 0.45 * Math.pow(shade / (SHADES - 1), 2);
        ctx.strokeStyle = colors[shade]; ctx.stroke(paths[family][shade]);
      }
    },
    dispose() {
      if (disposed) return; disposed = true; enabled = false;
      canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerleave', leave); canvas.removeEventListener('pointercancel', leave);
      mesh = new Float32Array(0); crossColumns = [];
    },
  };
}
