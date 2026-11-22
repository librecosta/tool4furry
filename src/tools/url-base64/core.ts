export type CodecFamily = 'url' | 'base64';
export type CodecDirection = 'encode' | 'decode';
export type UrlVariant = 'component' | 'full' | 'form';
export type Base64Variant = 'standard' | 'url';

export type CodecOptions =
  | { family: 'url'; direction: CodecDirection; variant: UrlVariant }
  | { family: 'base64'; direction: CodecDirection; variant: Base64Variant; padding: boolean };

export type CodecIssue =
  | 'unicode'
  | 'urlEscape'
  | 'urlUtf8'
  | 'base64Character'
  | 'base64Padding'
  | 'base64Length'
  | 'base64Bits'
  | 'base64Utf8'
  | 'resource';

export class CodecError extends Error {
  constructor(readonly code: CodecIssue) {
    super(code);
  }
}

const standardAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const urlAlphabet = standardAlphabet.slice(0, -2) + '-_';
const base64Whitespace = /[ \t\r\n]/g;
const invalidBase64 = { standard: /[^A-Za-z0-9+/]/, url: /[^A-Za-z0-9_-]/ };
const invalidEscape = /%(?![0-9a-f]{2})/i;
// With the Unicode flag, a valid surrogate pair is one code point outside this range.
const unpairedSurrogate = /[\uD800-\uDFFF]/u;

function transformUrl(input: string, { direction, variant }: Extract<CodecOptions, { family: 'url' }>) {
  if (direction === 'encode') {
    if (variant === 'form') return new URLSearchParams([['v', input]]).toString().slice(2);
    return variant === 'full' ? encodeURI(input) : encodeURIComponent(input);
  }
  try {
    if (variant === 'full') return decodeURI(input);
    return decodeURIComponent(variant === 'form' ? input.replaceAll('+', ' ') : input);
  } catch (error) {
    if (!(error instanceof URIError)) throw error;
    throw new CodecError(invalidEscape.test(input) ? 'urlEscape' : 'urlUtf8');
  }
}

function encodeBase64(input: string, variant: Base64Variant, padding: boolean) {
  const bytes = new TextEncoder().encode(input);
  if (typeof bytes.toBase64 === 'function') {
    return bytes.toBase64({ alphabet: variant === 'url' ? 'base64url' : 'base64', omitPadding: !padding });
  }

  // Every intermediate binary string is small. Triplet-aligned chunks need padding only at the end.
  const chunks: string[] = [];
  const chunkSize = 12_288;
  for (let start = 0; start < bytes.length; start += chunkSize) {
    let chunk = btoa(String.fromCharCode(...bytes.subarray(start, start + chunkSize)));
    if (variant === 'url') chunk = chunk.replaceAll('+', '-').replaceAll('/', '_');
    chunks.push(padding ? chunk : chunk.replace(/=+$/, ''));
  }
  return chunks.join('');
}

function decodeBase64(input: string, variant: Base64Variant) {
  const value = input.replace(base64Whitespace, '');
  const firstPad = value.indexOf('=');
  const length = firstPad === -1 ? value.length : firstPad;
  if (invalidBase64[variant].test(value.slice(0, length))) throw new CodecError('base64Character');

  const remainder = length % 4;
  if (firstPad !== -1 &&
      (remainder < 2 || value.length !== length + 4 - remainder || value.slice(length) !== '='.repeat(4 - remainder))) {
    throw new CodecError('base64Padding');
  }
  if (remainder === 1) throw new CodecError('base64Length');

  const alphabet = variant === 'url' ? urlAlphabet : standardAlphabet;
  const tail = alphabet.indexOf(value.charAt(length - 1));
  if ((remainder === 2 && (tail & 15)) || (remainder === 3 && (tail & 3))) {
    throw new CodecError('base64Bits');
  }

  const bytes = typeof Uint8Array.fromBase64 === 'function'
    ? Uint8Array.fromBase64(value, { alphabet: variant === 'url' ? 'base64url' : 'base64' })
    : decodeBase64Chunks(value, length, variant);
  try {
    // A leading U+FEFF is part of the original text and must survive decoding.
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch (error) {
    if (!(error instanceof TypeError)) throw error;
    throw new CodecError('base64Utf8');
  }
}

function decodeBase64Chunks(value: string, length: number, variant: Base64Variant) {
  const bytes = new Uint8Array(Math.floor(length * 3 / 4));
  const chunkSize = 16_384; // Aligned to four Base64 characters.
  let offset = 0;
  for (let start = 0; start < length; start += chunkSize) {
    let chunk = value.slice(start, Math.min(start + chunkSize, length));
    if (variant === 'url') chunk = chunk.replaceAll('-', '+').replaceAll('_', '/');
    const binary = atob(chunk);
    for (let index = 0; index < binary.length; index++) bytes[offset++] = binary.charCodeAt(index);
  }
  return bytes;
}

export function transformEncoding(input: string, options: CodecOptions): string {
  if (unpairedSurrogate.test(input)) throw new CodecError('unicode');
  if (options.family === 'url') return transformUrl(input, options);
  return options.direction === 'encode'
    ? encodeBase64(input, options.variant, options.padding)
    : decodeBase64(input, options.variant);
}

export function codecSample(options: CodecOptions) {
  const text = options.family === 'url' ? '你好 & Tool4Furry' : '你好';
  return options.direction === 'encode' ? text : transformEncoding(text, { ...options, direction: 'encode' });
}


export type CodecRequest = { input: string; options: CodecOptions };
export type ProcessingIssue = CodecIssue | 'worker' | 'timeout';
export type Conversion =
  | { output: string; characters: number }
  | { issue: ProcessingIssue; characters?: number };

export function convertText({ input, options }: CodecRequest): Conversion {
  // Count code points without allocating an array of characters.
  let characters = input.length;
  for (let index = 0; index + 1 < input.length; index++) {
    const first = input.charCodeAt(index);
    if (first < 0xd800 || first > 0xdbff) continue;
    const second = input.charCodeAt(index + 1);
    if (second >= 0xdc00 && second <= 0xdfff) {
      characters--;
      index++;
    }
  }
  try {
    return { output: transformEncoding(input, options), characters };
  } catch (error) {
    return { issue: error instanceof CodecError ? error.code : 'resource', characters };
  }
}
