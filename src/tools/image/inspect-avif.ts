import { Reader, exifOrientation } from './inspect-image';
import { checkDimensions, ImageFailure, type ImageInfo } from './types';
import type { ImageLimits } from './limits';
import { avifSequence } from './avif-sequence';

const ensure = (ok: unknown): void => { if (!ok) throw new ImageFailure('avifVariant'); };
const text = (a: Uint8Array) => String.fromCharCode(...a);
const v = (a: Uint8Array) => new DataView(a.buffer, a.byteOffset, a.byteLength);
const n16 = (a: Uint8Array, p = 0) => v(a).getUint16(p);
const n32 = (a: Uint8Array, p = 0) => v(a).getUint32(p);
type Box = { type: string; data: number; end: number };
type Item = { type: string; name: string; start: number; end: number; props: Box[] };

/** A deliberately small HEIF subset, not a general BMFF/HEIF parser.
 * One primary av01 + optional alpha; bounded EXIF/XMP input items. No grids,
 * tracks, idat, layers, gain maps, profiles or unknown boxes. All mdat bytes
 * must belong to nonoverlapping declared extents. Native decode is still required.
 */
export async function inspectAvif(blob: Blob, limits: ImageLimits, output = false, canvasColors?: number[]): Promise<ImageInfo> {
  const r = new Reader(blob);
  let count = 0;
  async function boxes(start: number, end: number) {
    const list: Box[] = [];
    for (let p = start; p < end;) {
      ensure(++count <= 256 && end - p >= 8);
      const h = await r.read(p, 8);
      let size = n32(h), header = 8;
      if (size === 1) {
        const big = v(await r.read(p + 8, 8)).getBigUint64(0);
        ensure(big <= BigInt(Number.MAX_SAFE_INTEGER)); size = Number(big); header = 16;
      }
      ensure(size >= header && p + size <= end);
      list.push({ type: text(h.subarray(4)), data: p + header, end: p + size }); p += size;
    }
    return list;
  }
  async function data(b: Box, max = 65536) {
    ensure(b.end - b.data <= max); return r.read(b.data, b.end - b.data);
  }
  function one(list: Box[], type: string) {
    const match = list.filter(b => b.type === type); ensure(match.length === 1); return match[0];
  }
  function exact(list: Box[], allowed: string[]) {
    ensure(list.every(b => allowed.includes(b.type)) && new Set(list.map(b => b.type)).size === list.length);
  }
  const full = async (b: Box) => { const a = await data(b); ensure(n32(a) === 0); return a; };
  const top = await boxes(0, blob.size);
  if (top.some(b => ['moov', 'moof'].includes(b.type))) throw new ImageFailure('animated');
  exact(top, ['ftyp', 'meta', 'mdat']);
  ensure(top[0].type === 'ftyp');
  const ftyp = await data(one(top, 'ftyp'), 128);
  ensure(ftyp.length >= 12 && ftyp.length % 4 === 0 && n32(ftyp, 4) === 0);
  const brands = [text(ftyp.subarray(0, 4))];
  for (let p = 8; p < ftyp.length; p += 4) brands.push(text(ftyp.subarray(p, p + 4)));
  if (brands.includes('avis')) throw new ImageFailure('animated');
  ensure(brands.includes('avif') && brands.every(b => ['avif', 'mif1', 'miaf', 'MA1B', 'MA1A'].includes(b)));
  const meta = one(top, 'meta'), mdat = one(top, 'mdat');
  ensure(meta.end - meta.data <= 1024 ** 2 && n32(await r.read(meta.data, 4)) === 0);
  const children = await boxes(meta.data + 4, meta.end);
  exact(children, ['hdlr', 'pitm', 'iloc', 'iinf', 'iref', 'iprp']);
  const hdlr = await full(one(children, 'hdlr'));
  ensure(hdlr.length >= 25 && hdlr.length <= 96 && n32(hdlr, 4) === 0 && text(hdlr.subarray(8, 12)) === 'pict');
  ensure(hdlr.subarray(12, 24).every(b => b === 0) && hdlr.at(-1) === 0);
  if (output) ensure(text(hdlr.subarray(24)) === 'libavif\0'); // fixed encoder, no free-form handler metadata
  const pitm = await full(one(children, 'pitm')); ensure(pitm.length === 6);
  const primary = n16(pitm, 4);
  const iinf = one(children, 'iinf'), ih = await r.read(iinf.data, 6);
  ensure(n32(ih) === 0 && n16(ih, 4) >= 1 && n16(ih, 4) <= 4);
  const entries = await boxes(iinf.data + 6, iinf.end);
  ensure(entries.length === n16(ih, 4));
  const items = new Map<number, Item>();
  for (const entry of entries) {
    ensure(entry.type === 'infe'); const a = await data(entry, 256);
    ensure(a.length >= 13 && n32(a) === 0x02000000 && n16(a, 6) === 0);
    const id = n16(a, 4), type = text(a.subarray(8, 12)), end = a.indexOf(0, 12);
    ensure(id > 0 && !items.has(id) && end >= 12);
    ensure(type === 'av01' || !output && ['Exif', 'mime'].includes(type));
    if (type === 'mime') ensure(text(a.subarray(end + 1)) === 'application/rdf+xml\0');
    else ensure(end === a.length - 1);
    const name = text(a.subarray(12, end));
    if (output) ensure(['Color', 'Alpha'].includes(name));
    items.set(id, { type, name, start: 0, end: 0, props: [] });
  }
  ensure(items.get(primary)?.type === 'av01');
  const iloc = await full(one(children, 'iloc'));
  ensure(iloc.length === 8 + items.size * 14 && iloc[4] === 0x44 && iloc[5] === 0 && n16(iloc, 6) === items.size);
  const located = new Set<number>();
  for (let p = 8; p < iloc.length; p += 14) {
    const id = n16(iloc, p), item = items.get(id);
    ensure(item && !located.has(id) && n16(iloc, p + 2) === 0 && n16(iloc, p + 4) === 1);
    const start = n32(iloc, p + 6), length = n32(iloc, p + 10);
    ensure(length > 0 && start >= mdat.data && start + length <= mdat.end);
    item!.start = start; item!.end = start + length; located.add(id);
  }
  let cursor = mdat.data;
  for (const item of [...items.values()].sort((a, b) => a.start - b.start)) {
    ensure(item.start === cursor); cursor = item.end;
    if (item.type === 'Exif') {
      ensure(item.end - item.start <= 65536);
      const a = await r.read(item.start, item.end - item.start), skip = n32(a);
      ensure(skip <= a.length - 12);
      if (exifOrientation(a.subarray(4 + skip)) !== 1) throw new ImageFailure('orientation');
    } else if (item.type === 'mime') ensure(item.end - item.start <= 65536);
  }
  ensure(cursor === mdat.end);
  const refs: { type: string; from: number; to: number }[] = [];
  const iref = children.find(b => b.type === 'iref');
  if (iref) {
    ensure(n32(await r.read(iref.data, 4)) === 0);
    for (const ref of await boxes(iref.data + 4, iref.end)) {
      const a = await data(ref, 6);
      ensure(a.length === 6 && n16(a, 2) === 1 && n16(a, 4) === primary && items.has(n16(a)));
      const from = n16(a); ensure(from !== primary && !refs.some(r => r.from === from));
      ensure(items.get(from)!.type === 'av01' ? ref.type === 'auxl' : ref.type === 'cdsc');
      refs.push({ type: ref.type, from, to: primary });
    }
  }
  ensure(refs.length === items.size - 1 && refs.filter(r => r.type === 'auxl').length <= 1);
  const iprp = one(children, 'iprp'), ips = await boxes(iprp.data, iprp.end);
  exact(ips, ['ipco', 'ipma']);
  const ipco = one(ips, 'ipco'), props = await boxes(ipco.data, ipco.end);
  ensure(props.length > 0 && props.length <= 24 && props.every(b => ['ispe', 'pixi', 'av1C', 'colr', 'auxC', 'irot'].includes(b.type)));
  const ipma = await full(one(ips, 'ipma')); let p = 8;
  ensure(n32(ipma, 4) === [...items.values()].filter(i => i.type === 'av01').length);
  const associated = new Set<number>(), used = new Set<number>();
  while (p < ipma.length) {
    ensure(p + 3 <= ipma.length); const id = n16(ipma, p), n = ipma[p + 2]; p += 3;
    ensure(items.get(id)?.type === 'av01' && !associated.has(id) && n > 0 && p + n <= ipma.length);
    associated.add(id);
    for (let i = 0; i < n; i++) {
      const index = ipma[p++] & 0x7f;
      ensure(index > 0 && index <= props.length && !items.get(id)!.props.includes(props[index - 1]));
      items.get(id)!.props.push(props[index - 1]); used.add(index);
    }
  }
  ensure(associated.size === n32(ipma, 4) && used.size === props.length);
  let width = 0, height = 0, orientation = 1;
  for (const [id, item] of items) {
    if (item.type !== 'av01') { ensure(item.props.length === 0); continue; }
    exact(item.props, ['ispe', 'pixi', 'av1C', 'colr', 'auxC', 'irot']);
    const alpha = id !== primary;
    const ispe = await full(one(item.props, 'ispe')); ensure(ispe.length === 12);
    const w = n32(ispe, 4), h = n32(ispe, 8); checkDimensions(w, h, limits);
    if (!alpha) { width = w; height = h; }
    const pixi = await full(one(item.props, 'pixi'));
    ensure(pixi.length === (alpha ? 6 : 8) && pixi[4] === (alpha ? 1 : 3) && pixi.subarray(5).every(b => b === 8));
    const config = await data(one(item.props, 'av1C'), 4);
    ensure(config.length === 4 && config[0] === 0x81 && config[3] === 0 && !(config[2] & 0xe0));
    let colors: number[] | undefined;
    if (alpha) {
      const aux = await full(one(item.props, 'auxC'));
      ensure(text(aux.subarray(4)) === 'urn:mpeg:mpegB:cicp:systems:auxiliary:alpha\0' && !item.props.some(p => ['colr', 'irot'].includes(p.type)));
      const main = items.get(primary)!, size = await full(one(main.props, 'ispe'));
      ensure(w === n32(size, 4) && h === n32(size, 8));
    } else {
      ensure(!item.props.some(p => p.type === 'auxC'));
      const colr = await data(one(item.props, 'colr'), 11);
      ensure(colr.length === 11 && text(colr.subarray(0, 4)) === 'nclx');
      colors = [n16(colr, 4), n16(colr, 6), n16(colr, 8)];
      // Explicit BT.709 primaries + SDR transfer only. ICC/HDR/unspecified color is not silently flattened.
      if (output && canvasColors && n16(colr, 4) === 2 && n16(colr, 6) === 2 && n16(colr, 8) === 6 && colr[10] === 128)
        canvasColors.push(one(item.props, 'colr').data + 4);
      else ensure(n16(colr, 4) === 1 && [1, 13].includes(n16(colr, 6)) && [0, 1, 6].includes(n16(colr, 8)) && colr[10] === 128);
      const rotate = item.props.find(b => b.type === 'irot');
      if (rotate) { const a = await data(rotate, 1); ensure(a.length === 1 && a[0] <= 3); orientation = [1, 8, 3, 6][a[0]]; }
      if (output) ensure(orientation === 1);
    }
    let q = item.start, sequences = 0, frames = 0;
    while (q < item.end) {
      ensure(++count <= 256); const header = await r.byte(q++), type = (header >> 3) & 15;
      ensure(!(header & 0x85) && !!(header & 2)); // no forbidden/reserved/extension bits
      let size = 0, done = false;
      for (let n = 0; n < 5; n++) { const byte = await r.byte(q++); size += (byte & 127) * 2 ** (7 * n); if (!(byte & 128)) { done = true; break; } }
      ensure(done && q + size <= item.end);
      if (type === 1) {
        ensure(++sequences === 1 && frames === 0 && size > 0 && size <= 64);
        const seq = avifSequence(await r.read(q, size));
        ensure(seq.width === w && seq.height === h && seq.mono === Number(alpha));
        ensure(config[1] === seq.profile * 32 + seq.level && config[2] === seq.mono * 16 + seq.sx * 8 + seq.sy * 4 + seq.position);
        if (colors) ensure(seq.range === 1 && [seq.primaries, seq.transfer, seq.matrix].every((value, i) => value === 2 || value === colors![i]));
      } else if (type === 6) ensure(sequences === 1 && ++frames === 1 && size > 0);
      else ensure(type === 2 && size === 0 && frames === 0); // temporal delimiter only
      q += size;
    }
    ensure(sequences === 1 && frames === 1);
  }
  return { format: 'avif', width, height, orientation };
}

/** Only for the pinned encoder fed explicit Canvas sRGB RGBA. libavif's wrapper
 * leaves primaries/transfer unspecified; declare the known source interpretation
 * without changing AV1 pixels or claiming to convert arbitrary input profiles. */
export async function qualifyCanvasAvif(blob: Blob, limits: ImageLimits) {
  const offsets: number[] = [];
  await inspectAvif(blob, limits, true, offsets);
  ensure(offsets.length === 1);
  const at = offsets[0];
  return new Blob([blob.slice(0, at), new Uint8Array([0, 1, 0, 13]), blob.slice(at + 4)], { type: 'image/avif' });
}
