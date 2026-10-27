export const qualities = {
  low: { lines: 40, cross: 16, samples: 144, dpr: 1, step: 10 },
  medium: { lines: 56, cross: 24, samples: 224, dpr: 2, step: 7 },
  high: { lines: 64, cross: 30, samples: 320, dpr: 2, step: 5 },
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
    rows: Math.max(16, Math.min(q.lines, Math.floor(height * 0.65 / Math.max(3.8, 4.8 / dpr)))),
    columns: Math.max(48, Math.min(q.samples, Math.ceil(width / q.step * Math.sqrt(dpr)))),
    cross: Math.max(6, Math.min(q.cross, Math.floor(width / 28))),
  };
}

// One continuous height field and analytic slopes for both line families.
// Broad asymmetric ridges breathe independently; no repeating sine curtain.
export function surface(u: number, v: number, time: number) {
  const drift = Math.sin(time * 0.13) * 0.022;
  const a = (u - (0.68 + v * 0.10 + drift)) / 0.24;
  const b = (u - (0.08 + v * 0.07 - drift * 0.6)) / 0.31;
  const c = (u - (0.40 + v * 0.055)) / 0.22;
  const amplitude = 0.25 + Math.sin(time * 0.11 + v * 1.4) * 0.014;
  const primary = amplitude * Math.exp(-a * a);
  const secondary = (0.12 + Math.sin(time * 0.09 + 1.8) * 0.009) * Math.exp(-b * b);
  const valley = 0.125 * Math.exp(-c * c);
  const phase = u * 5.2 + v * 3.1 + time * 0.075;
  const duA = primary * -2 * a / 0.24, duB = secondary * -2 * b / 0.31, duC = valley * -2 * c / 0.22;
  const du = duA + duB - duC + Math.cos(phase) * 0.018 * 5.2;
  const dv = -duA * 0.10 - duB * 0.07 + duC * 0.055
    + Math.cos(time * 0.11 + v * 1.4) * 0.014 * 1.4 * Math.exp(-a * a)
    + Math.cos(phase) * 0.018 * 3.1;
  const light = clamp((0.85 - du * 0.44 - dv * 0.3) / Math.sqrt(1 + du * du + dv * dv), 0, 1);
  const crest = Math.exp(-a * a * 1.4 - Math.pow((v - 0.54) / 0.22, 2));
  return { height: primary + secondary - valley + Math.sin(phase) * 0.018, light, crest, valley: valley / 0.125 };
}

export type PointerField = { x: number; y: number; strength: number };
export function projectSurface(u: number, v: number, time: number, width: number, height: number, overlay: boolean, pointer?: PointerField) {
  const s = surface(u, v, time);
  const x = (u + (v - 0.5) * 0.105 * Math.sin(u * 4.4 + 0.4)) * width;
  let y = (0.18 + Math.pow(v, 1.22) * 0.72 - s.height * (0.72 + v * 0.28)) * height;
  if (overlay && width <= 760) y = y * 0.68 + height * 0.31;
  if (pointer?.strength) {
    const distance = Math.pow((x / width - pointer.x) / 0.14, 2) + Math.pow((y / height - pointer.y) / 0.24, 2);
    y -= Math.exp(-distance * 2) * pointer.strength * height * 0.012;
  }
  const depth = 0.13 + Math.pow(v, 0.85) * 0.87;
  const safe = overlay ? 0.07 + smoothstep(0.28, 0.60, u) * 0.93 : 0.4 + smoothstep(0.12, 0.64, u) * 0.6;
  const shade = clamp((0.14 + s.light * 0.32 + s.crest * 0.82) * depth * (1 - s.valley * 0.68) * safe, 0, 1);
  return { x, y, shade };
}

// Perpendicular projected spacing, not vertical distance. Smoothly suppress
// compressed detail before it becomes a high-contrast subpixel repetition.
export function spacingFade(tx: number, ty: number, dx: number, dy: number, dpr: number, brightness = 0) {
  const gap = Math.abs(tx * dy - ty * dx) / Math.max(0.001, Math.hypot(tx, ty));
  return smoothstep(1.6 + brightness * 0.8, 3.4 + brightness * 0.8, gap * dpr);
}
