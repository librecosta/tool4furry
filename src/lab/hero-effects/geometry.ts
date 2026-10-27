export const qualities = {
  low: { lines: 36, cross: 12, samples: 144, dpr: 1, step: 10, fps: 12 },
  medium: { lines: 42, cross: 15, samples: 224, dpr: 2, step: 7, fps: 24 },
  high: { lines: 46, cross: 18, samples: 320, dpr: 2, step: 5, fps: 24 },
} as const;
export type Quality = keyof typeof qualities;
export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
export function smoothstep(a: number, b: number, x: number) {
  const v = clamp((x - a) / (b - a), 0, 1);
  return v * v * (3 - 2 * v);
}
export function meshBudget(width: number, height: number, dpr: number, quality: Quality) {
  const q = qualities[quality];
  return {
    rows: Math.max(12, Math.min(q.lines - 1, Math.floor(height * 0.32 / Math.max(3.4, 4.2 / dpr)))),
    farRows: Math.max(6, Math.min(15, Math.floor(height * 0.15 / Math.max(5, 6 / dpr)))),
    columns: Math.max(48, Math.min(q.samples, Math.ceil(width / q.step * Math.sqrt(dpr)))),
    cross: Math.max(6, Math.min(q.cross, Math.floor(width / 45))),
  };
}

const SEED = 0x48534e31;
const diagonal = Math.SQRT1_2;
const gradients = [[1, 0], [-1, 0], [0, 1], [0, -1], [diagonal, diagonal], [-diagonal, diagonal], [diagonal, -diagonal], [-diagonal, -diagonal]] as const;
function gradient(x: number, y: number, seed: number) {
  let h = Math.imul(x, 0x1f123bb5) ^ Math.imul(y, 0x5f356495) ^ seed;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b); h ^= h >>> 16;
  return gradients[h & 7];
}
const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const fadeD = (t: number) => 30 * t * t * (t - 1) * (t - 1);
const fadeDD = (t: number) => 60 * t * (2 * t * t - 3 * t + 1);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
// Fixed-seed 2D gradient noise with quintic interpolation. Analytic derivatives
// keep lighting independent of quality/sample spacing, including lattice edges.
export function gradientNoise(x: number, y: number, seed = SEED) {
  const ix = Math.floor(x), iy = Math.floor(y), u = x - ix, v = y - iy;
  const a = gradient(ix, iy, seed), b = gradient(ix + 1, iy, seed);
  const c = gradient(ix, iy + 1, seed), d = gradient(ix + 1, iy + 1, seed);
  const na = a[0] * u + a[1] * v, nb = b[0] * (u - 1) + b[1] * v;
  const nc = c[0] * u + c[1] * (v - 1), nd = d[0] * (u - 1) + d[1] * (v - 1);
  const fx = fade(u), fy = fade(v), dx = fadeD(u), ddx = fadeDD(u);
  const top = mix(na, nb, fx), bottom = mix(nc, nd, fx);
  const topD = mix(a[0], b[0], fx) + dx * (nb - na);
  const bottomD = mix(c[0], d[0], fx) + dx * (nd - nc);
  return {
    value: mix(top, bottom, fy),
    du: mix(topD, bottomD, fy),
    dv: mix(mix(a[1], b[1], fx), mix(c[1], d[1], fx), fy) + fadeD(v) * (bottom - top),
    duu: mix(2 * dx * (b[0] - a[0]) + ddx * (nb - na), 2 * dx * (d[0] - c[0]) + ddx * (nd - nc), fy),
  };
}
const spectrum = [
  { f: 0.65, a: 0.035, beta: 0.85, phi: 3.15 },
  { f: 1.35, a: 0.012, beta: -1.2, phi: 0.9 },
  { f: 2.40, a: 0.004, beta: 1.4, phi: 2.4 },
].map(w => { const k = 2 * Math.PI * w.f; return { ...w, k, omega: 0.045 * Math.sqrt(k * Math.tanh(0.5 * k)) }; });
const octaves = [[1.2, 0.35, 0.005, 1], [2.4, 0.7, 0.008, 0.35], [4.8, 1.4, 0.010, 0.12]] as const;
// HSN-1 artistic dispersion, not a fluid simulation. No per-frame randomness.
export function surface(u: number, v: number, time: number) {
  let height = 0, du = 0, dv = 0, duu = 0;
  for (const w of spectrum) {
    const phase = w.k * u + w.beta * v - w.omega * time + w.phi;
    const cosine = Math.cos(phase) * w.a, sine = Math.sin(phase) * w.a;
    height += cosine; du -= w.k * sine; dv -= w.beta * sine; duu -= w.k * w.k * cosine;
  }
  for (const [x, y, speed, weight] of octaves) {
    const n = gradientNoise(x * u - speed * time, y * v), a = 0.008 * weight / 1.47;
    height += a * n.value; du += a * x * n.du; dv += a * y * n.dv; duu += a * x * x * n.duu;
  }
  const nx = -2.8 * du, ny = -1.6 * dv;
  const diffuse = Math.max(0, (nx * -0.35 + ny * -0.45 + 0.82) / Math.hypot(nx, ny, 1) / Math.hypot(0.35, 0.45, 0.82));
  const crest = Math.exp(-Math.pow(du / 0.11, 2)) * smoothstep(0.3, 1.6, Math.max(0, -duu));
  return { height, du, dv, duu, diffuse, crest };
}

export const layers = {
  far: { base: 0.15, span: 0.15, amplitude: 0.45 },
  main: { base: 0.38, span: 0.32, amplitude: 1 },
} as const;
export type SurfaceLayer = keyof typeof layers;
export type PointerField = { x: number; y: number; strength: number };
export function projectSurface(u: number, v: number, time: number, width: number, height: number, overlay: boolean, pointer?: PointerField, layer: SurfaceLayer = 'main') {
  const s = surface(u, v, time), l = layers[layer], effectiveHeight = Math.min(height, width * 0.5);
  const x = width * u;
  let y = height * (l.base + l.span * v) + l.amplitude * effectiveHeight * s.height;
  // Keep the small-screen text above the surface without amplifying its relief.
  if (overlay && width <= 760) y += height * 0.22;
  if (pointer?.strength) {
    const distance = Math.pow((u - pointer.x) / 0.16, 2) + Math.pow((y / height - pointer.y) / 0.20, 2);
    y -= Math.exp(-distance * 2) * pointer.strength * effectiveHeight * 0.004 * l.amplitude;
  }
  const safe = overlay ? 0.025 + smoothstep(0.30, 0.64, u) * 0.975 : 0.10 + smoothstep(0.24, 0.64, u) * 0.90;
  const depth = (0.28 + 0.72 * smoothstep(0, 1, v)) * (layer === 'far' ? 0.28 : 1);
  const valley = 0.55 + 0.45 * smoothstep(-0.03, 0.02, s.height);
  const shade = safe * depth * valley * clamp(0.06 + 0.16 * s.diffuse + 0.68 * s.crest, 0, 0.9);
  return { x, y, shade };
}

// Perpendicular distance in device pixels; brighter strokes need more room.
export function spacingFade(tx: number, ty: number, dx: number, dy: number, dpr: number, brightness = 0) {
  const gap = Math.abs(tx * dy - ty * dx) / Math.max(0.001, Math.hypot(tx, ty));
  return smoothstep(1.5, 3 + brightness * 0.8, gap * dpr);
}
