// DEV-only v1.0.0 comparison data; never selected by production.
import { DEFAULT_SETTINGS, type Hill } from './gpu-terrain';
// Numeric scene data derived for slug "react-particle-orb" (2026-10-28).
// The reference initializer itself is not copied into this repository.
export const ARTICLE_PHASE = 3592.92236328125;
export const STUDY_HILLS: readonly Hill[] = Object.freeze([
  { x: -1.7411905527114868, z: 2.163837194442749, amplitude: 0.9189984202384949, width: 0.676218569278717 },
  { x: 2.3478200435638428, z: 1.3123552799224854, amplitude: 0.6052551865577698, width: 0.7366002798080444 },
  { x: 1.2220312356948853, z: -1.3832910060882568, amplitude: 1.080142855644226, width: 0.5502471327781677 },
  { x: 4.71652364730835, z: -1.653043508529663, amplitude: 1.0638912916183472, width: 0.5765623450279236 },
].map(hill => Object.freeze(hill)));
export const referenceSettings = { ...DEFAULT_SETTINGS, hills: STUDY_HILLS, phase: ARTICLE_PHASE };
