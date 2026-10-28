import { DEFAULT_SETTINGS, hillCenter, terrainSample, projectPoint, sceneField, focusWeight, type TerrainSettings } from './gpu-terrain';

// Mulberry32, Tommy Ettinger (2017), CC0; see NOTICE.md.
export function mulberry32(seed: number) {
  let word = seed >>> 0;
  return () => {
    word = (word + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(word ^ (word >>> 15), word | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

/** Small CPU composition check, including the narrowest (320px / .78) crop.
 * Optical constants and mesh density are never randomized. This is a heuristic,
 * not a substitute for looking at fixed seeds in a real browser. */
export function scoreScene(settings: TerrainSettings) {
  const hills = settings.hills;
  const bounded = hills.length === 4 && Number.isFinite(settings.phase) && hills.every(h =>
    [h.x, h.z, h.amplitude, h.width].every(Number.isFinite) &&
    Math.abs(h.x) <= 5.1 && Math.abs(h.z) <= 2.5 && h.amplitude >= .6 && h.amplitude <= 1.35 && h.width >= .48 && h.width <= .85);
  const amplitudeSpread = Math.max(...hills.map(h => h.amplitude)) - Math.min(...hills.map(h => h.amplitude));
  const widthSpread = Math.max(...hills.map(h => h.width)) - Math.min(...hills.map(h => h.width));
  let separation = Infinity, maxHeight = 0, maxSlope = 0, minY = Infinity;
  let mobileRelief = Infinity, mobilePeak = Infinity, quietEnergy = 0, rightEnergy = 0, folds = 0, count = 0, valleys = 0;
  const field = sceneField(1440, 576), halfCrop = 320 / .78 / 2;
  for (const time of [0, 36]) {
    const centers = hills.map((hill, index) => hillCenter(hill, index, .075 * (time + settings.phase)));
    for (let a = 0; a < centers.length; a++) for (let b = a + 1; b < centers.length; b++)
      separation = Math.min(separation, Math.hypot(centers[a].x - centers[b].x, centers[a].z - centers[b].z));
    let mobileMin = Infinity, mobileMax = -Infinity, peak = 0;
    for (let row = 0; row <= 24; row++) for (let column = 0; column <= 40; column++) {
      const u = column / 40, v = row / 24, q = .65 + .8 * v;
      const sample = terrainSample((u - .5) * 12, (v - .5) * 8, time, settings);
      const p = projectPoint(u, v, sample.height, field);
      maxHeight = Math.max(maxHeight, sample.height); maxSlope = Math.max(maxSlope, Math.hypot(sample.dx, sample.dz));
      if (p.x >= 0 && p.x <= 1440) minY = Math.min(minY, p.y);
      count++; if (sample.height < .24) valleys++;
      // Reject widespread folded walls; some localized grazing folds are intrinsic
      // to the reference projection and create its characteristic silver ridges.
      if (2 - .68 * (8 * sample.dz * q + .8 * sample.height) < -1.8) folds++;
      if (Math.abs(p.x - 720) <= halfCrop && v > .3 && v < .9 && p.y > 180 && p.y < 548) {
        mobileMin = Math.min(mobileMin, sample.height); mobileMax = Math.max(mobileMax, sample.height);
        peak = Math.max(peak, sample.height);
      }
      const normalLength = Math.hypot(sample.dx, 1, sample.dz);
      const viewX = -.045 * (u - .5) * 12, viewLength = Math.hypot(viewX, .42, 1);
      const dot = (-sample.dx * viewX + .42 - sample.dz) / normalLength / viewLength;
      const energy = (0.5 + 1.2 * Math.pow(1 - Math.abs(dot), 4) * Math.pow(focusWeight(v), 3));
      if (p.y > 60 && p.y < 540 && p.x >= 0 && p.x < 1440 * .38) quietEnergy += energy * .18; // existing text veil
      if (p.y > 60 && p.y < 540 && p.x > 1440 * .45 && p.x < 1440) rightEnergy += energy;
    }
    mobileRelief = Math.min(mobileRelief, mobileMax - mobileMin); mobilePeak = Math.min(mobilePeak, peak);
  }
  const foldRatio = folds / count, valleyRatio = valleys / count, quietRatio = quietEnergy / Math.max(1, rightEnergy);
  const valid = bounded && amplitudeSpread >= .18 && widthSpread >= .055 && separation > 1.65 &&
    maxHeight < 1.75 && maxSlope < 1.65 && minY > 40 && mobileRelief > .45 && mobilePeak > .55 &&
    foldRatio < .07 && valleyRatio > .25 && quietRatio < .32;
  const score = mobileRelief * 2 + amplitudeSpread + widthSpread + valleyRatio - foldRatio * 6 - quietRatio;
  return { valid, score, mobileRelief, mobilePeak, maxHeight, maxSlope, minY, separation, foldRatio, valleyRatio, quietRatio };
}

export function createScene(seed: number) {
  const random = mulberry32(seed), range = (a: number, b: number) => a + random() * (b - a);
  let best: { settings: TerrainSettings; metrics: ReturnType<typeof scoreScene>; candidate: number } | undefined;
  // Independent transverse bands; not a jitter of Wavefield's article initializer.
  for (let candidate = 1; candidate <= 8; candidate++) {
    const settings: TerrainSettings = { ...DEFAULT_SETTINGS, phase: range(0, 84), hills: [
      { x: range(-4.5, -3.1), z: range(-2.1, 1.5), amplitude: range(.6, 1.05), width: range(.52, .8) },
      { x: range(-1.8, -.5), z: range(.7, 2.4), amplitude: range(.75, 1.3), width: range(.48, .75) },
      { x: range(.9, 2.4), z: range(-2.2, .3), amplitude: range(.85, 1.35), width: range(.48, .74) },
      { x: range(3.5, 5), z: range(-1.9, 2.2), amplitude: range(.6, 1.15), width: range(.52, .85) },
    ] };
    const metrics = scoreScene(settings);
    if (metrics.valid && (!best || metrics.score > best.metrics.score)) best = { settings, metrics, candidate };
  }
  return { seed: seed >>> 0, fallback: !best, ...(best ?? { settings: { ...DEFAULT_SETTINGS }, metrics: scoreScene(DEFAULT_SETTINGS), candidate: 0 }) };
}

export function documentSeed(qa: string | null, cryptoSource: Pick<Crypto, 'getRandomValues'> = crypto) {
  if (qa !== null && /^\d{1,10}$/.test(qa) && Number(qa) <= 0xffffffff) return Number(qa);
  return cryptoSource.getRandomValues(new Uint32Array(1))[0];
}
