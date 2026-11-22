export type DioramaPose = 'world' | 'front' | 'tilted';
export type DioramaStatus = DioramaPose | 'moving' | 'unavailable';
export type DioramaCommand = { pose: DioramaPose; sequence: number; reset?: boolean };

export function advanceDiorama(elapsed: number, delta: number, reducedMotion: boolean) {
  const next = reducedMotion ? 1 : Math.min(1, elapsed + Math.min(delta, 0.06) / 0.54);
  return { elapsed: next, progress: next * next * (3 - 2 * next), done: next === 1 };
}
