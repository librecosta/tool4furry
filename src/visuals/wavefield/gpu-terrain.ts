/*! Wavefield v1.0.0 (3e5ad2f), Copyright (c) 2026 LibreCosta. BSD-3-Clause; see NOTICE.md. */
/** Shared Wavefield height/projection/optics math; site compositions live in scenes.ts. */
export type Hill = { x: number; z: number; amplitude: number; width: number };
export type Quality = "adaptive" | "reference";
export type TerrainSettings = {
  hills: readonly Hill[]; phase: number; relief: number; span: number;
  focus: number; softness: number; lineSize: number;
  mainAlpha: number; crossAlpha: number; rim: number; opacity: number;
  framing: number; vertical: number; quality: Quality;
  speed: number; frameLimit: number; entrance: boolean;
};
export const HILL_ASPECTS = [1.35, 1.11, 1.4, 1.35] as const;
export const DETAIL_WAVES = [
  { x: 3.2, z: 2.3, amplitude: 0.035, rate: 1 },
  { x: 6.1, z: -4.7, amplitude: 0.015, rate: -0.8 },
  { x: 0.85, z: 1.2, amplitude: 0.1, rate: -1 },
] as const;
// Tool4Furry's independently chosen safe composition, not the article preset.
export const SAFE_HILLS: readonly Hill[] = Object.freeze([
  { x: -3.8, z: -0.9, amplitude: 0.72, width: 0.60 },
  { x: -1.1, z: 1.9, amplitude: 1.02, width: 0.61 },
  { x: 1.7, z: -1.2, amplitude: 1.22, width: 0.54 },
  { x: 4.2, z: 0.5, amplitude: 0.83, width: 0.70 },
].map(hill => Object.freeze(hill)));
export const DEFAULT_SETTINGS: Readonly<TerrainSettings> = Object.freeze({
  hills: SAFE_HILLS, phase: 17, relief: 1, span: 1,
  focus: 0.58, softness: 1, lineSize: 1.25,
  mainAlpha: 0.72, crossAlpha: 0.14, rim: 1, opacity: 1,
  framing: 1, vertical: 0, quality: "reference", speed: 1, frameLimit: 24, entrance: false,
});

export function smoothstep(a: number, b: number, value: number) {
  const x = Math.max(0, Math.min(1, (value - a) / (b - a)));
  return x * x * (3 - 2 * x);
}

/** The four measured drift families, with no forced 48-second loop. */
export function hillCenter(hill: Hill, index: number, phase: number) {
  const shifts = [
    [0.32 * Math.sin(phase), 0.25 * Math.cos(phase * 0.8)],
    [0.38 * Math.cos(phase * 0.7), 0.35 * Math.sin(phase * 0.9)],
    [0.30 * Math.sin(phase * 0.6), 0],
    [0, 0.25 * Math.cos(phase)],
  ];
  return { x: hill.x + shifts[index][0], z: hill.z + shifts[index][1] };
}

/** CPU oracle in world coordinates. GPU uses the same parameters/analytic derivatives. */
export function terrainSample(x: number, z: number, time: number, settings = DEFAULT_SETTINGS) {
  const phase = 0.075 * (time + settings.phase);
  let height = 0, dx = 0, dz = 0;
  settings.hills.forEach((hill, index) => {
    const center = hillCenter(hill, index, phase);
    const wx = hill.width / settings.span, wz = wx * HILL_ASPECTS[index];
    const ox = x - center.x, oz = z - center.z;
    const contribution = hill.amplitude * Math.exp(-(ox * ox * wx * wx + oz * oz * wz * wz));
    height += contribution; dx -= 2 * contribution * ox * wx * wx; dz -= 2 * contribution * oz * wz * wz;
  });
  for (const wave of DETAIL_WAVES) {
    const angle = wave.x * x + wave.z * z + phase * wave.rate;
    height += wave.amplitude * Math.sin(angle);
    const derivative = wave.amplitude * Math.cos(angle);
    dx += derivative * wave.x; dz += derivative * wave.z;
  }
  return { height: height * settings.relief, dx: dx * settings.relief, dz: dz * settings.relief };
}

export function focusWeight(depth: number, focus = 0.58) {
  return 1 - smoothstep(0.07, 0.38, Math.abs(depth - focus));
}
export function lineOptics(depth: number, settings = DEFAULT_SETTINGS) {
  const focus = focusWeight(depth, settings.focus);
  const sigma = settings.lineSize * (0.32 + 2.16 * (1 - focus) * settings.softness);
  const energy = Math.min(1, 0.34 * settings.lineSize / sigma);
  return { focus, sigma, energy };
}

export function gpuViewport(width: number, height: number, dpr: number, limit: number) {
  const w = Math.max(1, width), h = Math.max(1, height), maximum = Math.max(1, Math.floor(limit));
  const ratio = Math.min(Math.max(1, dpr), 1.5, maximum / w, maximum / h);
  return { width: w, height: h, dpr: ratio,
    pixelWidth: Math.min(maximum, Math.max(1, Math.round(w * ratio))),
    pixelHeight: Math.min(maximum, Math.max(1, Math.round(h * ratio))) };
}
// Fixed design-space framing; CSS poster shares this scale and bottom anchor.
export function sceneField(width: number, height: number, _settings = DEFAULT_SETTINGS) {
  const scale = Math.max(0.78, width / 1440);
  return { x: width * 0.5, y: height - 288 * scale,
    halfWidth: 720 * scale, halfHeight: 288 * scale };
}
export function projectPoint(u: number, v: number, height: number, field: ReturnType<typeof sceneField>) {
  const perspective = 0.65 + 0.8 * v;
  const horizontal = Math.max(field.halfWidth, 2.2 * field.halfHeight);
  const crop = 1 - field.halfWidth / horizontal;
  return { x: field.x + (((u - 0.5) * 12 / 5) * perspective - crop * 0.3) * horizontal,
    y: field.y + (-0.5 + 2 * v - 0.68 * height * perspective) * field.halfHeight };
}
export function gpuMeshBudget(width: number, quality: Quality = "adaptive") {
  const reduced = quality === "adaptive" && width < 560;
  const columns = reduced ? 128 : 192, rows = reduced ? 96 : 112;
  return { columns, rows, nodeCount: (columns + 1) * (rows + 1), instanceCount: 2 * columns * rows };
}
export function gpuUnavailableReason(secure: boolean, gpu: unknown): string | null {
  if (!secure) return "WebGPU requires HTTPS or localhost.";
  if (!gpu) return "WebGPU is not available in this browser.";
  return null;
}

export const UNIFORM_FLOATS = 52;
export function writeUniforms(out: Float32Array, width: number, height: number, dpr: number,
  time: number, settings: TerrainSettings) {
  const field = sceneField(width, height, settings), mesh = gpuMeshBudget(width, settings.quality);
  const phase = 0.075 * (time + settings.phase);
  out.set([width, height, phase, dpr, field.x, field.y, field.halfWidth, field.halfHeight,
    mesh.columns, mesh.rows, mesh.nodeCount, 0,
    settings.focus, settings.lineSize, settings.softness, settings.rim,
    settings.mainAlpha, settings.crossAlpha, settings.opacity, settings.entrance ? smoothstep(0, 1.2, time) : 1,
    settings.relief, settings.span, 0, 0,
    0.24427, 0.59749, 1, 0, 0.92757, 0.92224, 0.89912, 0]);
  settings.hills.forEach((hill, index) => {
    const center = hillCenter(hill, index, phase);
    out.set([center.x, center.z, hill.amplitude, hill.width], 32 + index * 4);
  });
  out.set(HILL_ASPECTS, 48);
  return mesh;
}
