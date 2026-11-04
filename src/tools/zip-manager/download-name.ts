export function zipStem(value: string) {
  const cleaned = value.normalize('NFC').trim().replace(/(?:\.zip)+$/i, '')
    .replace(/[<>:"/\\|?*\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, '-')
    .replace(/^[.\s]+|[.\s]+$/g, '');
  const encoder = new TextEncoder();
  let stem = '', bytes = 0;
  for (const character of cleaned) {
    const size = encoder.encode(character).length;
    if (bytes + size > 160) break;
    stem += character; bytes += size;
  }
  stem = stem.replace(/[.\s]+$/g, '');
  return !stem || /^(?:con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\s*\.|$)/i.test(stem) ? 'archive' : stem;
}

/** Called at download time; repeated downloads reuse the existing Blob. */
export function createZipDownloadNamer() {
  let previous = '', collision = 0;
  return (stem: string, selected = false, now = new Date()) => {
    const pad = (n: number, width = 2) => String(n).padStart(width, '0');
    const stamp = `${pad(now.getFullYear(), 4)}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}-${pad(now.getMilliseconds(), 3)}`;
    collision = stamp === previous ? collision + 1 : 0; previous = stamp;
    return `${zipStem(stem)}${selected ? '-selected' : ''}-${stamp}${collision ? `-${collision + 1}` : ''}.zip`;
  };
}
export const zipDownloadName = createZipDownloadNamer();
