type PdfDownloadKind = 'merged' | 'extracted' | 'pages' | 'images';

function sourceStem(source: string) {
  const cleaned = source.trim().replace(/\.pdf$/i, '')
    .replace(/[<>:"/\\|?*\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, '')
    .replace(/^[.\s]+|[.\s]+$/g, '');
  // Leave room for the timestamp and suffix on common desktop filesystems.
  let stem = '', bytes = 0;
  const encoder = new TextEncoder();
  for (const character of cleaned) {
    const size = encoder.encode(character).length;
    if (bytes + size > 160) break;
    stem += character; bytes += size;
  }
  return stem.replace(/[.\s]+$/g, '') || 'document';
}

/** A short collision counter is local to this page; it never changes file bytes. */
export function createPdfDownloadNamer() {
  let previous = '', collision = 0;
  return (kind: PdfDownloadKind, source = '', now = new Date()) => {
    const pad = (value: number, width = 2) => String(value).padStart(width, '0');
    const stamp = `${pad(now.getFullYear(), 4)}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}-${pad(now.getMilliseconds(), 3)}`;
    collision = stamp === previous ? collision + 1 : 0;
    previous = stamp;
    const prefix = kind === 'merged' || kind === 'images' ? kind : `${sourceStem(source)}-${kind}`;
    return `${prefix}-${stamp}${collision ? `-${collision + 1}` : ''}.${kind === 'pages' ? 'zip' : 'pdf'}`;
  };
}

export const pdfDownloadName = createPdfDownloadNamer();
