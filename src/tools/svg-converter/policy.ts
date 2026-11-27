import { parse, generate, walk, type CssNode, type Declaration } from 'css-tree';
import { inspectImage } from '../image/inspect-image';
import { mime } from '../image/types';
import { fail, MiB } from '../general/bounds';

export const svgNamespace = 'http://www.w3.org/2000/svg';
const xlink = 'http://www.w3.org/1999/xlink';
const xml = 'http://www.w3.org/XML/1998/namespace';
const xmlns = 'http://www.w3.org/2000/xmlns/';
export const svgInputLimit = 32 * MiB;
export const sourceEditorLimit = 512 * 1024;
const pathBudget = 2 * MiB;
const embeddedImageLimit = 20 * MiB;
const elementLimit = 20_000;

const words = (value: string) => new Set(value.split(/\s+/).filter(Boolean));
const elements = words('svg g defs title desc metadata a switch rect circle ellipse line polyline polygon path text tspan textPath linearGradient radialGradient stop clipPath mask pattern marker symbol use image style filter feBlend feColorMatrix feComponentTransfer feFuncR feFuncG feFuncB feFuncA feComposite feDropShadow feFlood feGaussianBlur feMerge feMergeNode feOffset feMorphology feTile feTurbulence');
// SVG links are allowed as inert groups only when they contain no href.
const props = words('color fill fill-opacity fill-rule stroke stroke-width stroke-opacity stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit opacity clip-path clip-rule mask filter marker marker-start marker-mid marker-end stop-color stop-opacity flood-color flood-opacity color-interpolation color-interpolation-filters display visibility overflow vector-effect paint-order shape-rendering image-rendering text-rendering font font-family font-size font-weight font-style font-stretch font-kerning font-feature-settings font-variant font-variant-ligatures letter-spacing word-spacing text-anchor text-decoration dominant-baseline alignment-baseline baseline-shift direction unicode-bidi white-space transform transform-origin transform-box x y cx cy r rx ry width height mask-type mix-blend-mode isolation');
const attrs = words('id class role tabindex version viewBox preserveAspectRatio x y z x1 y1 x2 y2 cx cy fx fy r fr rx ry width height d points pathLength dx dy rotate textLength lengthAdjust startOffset method spacing side gradientUnits gradientTransform spreadMethod offset clipPathUnits maskUnits maskContentUnits patternUnits patternContentUnits patternTransform markerUnits markerWidth markerHeight orient refX refY filterUnits primitiveUnits in in2 result type values mode operator k1 k2 k3 k4 stdDeviation radius edgeMode baseFrequency numOctaves seed stitchTiles tableValues slope intercept amplitude exponent aria-label aria-hidden');
const functions = words('rgb rgba hsl hsla hwb lab lch oklab oklch color color-mix calc min max clamp matrix matrix3d translate translatex translatey scale scalex scaley rotate skew skewx skewy');
const fontProps = words('font-family src font-style font-weight font-stretch unicode-range font-display');
const selectorNodes = words('SelectorList Selector TypeSelector ClassSelector IdSelector Combinator');
const referenceProps = words('fill stroke clip-path mask filter marker marker-start marker-mid marker-end');
const effectElements = words('filter pattern mask');
const numeric = '[+-]?(?:\\d+\\.?\\d*|\\.\\d+)(?:e[+-]?\\d+)?';
const unitSize: Record<string, number> = { '': 1, px: 1, in: 96, cm: 96 / 2.54, mm: 96 / 25.4, q: 96 / 101.6, pt: 96 / 72, pc: 16 };
const simpleId = /^[\p{L}\p{N}_.:-]+$/u;
const drawingContainers = words('svg g defs clipPath mask pattern marker symbol filter');

function policyError(zh: string, en: string, detail = ''): never {
  fail('SVG 无法处理。' + zh + detail, 'SVG cannot be processed. ' + en + detail);
}

function parseXml(input: string) {
  if (input.length > svgInputLimit || new TextEncoder().encode(input).byteLength > svgInputLimit)
    policyError('源码超过 32 MiB。', 'Source exceeds 32 MiB.');
  if (/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(input)) policyError('禁止 DTD 和实体声明。', 'DTD and entity declarations are blocked.');
  const doc = new DOMParser().parseFromString(input, 'image/svg+xml');
  const root = doc.documentElement;
  if (root.localName !== 'svg' || root.namespaceURI !== svgNamespace || doc.getElementsByTagName('parsererror').length)
    policyError('XML 格式无效或缺少 SVG 根元素。', 'Invalid XML or missing SVG root element.');
  for (const node of doc.childNodes)
    if (node.nodeType === 7 || node.nodeType === 10)
      policyError('不支持 XML 处理指令。', 'XML processing instructions are unsupported.');
  return root;
}

function viewBoxOf(node: Element) {
  const value = node.getAttribute('viewBox');
  if (value === null) return undefined;
  const pieces = value.trim().split(/(?:\s*,\s*|\s+)/);
  const numbers = pieces.map(Number);
  if (pieces.length !== 4 || pieces.some(part => !new RegExp('^' + numeric + '$', 'i').test(part))
    || numbers.some(n => !Number.isFinite(n) || Math.abs(n) > 1e7) || numbers[2] <= 0 || numbers[3] <= 0)
    policyError('viewBox 必须包含有效坐标及正数宽高。', 'viewBox must have valid coordinates and positive dimensions.');
  return numbers as [number, number, number, number];
}

function absolute(value: string | null) {
  const match = value?.trim().match(new RegExp('^(' + numeric + ')(px|in|cm|mm|q|pt|pc)?$', 'i'));
  if (!match) return undefined;
  const n = Number(match[1]) * unitSize[(match[2] ?? '').toLowerCase()];
  if (!Number.isFinite(n) || n <= 0 || n > 1e7)
    policyError('SVG 固有尺寸无效。', 'Invalid SVG intrinsic dimensions.');
  return n;
}

function dataBytes(value: string, type: string) {
  const prefix = 'data:' + type + ';base64,';
  const payload = value.startsWith(prefix) ? value.slice(prefix.length) : '';
  if (!payload || payload.length % 4 !== 0 || !/^[\w+/]+={0,2}$/.test(payload) || payload.includes('_'))
    return policyError('内嵌资源必须使用有效的 Base64 数据。', 'Embedded resources require valid base64.');
  try {
    const binary = atob(payload);
    const result = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) result[i] = binary.charCodeAt(i);
    return result;
  }
  catch { return policyError('内嵌 Base64 数据无效。', 'Embedded base64 data is invalid.'); }
}

interface Context {
  references: Map<Element, Set<string>>;
  images: Set<string>;
  fonts: Map<string, 'woff' | 'woff2'>;
}

function reference(context: Context, owner: Element, value: string) {
  if (!value.startsWith('#') || !simpleId.test(value.slice(1)))
    policyError('仅支持同一 SVG 内的资源引用。', 'Resource references must point inside this SVG.');
  const targets = context.references.get(owner) ?? new Set<string>();
  targets.add(value.slice(1));
  if (targets.size > 16) policyError('单个元素引用过多。', 'An element has too many references.');
  context.references.set(owner, targets);
}

function parseCss(source: string, context: 'stylesheet' | 'declarationList' | 'value') {
  try {
    const ast = parse(source, { context, onParseError: (error) => { throw error; } });
    walk(ast, node => {
      if (node.type === 'Raw') policyError('无法解析 CSS。', 'Unable to parse CSS.');
    });
    return ast;
  } catch {
    return policyError('CSS 格式无效或超出支持范围。', 'Invalid or unsupported CSS.');
  }
}

function valueRules(value: CssNode, property: string, owners: Element[], context: Context, font = false) {
  let sources = 0;
  walk(value, node => {
    if (node.type === 'Url') {
      if (font && property === 'src') {
        const kind = node.value.match(/^data:font\/(woff2?);base64,/)?.[1] as 'woff' | 'woff2' | undefined;
        if (!kind) return policyError('仅支持内嵌 WOFF 或 WOFF2 字体。', 'Only embedded WOFF or WOFF2 fonts are supported.');
        context.fonts.set(node.value, kind);
        sources++;
      } else {
        if (!referenceProps.has(property))
          policyError('该 CSS 属性不支持资源引用。', 'Resource references are unsupported for this CSS property.');
        if (!node.value.startsWith('#') || !simpleId.test(node.value.slice(1)))
          policyError('禁止 CSS 外部资源。', 'External CSS resources are blocked.');
        for (const owner of owners) reference(context, owner, node.value);
      }
    }
    if (node.type === 'Function' && !functions.has(node.name.toLowerCase()) &&
        !(font && property === 'src' && node.name === 'format'))
      policyError('不支持 CSS 函数 ', 'Unsupported CSS function ', node.name.slice(0, 40));
    if ((node.type === 'Number' || node.type === 'Dimension' || node.type === 'Percentage')
      && (!Number.isFinite(Number(node.value)) || Math.abs(Number(node.value)) > 1e7))
      policyError('CSS 数值超过范围。', 'CSS numeric value exceeds its limit.');
  });
  if (font && property === 'src' && sources === 0)
    policyError('字体必须提供内嵌数据。', 'Fonts must provide embedded data.');
}

function declaration(node: CssNode, owners: Element[], context: Context, font = false) {
  if (node.type !== 'Declaration') return policyError('不支持此 CSS 规则。', 'Unsupported CSS rule.');
  const property = node.property.toLowerCase();
  if (!(font ? fontProps : props).has(property))
    policyError('不支持 CSS 属性 ', 'Unsupported CSS property ', property.slice(0, 48));
  valueRules(node.value, property, owners, context, font);
  return property;
}

function stylesheet(source: string, root: Element, ctx: Context) {
  const ast = parseCss(source, 'stylesheet');
  if (ast.type !== 'StyleSheet' || ast.children.size > 512)
    return policyError('样式表规则过多。', 'Too many CSS rules.');
  ast.children.forEach(node => {
    if (node.type === 'Atrule' && node.name === 'font-face' && !node.prelude && node.block) {
      if (root.namespaceURI !== svgNamespace || node.block.children.size > 10)
        return policyError('字体描述超出范围。', 'Font descriptors exceed the budget.');
      const names = new Set<string>();
      node.block.children.forEach(item => names.add(declaration(item, [], ctx, true)));
      if (!names.has('src') || !names.has('font-family'))
        policyError('字体缺少名称或数据。', 'Font face needs a family and embedded data.');
      return;
    }
    if (node.type !== 'Rule' || node.prelude.type !== 'SelectorList')
      return policyError('仅支持静态 CSS 规则和内嵌字体。', 'Only static CSS rules and embedded fonts are supported.');
    walk(node.prelude, part => {
      if (!selectorNodes.has(part.type))
        policyError('不支持此 CSS 选择器。', 'Unsupported CSS selector.');
    });
    const selector = generate(node.prelude);
    if (selector.length > 512 || node.block.children.size > 64)
      policyError('CSS 规则超出预算。', 'CSS rule exceeds its budget.');
    const owners = [...(root.matches(selector) ? [root] : []), ...root.querySelectorAll(selector)];
    node.block.children.forEach(item => declaration(item, owners, ctx));
  });
}

function inlineStyle(source: string, owner: Element, ctx: Context) {
  const list = parseCss(source, 'declarationList');
  if (list.type !== 'DeclarationList' || list.children.size > 64)
    return policyError('内联样式超出预算。', 'Inline style exceeds its budget.');
  list.children.forEach(node => declaration(node as Declaration, [owner], ctx));
}

function effectiveSize(root: Element, box: ReturnType<typeof viewBoxOf>) {
  let width = absolute(root.getAttribute('width')), height = absolute(root.getAttribute('height'));
  if (box) {
    if (width === undefined && height !== undefined) width = height * box[2] / box[3];
    if (height === undefined && width !== undefined) height = width * box[3] / box[2];
    width ??= box[2];
    height ??= box[3];
  }
  return { width, height };
}

function validateReferences(root: Element, ids: Map<string, Element>, refs: Context['references']) {
  const stack = new Set<Element>();
  const memo = new Map<Element, { cost: number; depth: number }>();
  function visit(node: Element, depth: number): { cost: number; depth: number } {
    if (depth > 64 || stack.has(node))
      return policyError('引用存在循环或嵌套过深。', 'Cyclic or excessively nested SVG references.');
    const cached = memo.get(node);
    if (cached) {
      if (depth + cached.depth > 64) policyError('引用嵌套过深。', 'SVG reference depth exceeded.');
      return cached;
    }
    stack.add(node);
    let cost = 1, maxDepth = 0;
    const targets = [...node.children];
    for (const id of refs.get(node) ?? []) {
      const target = ids.get(id);
      if (!target) return policyError('未找到内部引用 #', 'Missing local reference #', id.slice(0, 60));
      targets.push(target);
    }
    for (const element of targets) {
      const next = visit(element, depth + 1);
      cost += next.cost;
      maxDepth = Math.max(maxDepth, next.depth + 1);
      if (cost > 80_000) return policyError('引用展开超出预算。', 'Expanded SVG exceeds its complexity budget.');
    }
    stack.delete(node);
    const entry = { cost, depth: maxDepth };
    memo.set(node, entry);
    return entry;
  }
  visit(root, 0);
}

async function validateResources(ctx: Context, signal?: AbortSignal) {
  let bytes = 0, pixels = 0;
  if (ctx.images.size > 24 || ctx.fonts.size > 12)
    policyError('内嵌图片或字体数量超限。', 'Too many embedded images or fonts.');
  for (const url of ctx.images) {
    signal?.throwIfAborted();
    const format = (Object.keys(mime) as (keyof typeof mime)[]).find(key => url.startsWith('data:' + mime[key] + ';base64,'));
    if (!format || url.length > embeddedImageLimit * 4 / 3 + 32)
      return policyError('仅支持预算内的 PNG、JPEG、WebP、AVIF 内嵌图片。', 'Only bounded embedded PNG, JPEG, WebP and AVIF images are supported.');
    const data = dataBytes(url, mime[format]);
    bytes += data.length;
    if (bytes > embeddedImageLimit) policyError('内嵌图片总计超过 20 MiB。', 'Embedded images exceed 20 MiB in total.');
    try {
        const limits = { bytes: embeddedImageLimit, pixels: 24_000_000, edge: 8192, files: 24, totalBytes: embeddedImageLimit };
      const blob = new Blob([data], { type: mime[format] });
      const info = await inspectImage(blob, embeddedImageLimit, limits);
      if (info.format !== format || info.orientation !== 1) throw new Error();
      pixels += info.width * info.height;
      if (pixels > 48_000_000) throw new Error();
      const bitmap = await createImageBitmap(blob);
      const valid = bitmap.width === info.width && bitmap.height === info.height;
      bitmap.close();
      if (!valid) throw new Error();
    } catch {
      policyError('内嵌图片编码、方向或解码尺寸无效。', 'Invalid embedded image encoding, orientation or decoded size.');
    }
  }
  let fonts = 0;
  for (const [url, kind] of ctx.fonts) {
    signal?.throwIfAborted();
    if (url.length > 700_000) policyError('单个内嵌字体超过 512 KiB。', 'An embedded font exceeds 512 KiB.');
    const data = dataBytes(url, 'font/' + kind);
    fonts += data.length;
    const view = new DataView(data.buffer);
    if (data.length < (kind === 'woff2' ? 48 : 44) || data.length > 512 * 1024 || fonts > 2 * MiB ||
      view.getUint32(0) !== (kind === 'woff2' ? 0x774f4632 : 0x774f4646) ||
      view.getUint32(8) !== data.length || view.getUint32(16) > 4 * MiB)
      policyError('字体格式无效或超出内嵌预算。', 'Invalid font format or embedded font budget exceeded.');
    try { await new FontFace('t4f-svg-verification', data).load(); }
    catch { policyError('浏览器无法解码内嵌字体。', 'The browser could not decode an embedded font.'); }
  }
}

export interface StaticSvg {
  root: Element;
  width?: number;
  height?: number;
  viewBox?: [number, number, number, number];
  hasEffects: boolean;
}

export async function validateSvg(input: string, signal?: AbortSignal): Promise<StaticSvg> {
  const root = parseXml(input);
  const ctx: Context = { references: new Map(), images: new Set(), fonts: new Map() };
  const ids = new Map<string, Element>();
  let nodes = 0, paths = 0, effects = 0, css = 0, primitives = 0;
  const pending: [Node, number][] = [[root, 0]];
  for (let next = pending.pop(); next; next = pending.pop()) {
    const [node, depth] = next;
    if (++nodes > elementLimit || depth > 48) policyError('元素数量或嵌套深度超出预算。', 'Node count or nesting depth exceeds its budget.');
    if ([3, 4, 8].includes(node.nodeType)) continue;
    if (node.nodeType !== 1) policyError('不支持 XML 处理指令和实体节点。', 'Processing instructions and entity nodes are unsupported.');
    const element = node as Element;
    const name = element.localName;
    if (element.namespaceURI !== svgNamespace || !elements.has(name))
      policyError('不支持元素 ', 'Unsupported element ', name.slice(0, 48));
    if (element.hasAttribute('viewBox')) viewBoxOf(element);
    if (effectElements.has(name) && ++effects > 32)
      policyError('滤镜、图案或蒙版数量超限。', 'Too many filters, patterns or masks.');
    if (name.startsWith('fe') && ++primitives > 96)
      policyError('滤镜复杂度超出预算。', 'Filter complexity exceeds its budget.');
    if (name === 'style') {
      const value = element.textContent ?? '';
      if ((css += value.length) > 3 * MiB) policyError('CSS 超出预算。', 'CSS exceeds its budget.');
      stylesheet(value, root, ctx);
    }
    for (const attr of element.attributes) {
      const { localName: key, namespaceURI: ns, value } = attr;
      if (ns === xmlns) continue; // Namespace declarations do not retrieve resources.
      if (ns === xml && key === 'space' && /^(default|preserve)$/.test(value)) continue;
      if (ns && !(ns === xlink && key === 'href'))
        policyError('不支持属性命名空间 ', 'Unsupported attribute namespace ', attr.name.slice(0, 48));
      if (key === 'href') {
        if (name === 'image') ctx.images.add(value);
        else if (/^(use|textPath|linearGradient|radialGradient|pattern)$/.test(name)) reference(ctx, element, value);
        else policyError('不支持该元素的链接。', 'Links are unsupported on this element.');
        continue;
      }
      if (ns || /^on/i.test(key)) policyError('禁止事件处理属性。', 'Event handler attributes are blocked.');
      if (key === 'id') {
        if (!simpleId.test(value) || value.length > 128 || ids.has(value))
          policyError('ID 无效或重复。', 'Invalid or duplicate ID.');
        ids.set(value, element);
      }
      if (key === 'style') { inlineStyle(value, element, ctx); continue; }
      if (props.has(key)) valueRules(parseCss(value, 'value'), key, [element], ctx);
      else if (!attrs.has(key))
        policyError('不支持属性 ', 'Unsupported attribute ', key.slice(0, 48));
      if (key === 'd' || key === 'points') {
        paths += value.length;
        if (paths > pathBudget || !/^[\d\s.,+\-eEmMzZlLhHvVcCsSqQtTaA]*$/.test(value))
          policyError('路径数据无效或超出复杂度预算。', 'Invalid path data or path complexity budget exceeded.');
        for (const part of value.matchAll(new RegExp(numeric, 'gi')))
          if (Math.abs(Number(part[0])) > 1e7) policyError('路径坐标超出范围。', 'Path coordinates exceed their limit.');
      }
      if (effectElements.has(name) && /^(x|y|width|height)$/.test(key)) {
        const numericValue = value.trim().match(new RegExp('^(' + numeric + ')(%|px)?$', 'i'));
        const userSpace = element.getAttribute(name === 'filter' ? 'filterUnits' : name === 'pattern' ? 'patternUnits' : 'maskUnits') === 'userSpaceOnUse';
        const dimension = key === 'width' || key === 'height';
        const percent = numericValue?.[2] === '%';
        const limit = percent ? 400 : userSpace ? 16_384 : 4;
        const coordinate = Number(numericValue?.[1]);
        const minimum = name === 'pattern' && dimension ? (percent ? 1 : userSpace ? .5 : .01) : 0;
        if (!numericValue || Math.abs(coordinate) > limit || dimension && coordinate < minimum)
          policyError('滤镜、图案或蒙版区域超出预算。', 'Filter, pattern or mask bounds exceed their budget.');
      }
      if ((key === 'stdDeviation' || key === 'radius') && value.split(/[\s,]+/).some(n => !Number.isFinite(Number(n)) || Number(n) < 0 || Number(n) > 64))
        policyError('模糊半径超出预算。', 'Filter radius exceeds its budget.');
      if ((key === 'numOctaves' && !/^[1-4]$/.test(value)) ||
        (key === 'baseFrequency' && value.split(/[\s,]+/).some(n => !Number.isFinite(Number(n)) || Number(n) < 0 || Number(n) > 4)))
        policyError('纹理滤镜超出预算。', 'Turbulence filter exceeds its budget.');
    }
    for (const child of element.childNodes) pending.push([child, depth + 1]);
  }
  validateReferences(root, ids, ctx.references);
  await validateResources(ctx, signal);
  const viewBox = viewBoxOf(root);
  return { root, ...effectiveSize(root, viewBox), viewBox, hasEffects: Boolean(effects) };
}

export function formatSvg(svg: StaticSvg) {
  const document = svg.root.ownerDocument.cloneNode(true) as Document;
  const root = document.documentElement;
  function indent(node: Element, depth: number, preserve: boolean) {
    const space = node.getAttributeNS(xml, 'space');
    if (space) preserve = space === 'preserve';
    if (preserve || !drawingContainers.has(node.localName) || !node.children.length ||
        [...node.childNodes].some(child => child.nodeType === 4 || child.nodeType === 3 && child.textContent?.trim())) return;
    for (const child of [...node.childNodes]) {
      if (child.nodeType === 3) child.remove();
      else {
        node.insertBefore(node.ownerDocument.createTextNode('\n' + '  '.repeat(depth + 1)), child);
        if (child.nodeType === 1) indent(child as Element, depth + 1, preserve);
      }
    }
    node.append('\n' + '  '.repeat(depth));
  }
  indent(root, 0, false);
  return new XMLSerializer().serializeToString(document);
}
