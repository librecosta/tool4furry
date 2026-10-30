import { ImageFailure } from './types';

const require = (ok: unknown): void => { if (!ok) throw new ImageFailure('avifVariant'); };
/** Restricted reduced-still-picture sequence. No video, scalable layers, HDR or 10/12-bit. */
export function avifSequence(a: Uint8Array) {
  let p = 0;
  const bits = (n: number) => {
    require(p + n <= a.length * 8);
    let value = 0;
    for (let i = 0; i < n; i++, p++) value = value * 2 + ((a[p >> 3] >> (7 - p % 8)) & 1);
    return value;
  };
  const profile = bits(3);
  require(profile <= 1 && bits(1) === 1 && bits(1) === 1);
  const level = bits(5), wb = bits(4) + 1, hb = bits(4) + 1;
  const width = bits(wb) + 1, height = bits(hb) + 1;
  bits(3); // superblock/filter-intra/intra-edge-filter
  require(bits(1) === 0); // no super-resolution
  bits(2); // CDEF / restoration
  require(bits(1) === 0); // 8-bit only
  const mono = profile === 1 ? 0 : bits(1);
  let primaries = 2, transfer = 2, matrix = 2;
  if (bits(1)) { primaries = bits(8); transfer = bits(8); matrix = bits(8); }
  require([1, 2].includes(primaries) && [1, 2, 13].includes(transfer) && [0, 1, 2, 6].includes(matrix));
  let sx = 0, sy = 0, position = 0, range = 1;
  if (mono) { range = bits(1); sx = sy = 1; }
  else {
    if (!(primaries === 1 && transfer === 13 && matrix === 0)) {
      range = bits(1); sx = sy = profile === 0 ? 1 : 0;
      if (sx && sy) position = bits(2);
    }
    bits(1); // separate_uv_delta_q
  }
  require(bits(1) === 0); // no film grain / hidden side metadata
  require(bits(1) === 1); // trailing_one_bit
  while (p < a.length * 8) require(bits(1) === 0);
  return { profile, level, width, height, mono, sx, sy, position, range, primaries, transfer, matrix };
}
