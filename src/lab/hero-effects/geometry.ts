export const qualities = {
  low: { particles: 6000, lines: 40, samples: 160, dpr: 1 },
  medium: { particles: 14000, lines: 64, samples: 240, dpr: 1.5 },
  high: { particles: 26000, lines: 90, samples: 320, dpr: 2 },
} as const;
export type Quality = keyof typeof qualities;
export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

// Deterministic equal-area shell; one upload per renderer, no per-frame arrays.
export function fibonacciShell(count: number) {
  const points = new Float32Array(count * 4);
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - 2 * (i + 0.5) / count;
    const r = Math.sqrt(1 - y * y);
    points.set([Math.cos(i * goldenAngle) * r, y, Math.sin(i * goldenAngle) * r, (i * 0.61803398875) % 1], i * 4);
  }
  return points;
}

export function orbLayout(width: number, height: number, overlay: boolean) {
  const narrow = width <= 760;
  return {
    x: width * (overlay && !narrow ? 0.72 : 0.5),
    y: height * (overlay && narrow ? 0.74 : 0.5),
    radius: Math.min(width * (overlay && !narrow ? 0.2 : 0.38), height * (overlay && narrow ? 0.22 : 0.37)),
  };
}

// A coherent, layered ribbon surface, rather than independent random sine lines.
export function waveY(u: number, layer: number, time: number) {
  const depth = Math.pow(layer, 1.35);
  const ridge = Math.exp(-Math.pow((u - 0.67) / 0.26, 2));
  return 0.24 + depth * 0.48
    + Math.sin(u * 6.3 - time * 0.16 + layer * 1.6) * 0.075
    + ridge * Math.sin(u * 9.4 + layer * 2.8 - time * 0.11) * (0.12 + layer * 0.055)
    + Math.sin(u * 15.5 + layer * 2.1 + time * 0.08) * 0.022;
}
