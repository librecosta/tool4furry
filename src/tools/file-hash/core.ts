export const algorithms = {
  md5: { label: 'MD5', length: 32 }, sha1: { label: 'SHA-1', length: 40 },
  sha256: { label: 'SHA-256', length: 64 }, sha512: { label: 'SHA-512', length: 128 },
  crc32: { label: 'CRC32', length: 8 },
} as const;
export type HashAlgorithm = keyof typeof algorithms;
export type HashFailure = 'unsupported' | 'initialization' | 'read' | 'resource' | 'worker';
export class HashError extends Error {
  constructor(readonly code: HashFailure) { super(code); }
}
export function validDigest(value: string, algorithm: HashAlgorithm) {
  return value.length === algorithms[algorithm].length && /^[a-f\d]+$/i.test(value);
}
export function compareHash(actual: string, expected: string, algorithm: HashAlgorithm) {
  if (!validDigest(expected.trim(), algorithm)) throw new HashError('read');
  return actual.toLowerCase() === expected.trim().toLowerCase();
}
export function comparison(actual: string | undefined, expected: string, algorithm: HashAlgorithm) {
  const value = expected.trim();
  if (!value) return 'empty';
  if (!/^[a-f\d]+$/i.test(value) || value.length > algorithms[algorithm].length) return 'invalid';
  if (value.length < algorithms[algorithm].length) return 'incomplete';
  if (!actual) return 'pending';
  return compareHash(actual, value, algorithm) ? 'match' : 'mismatch';
}
/** Control characters cannot create extra entries in the text checklist. */
export function checksumText(algorithm: HashAlgorithm, entries: readonly { name: string; digest: string }[]) {
  const filename = (name: string) => /["\\\u0000-\u001f\u007f-\u009f\u2028\u2029]/.test(name)
    ? JSON.stringify(name).replace(/[\u007f-\u009f\u2028\u2029]/g, c => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`) : name;
  return `# ${algorithms[algorithm].label}\n${entries.map(entry => `${entry.digest}  ${filename(entry.name)}`).join('\n')}\n`;
}
export function createChecksumNamer() {
  let previous = '', collision = 0;
  return (algorithm: HashAlgorithm, now = new Date()) => {
    const pad = (value: number, width = 2) => String(value).padStart(width, '0');
    const stamp = `${pad(now.getFullYear(), 4)}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}-${pad(now.getMilliseconds(), 3)}`;
    collision = stamp === previous ? collision + 1 : 0; previous = stamp;
    return `checksums-${algorithm}-${stamp}${collision ? `-${collision + 1}` : ''}.txt`;
  };
}
export const checksumDownloadName = createChecksumNamer();
