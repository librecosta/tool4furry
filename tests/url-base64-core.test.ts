// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import {
  codecSample, convertText, transformEncoding,
  type Base64Variant, type CodecDirection, type UrlVariant,
} from '../src/tools/url-base64/core';
import { createCodecNamer } from '../src/tools/url-base64/delivery';

const url = (input: string, direction: CodecDirection, variant: UrlVariant = 'component') =>
  transformEncoding(input, { family: 'url', direction, variant });
const base64 = (input: string, direction: CodecDirection, variant: Base64Variant = 'standard', padding = true) =>
  transformEncoding(input, { family: 'base64', direction, variant, padding });

describe('URL text codecs', () => {
  it.each([
    ['', ''],
    ['ASCII-tool_01', 'ASCII-tool_01'],
    ['你好 & Tool4Furry', '%E4%BD%A0%E5%A5%BD%20%26%20Tool4Furry'],
    ['🦊 %&=+?/#', '%F0%9F%A6%8A%20%25%26%3D%2B%3F%2F%23'],
    ['\uFEFF\x00\r\n𐐷', '%EF%BB%BF%00%0D%0A%F0%90%90%B7'],
  ])('uses exact component encoding for %j', (plain, encoded) => {
    expect(url(plain, 'encode')).toBe(encoded);
    expect(url(encoded, 'decode')).toBe(plain);
  });

  it('retains URL delimiters, order, case and reserved escapes in full URL mode', () => {
    const plain = 'HTTPS://Example.org/你好?b=1&a=2&note=🦊#片段';
    const encoded = 'HTTPS://Example.org/%E4%BD%A0%E5%A5%BD?b=1&a=2&note=%F0%9F%A6%8A#%E7%89%87%E6%AE%B5';
    expect(url(plain, 'encode', 'full')).toBe(encoded);
    expect(url(encoded, 'decode', 'full')).toBe(plain);
    expect(url('/%2f%3F%23%26%2B%3B%20%41', 'decode', 'full')).toBe('/%2f%3F%23%26%2B%3B A');
    expect(url('/%2f%3F%23%26%2B%3B%20%41', 'decode')).toBe('//?#&+; A');
  });

  it('uses the form value alphabet, space and literal plus rules', () => {
    const plain = "a b+c&d=e!~*'()\r\n你好";
    const encoded = 'a+b%2Bc%26d%3De%21%7E*%27%28%29%0D%0A%E4%BD%A0%E5%A5%BD';
    expect(url(plain, 'encode', 'form')).toBe(encoded);
    expect(url(encoded, 'decode', 'form')).toBe(plain);
    expect(url('a+b%2bc', 'decode', 'form')).toBe('a b+c');
    expect(url('a+b%2bc', 'decode')).toBe('a+b+c');
  });

  it.each(['component', 'full', 'form'] as const)('strictly rejects invalid escapes and UTF-8 in %s mode', variant => {
    for (const text of ['%', '%2', '%ZZ', '%1Q', 'x%F8%']) {
      expect(() => url(text, 'decode', variant)).toThrow(expect.objectContaining({ code: 'urlEscape' }));
    }
    for (const text of ['%C0%AF', '%FF', '%E4%BD', '%ED%A0%80', '%F4%90%80%80']) {
      expect(() => url(text, 'decode', variant)).toThrow(expect.objectContaining({ code: 'urlUtf8' }));
    }
    for (const text of ['\uD800', 'x\uDC00']) {
      expect(() => url(text, 'encode', variant)).toThrow(expect.objectContaining({ code: 'unicode' }));
      expect(() => url(text, 'decode', variant)).toThrow(expect.objectContaining({ code: 'unicode' }));
    }
  });
});

describe('UTF-8 Base64 codecs', () => {
  it.each([
    ['', ''], ['f', 'Zg=='], ['fo', 'Zm8='], ['foo', 'Zm9v'],
    ['foobar', 'Zm9vYmFy'], ['你好', '5L2g5aW9'],
    ['🦊', '8J+mig=='], ['\uFEFFa\r\n🦊\x00', '77u/YQ0K8J+migA='],
  ])('matches independent standard Base64 vectors for %j', (plain, encoded) => {
    expect(base64(plain, 'encode')).toBe(encoded);
    expect(base64(plain, 'encode', 'standard', false)).toBe(encoded.replace(/=+$/, ''));
    expect(base64(encoded, 'decode', 'standard', false)).toBe(plain);
    expect(base64(encoded.replace(/=+$/, ''), 'decode')).toBe(plain);
  });

  it('emits and accepts each alphabet and both valid padding styles', () => {
    const plain = '\u{10FFFF}';
    expect(base64(plain, 'encode')).toBe('9I+/vw==');
    expect(base64(plain, 'encode', 'url')).toBe('9I-_vw==');
    expect(base64(plain, 'encode', 'url', false)).toBe('9I-_vw');
    expect(base64('9I-_vw==', 'decode', 'url')).toBe(plain);
    expect(base64('9I-_vw', 'decode', 'url')).toBe(plain);
    expect(base64('  9I\t+/\n vw=\r\n= ', 'decode')).toBe(plain);
    expect(base64(' \r\n\t', 'decode')).toBe('');
  });

  it.each([
    ['!!!!', 'standard', 'base64Character'],
    ['9I-_vw==', 'standard', 'base64Character'],
    ['9I+/vw==', 'url', 'base64Character'],
    ['9I+_vw==', 'standard', 'base64Character'],
    ['9I-/vw==', 'url', 'base64Character'],
    ['Zg\u00a0==', 'standard', 'base64Character'],
    ['Zg\f', 'standard', 'base64Character'],
    ['Z', 'standard', 'base64Length'],
    ['abcdZ', 'standard', 'base64Length'],
    ['Zg=', 'standard', 'base64Padding'],
    ['Z=g=', 'standard', 'base64Padding'],
    ['=Zg=', 'standard', 'base64Padding'],
    ['Zg===', 'standard', 'base64Padding'],
    ['Zm9v=', 'standard', 'base64Padding'],
    ['Zh==', 'standard', 'base64Bits'],
    ['Zh', 'url', 'base64Bits'],
    ['Zm9=', 'standard', 'base64Bits'],
    ['Zm9', 'url', 'base64Bits'],
    ['/w==', 'standard', 'base64Utf8'],
    ['abc', 'standard', 'base64Utf8'],
    ['7aCA', 'standard', 'base64Utf8'],
    ['8J-m', 'url', 'base64Utf8'],
    ['\uD800', 'standard', 'unicode'],
  ] as const)('rejects %j with the specific issue %s/%s', (input, variant, code) => {
    expect(() => base64(input, 'decode', variant)).toThrow(expect.objectContaining({ code }));
  });

  it('rejects unpaired UTF-16 surrogates before Base64 encoding', () => {
    expect(() => base64('\uDC00x', 'encode')).toThrow(expect.objectContaining({ code: 'unicode' }));
  });

  it('uses bounded compatibility chunks without changing bytes, alphabet or padding', () => {
    const write = Object.getOwnPropertyDescriptor(Uint8Array.prototype, 'toBase64');
    const read = Object.getOwnPropertyDescriptor(Uint8Array, 'fromBase64');
    if (write) Object.defineProperty(Uint8Array.prototype, 'toBase64', { ...write, value: undefined });
    if (read) Object.defineProperty(Uint8Array, 'fromBase64', { ...read, value: undefined });
    const btoaCall = vi.spyOn(globalThis, 'btoa');
    const atobCall = vi.spyOn(globalThis, 'atob');
    try {
      const text = '\uFEFF\u{10FFFF}🦊你好\r\n\0'.repeat(4001) + 'ab';
      for (const variant of ['standard', 'url'] as const) {
        const known = Buffer.from(text).toString('base64');
        const expected = variant === 'url' ? known.replaceAll('+', '-').replaceAll('/', '_') : known;
        expect(base64(text, 'encode', variant)).toBe(expected);
        expect(base64(text, 'encode', variant, false)).toBe(expected.replace(/=+$/, ''));
        expect(base64(expected.replace(/.{43}/g, '$&\n'), 'decode', variant)).toBe(text);
      }
      expect(btoaCall.mock.calls.length).toBeGreaterThan(4);
      expect(btoaCall.mock.calls.every(([chunk]) => chunk.length <= 12_288)).toBe(true);
      expect(atobCall.mock.calls.every(([chunk]) => chunk.length <= 16_384)).toBe(true);
      expect(() => base64('Zh', 'decode')).toThrow(expect.objectContaining({ code: 'base64Bits' }));
      expect(() => base64('/w==', 'decode')).toThrow(expect.objectContaining({ code: 'base64Utf8' }));
    } finally {
      btoaCall.mockRestore();
      atobCall.mockRestore();
      if (write) Object.defineProperty(Uint8Array.prototype, 'toBase64', write);
      if (read) Object.defineProperty(Uint8Array, 'fromBase64', read);
    }
  });
});

it('converts beyond the old cutoff without truncation, even when output expands', () => {
  const input = '你好🦊a'.repeat(105_001);
  const expectedUrl = '%E4%BD%A0%E5%A5%BD%F0%9F%A6%8Aa'.repeat(105_001);
  const expectedBase64 = Buffer.from(input).toString('base64url');
  expect(url(input, 'encode')).toBe(expectedUrl);
  expect(url(expectedUrl, 'decode')).toBe(input);
  expect(base64(input, 'encode', 'url', false)).toBe(expectedBase64);
  expect(base64(expectedBase64, 'decode', 'url')).toBe(input);
});

it('builds decode samples using the matching rules and counts text code points', () => {
  expect(codecSample({family: 'url', direction: 'decode', variant: 'component'})).toBe('%E4%BD%A0%E5%A5%BD%20%26%20Tool4Furry');
  expect(codecSample({family: 'url', direction: 'decode', variant: 'form'})).toBe('%E4%BD%A0%E5%A5%BD+%26+Tool4Furry');
  expect(codecSample({family: 'base64', direction: 'decode', variant: 'url', padding: false})).toBe('5L2g5aW9');
  expect(convertText({ input: '🦊好', options: { family: 'url', direction: 'encode', variant: 'component' } })).toEqual({
    output: '%F0%9F%A6%8A%E5%A5%BD', characters: 2,
  });
});

it('names TXT deliveries by operation and advances a millisecond even if the clock moves back', () => {
  const name = createCodecNamer();
  const now = new Date(2026, 10, 22, 16, 9, 0, 999);
  expect(name({ family: 'url', direction: 'encode', variant: 'full' }, now)).toBe('url-encoded-20261122-160900-999.txt');
  expect(name({ family: 'url', direction: 'encode', variant: 'component' }, now)).toBe('url-encoded-20261122-160901-000.txt');
  expect(name({ family: 'base64', direction: 'decode', variant: 'url', padding: false }, new Date(0))).toBe('base64-decoded-20261122-160901-001.txt');
});
