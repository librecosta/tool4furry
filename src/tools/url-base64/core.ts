import { boundedText, fail } from '../general/bounds';
export type EncodingMode =
  | 'url-encode'
  | 'url-decode'
  | 'base64-encode'
  | 'base64-decode';
export function transformEncoding(input: string, mode: EncodingMode) {
  boundedText(input);
  try {
    if (mode === 'url-encode') return encodeURIComponent(input);
    if (mode === 'url-decode') return decodeURIComponent(input);
    if (mode === 'base64-encode') {
      const bytes = new TextEncoder().encode(input);
      let binary = '';
      for (let at = 0; at < bytes.length; at += 8192)
        binary += String.fromCharCode(...bytes.subarray(at, at + 8192));
      return btoa(binary);
    }
    const value = input.replace(/[\r\n\t ]/g, '');
    if (
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
        value,
      )
    )
      throw new Error();
    const binary = atob(value);
    if (btoa(binary) !== value) throw new Error();
    return new TextDecoder('utf-8', { fatal: true }).decode(
      Uint8Array.from(binary, (c) => c.charCodeAt(0)),
    );
  } catch {
    fail(
      '编码无效，或结果不是有效的 UTF-8 文本。',
      'Invalid encoding, or the result is not valid UTF-8 text.',
    );
  }
}
