import { checkDimensions } from '../image/types';
import type { ImageLimits } from '../image/limits';

// A deliberately small, static SVG subset. Reject unsupported input rather than
// passing the original document to an image decoder or inserting it into the DOM.
export const svgLimits = {bytes: 256 * 1024, nodes: 512, depth: 16, values: 16000} as const;
const ns = 'http://www.w3.org/2000/svg';
const number = '[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?';
const numeric = new RegExp(`^${number}$`);
const common = ['id', 'transform', 'fill', 'fill-opacity', 'fill-rule', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'opacity', 'clip-path'];
const attributes: Record<string, readonly string[]> = {
  svg: ['width', 'height', 'viewBox', 'preserveAspectRatio'], g: [], defs: [],
  path: ['d'], rect: ['x', 'y', 'width', 'height', 'rx', 'ry'], circle: ['cx', 'cy', 'r'],
  ellipse: ['cx', 'cy', 'rx', 'ry'], line: ['x1', 'y1', 'x2', 'y2'], polyline: ['points'], polygon: ['points'],
  linearGradient: ['x1', 'y1', 'x2', 'y2', 'gradientUnits', 'gradientTransform'],
  radialGradient: ['cx', 'cy', 'r', 'fx', 'fy', 'fr', 'gradientUnits', 'gradientTransform'],
  stop: ['offset', 'stop-color', 'stop-opacity'], clipPath: ['clipPathUnits'],
};
const shapes = ['g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon'];
function fail(): never { throw new Error('svg'); }
function numbers(value: string) {
  const values = value.trim().split(/[\s,]+/);
  if (!values.length || values.some(v => !numeric.test(v) || !Number.isFinite(+v) || Math.abs(+v) > 1e6)) fail();
  return values.map(Number);
}
function paint(value: string) { return /^(?:none|#[a-f\d]{3,8}|[a-z]{1,24})$/i.test(value) && !/^(?:inherit|initial|unset|revert|currentcolor)$/i.test(value); }
function pathValues(value: string) {
  const tokenizer = new RegExp(`${number}|[MmLlHhVvCcSsQqTtAaZz]`, 'g'), parts = value.match(tokenizer) ?? [];
  if (value.replace(tokenizer, '').replace(/[\s,]/g, '') || !/^[Mm]$/.test(parts[0] ?? '') || parts.length > svgLimits.values) fail();
  const arities: Record<string, number> = {m:2,l:2,h:1,v:1,c:6,s:4,q:4,t:2,a:7};
  let index = 0, command = '';
  while (index < parts.length) {
    if (/^[a-z]$/i.test(parts[index])) {
      command = parts[index++].toLowerCase();
      if (command === 'z') { command = ''; continue; }
    }
    const count = arities[command]; if (!count) fail();
    let groups = 0;
    while (index < parts.length && !/^[a-z]$/i.test(parts[index])) {
      const group = parts.slice(index, index + count);
      if (group.length !== count || group.some(n => !numeric.test(n) || !Number.isFinite(+n) || Math.abs(+n) > 1e6)) fail();
      if (command === 'a' && (+group[0] < 0 || +group[1] < 0 || !['0','1'].includes(group[3]) || !['0','1'].includes(group[4]))) fail();
      index += count; groups++;
    }
    if (!groups) fail();
  }
  return parts.length;
}

export function sanitizeSvg(text: string, limits: ImageLimits) {
  if (!text || new TextEncoder().encode(text).length > Math.min(svgLimits.bytes, limits.bytes) || /<!|<\?[^x]|<\?xml[^>]*\?>[\s\S]*<\?/i.test(text)) fail();
  // No DTD, entities, comments or processing instructions (apart from one XML declaration).
  const xml = text.replace(/^\uFEFF?\s*<\?xml\s[^?]*\?>/i, '');
  if (/<\?|&/.test(xml)) fail();
  const document = new DOMParser().parseFromString(xml, 'image/svg+xml');
  const root = document.documentElement;
  if (document.querySelector('parsererror') || root.localName !== 'svg' || root.namespaceURI !== ns) fail();
  const output = document.implementation.createDocument(ns, 'svg', null);
  const ids = new Map<string, string>(), references: {id: string; type: 'paint' | 'clip'}[] = [];
  let nodes = 0, values = 0;
  function visit(element: Element, depth: number, inClip = false): Element {
    const tag = element.localName;
    if (++nodes > svgLimits.nodes || depth > svgLimits.depth || element.namespaceURI !== ns || element.prefix || !Object.hasOwn(attributes, tag) || depth > 0 && tag === 'svg' || element.attributes.length > 24) fail();
    if (inClip && !shapes.includes(tag)) fail();
    const target = output.createElementNS(ns, tag);
    for (const attr of Array.from(element.attributes)) {
      const name = attr.name, value = attr.value.trim();
      if (name === 'xmlns' && depth === 0 && value === ns) continue;
      if (attr.namespaceURI || ![...common, ...attributes[tag]].includes(name) || value.length > 64000) fail();
      if (name === 'id') { if (!/^[a-zA-Z][\w-]{0,63}$/.test(value) || ids.has(value)) fail(); ids.set(value, tag); }
      else if (name === 'fill' || name === 'stroke' || name === 'clip-path') {
        const ref = /^url\(#([a-zA-Z][\w-]{0,63})\)$/.exec(value);
        if (ref) { if (inClip || ['clipPath','linearGradient','radialGradient','stop'].includes(tag)) fail(); references.push({id: ref[1], type: name === 'clip-path' ? 'clip' : 'paint'}); }
        else if (name === 'clip-path' ? value !== 'none' : !paint(value)) fail();
      } else if (name === 'd') {
        values += pathValues(value);
      } else if (name === 'transform' || name === 'gradientTransform') {
        let count = 0;
        const rest = value.replace(/(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^()]*)\)/g, (_, fn: string, args: string) => {
          const n = numbers(args), allowed: Record<string, number[]> = {matrix:[6], translate:[1,2], scale:[1,2], rotate:[1,3], skewX:[1], skewY:[1]};
          if (!allowed[fn].includes(n.length) || ++count > 16) fail(); values += n.length; return '';
        });
        if (!count || !/^[\s,]*$/.test(rest)) fail();
      } else if (name === 'viewBox') { const n = numbers(value); if (n.length !== 4 || n[2] <= 0 || n[3] <= 0) fail(); }
      else if (name === 'points') { const n = numbers(value); if (n.length < 4 || n.length % 2) fail(); values += n.length; }
      else if (name === 'preserveAspectRatio') { if (!/^x(?:Min|Mid|Max)Y(?:Min|Mid|Max)(?:\s+(?:meet|slice))?$/.test(value)) fail(); }
      else if (name === 'gradientUnits' || name === 'clipPathUnits') { if (!['userSpaceOnUse','objectBoundingBox'].includes(value)) fail(); }
      else if (name === 'fill-rule') { if (!['nonzero','evenodd'].includes(value)) fail(); }
      else if (name === 'stroke-linecap') { if (!['butt','round','square'].includes(value)) fail(); }
      else if (name === 'stroke-linejoin') { if (!['miter','round','bevel'].includes(value)) fail(); }
      else if (name === 'stop-color') { if (!paint(value) || value === 'none') fail(); }
      else {
        const percentage = value.endsWith('%'), raw = percentage ? value.slice(0, -1) : value;
        if (percentage && !['offset','x1','y1','x2','y2','cx','cy','r','fx','fy','fr'].includes(name)) fail();
        const n = numbers(raw); if (n.length !== 1) fail();
        if ((name.includes('opacity') || name === 'offset') && (n[0] < 0 || n[0] > (percentage ? 100 : 1))) fail();
        if (['width','height','rx','ry','r','fr','stroke-width','stroke-miterlimit'].includes(name) && n[0] < 0) fail();
      }
      if (values > svgLimits.values) fail();
      target.setAttribute(name, value);
    }
    for (const child of Array.from(element.childNodes)) {
      if (child.nodeType === 3 && !child.textContent?.trim()) continue;
      if (child.nodeType !== 1) fail();
      const next = child as Element;
      if (['linearGradient','radialGradient'].includes(tag) && next.localName !== 'stop' || tag === 'stop' || tag === 'defs' && !['linearGradient','radialGradient','clipPath', ...shapes].includes(next.localName)) fail();
      target.append(visit(next, depth + 1, inClip || tag === 'clipPath'));
    }
    return target;
  }
  const sanitized = visit(root, 0);
  for (const ref of references) if (!(ref.type === 'clip' ? ids.get(ref.id) === 'clipPath' : ['linearGradient','radialGradient'].includes(ids.get(ref.id) ?? ''))) fail();
  const box = sanitized.getAttribute('viewBox');
  const viewBox = box ? numbers(box) : undefined;
  const width = Number(sanitized.getAttribute('width') ?? viewBox?.[2]);
  const height = Number(sanitized.getAttribute('height') ?? viewBox?.[3]);
  checkDimensions(width, height, limits);
  sanitized.setAttribute('width', String(width)); sanitized.setAttribute('height', String(height));
  return {xml: new XMLSerializer().serializeToString(sanitized), width, height};
}
