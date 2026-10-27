import { clamp, meshBudget, projectSurface, spacingFade, type Quality } from './geometry';
import type { Renderer } from './useScene';

const SHADES = 24;
const colors = Array.from({ length: SHADES }, (_, i) => {
  const t = i / (SHADES - 1);
  return `rgba(${Math.round(38 + t * 96)},${Math.round(76 + t * 113)},${Math.round(112 + t * 119)},${0.10 + t * 0.64})`;
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
    layout: () => ({ mainLines: budget.rows + 1, crossLines: crossColumns.length, samples: budget.columns + 1, meshBytes: mesh.byteLength }),
    resize(w, h, scale) {
      width = w; height = h; dpr = scale;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      budget = meshBudget(w, h, scale, quality);
      mesh = new Float32Array((budget.rows + 1) * (budget.columns + 1) * 3);
      crossColumns = Array.from({ length: budget.cross }, (_, i) => Math.round((i + 0.5) / budget.cross * budget.columns));
    },
    active(next) { enabled = next; if (!next) pointer.target = 0; },
    draw(dt, time) {
      if (disposed) return;
      pointer.strength += (pointer.target - pointer.strength) * (1 - Math.exp(-dt * 7));
      const { rows, columns } = budget;
      for (let row = 0; row <= rows; row++) for (let column = 0; column <= columns; column++) {
        const p = projectSurface(column / columns, row / rows, time, width, height, overlay, pointer);
        const k = index(row, column);
        mesh[k] = p.x; mesh[k + 1] = p.y; mesh[k + 2] = p.shade;
      }
      ctx.fillStyle = '#060B12'; ctx.fillRect(0, 0, width, height);
      // Finite shade buckets batch geometric segments, without gradients/blur.
      // Both line families read the same mesh vertices, including intersections.
      const paths = Array.from({ length: SHADES }, () => new Path2D());
      let previousShade = -1, previousEnd = -1;
      const add = (a: number, b: number, neighbour: number, family: number) => {
        const fade = spacingFade(mesh[b] - mesh[a], mesh[b + 1] - mesh[a + 1], mesh[neighbour] - mesh[a], mesh[neighbour + 1] - mesh[a + 1], dpr, mesh[a + 2]);
        const intensity = (mesh[a + 2] + mesh[b + 2]) * 0.5 * fade * family;
        const shade = Math.min(SHADES - 1, Math.floor(intensity * SHADES));
        if (shade < 1) { previousShade = -1; return; }
        // Keep adjacent equal-shade segments as a continuous subpath. Thousands
        // of separate two-point strokes cost more and expose antialias seams.
        if (shade !== previousShade || a !== previousEnd) paths[shade].moveTo(mesh[a], mesh[a + 1]);
        paths[shade].lineTo(mesh[b], mesh[b + 1]);
        previousShade = shade; previousEnd = b;
      };
      for (let row = 0; row <= rows; row++) for (let column = 0; column < columns; column++) {
        add(index(row, column), index(row, column + 1), index(row === rows ? row - 1 : row + 1, column), 1);
      }
      // Cross-line spacing uses the next cross-line, not the dense sample grid.
      for (let c = 0; c < crossColumns.length; c++) for (let row = 0; row < rows; row++) {
        const column = crossColumns[c], neighbour = crossColumns[c === crossColumns.length - 1 ? c - 1 : c + 1];
        add(index(row, column), index(row + 1, column), index(row, neighbour), 0.42);
      }
      ctx.lineWidth = Math.max(0.6, 1 / dpr); ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
      for (let i = 1; i < paths.length; i++) { ctx.strokeStyle = colors[i]; ctx.stroke(paths[i]); }
    },
    dispose() {
      if (disposed) return; disposed = true; enabled = false;
      canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerleave', leave); canvas.removeEventListener('pointercancel', leave);
      mesh = new Float32Array(0); crossColumns = [];
    },
  };
}
