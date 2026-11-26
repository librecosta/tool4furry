import { batchTime } from '../file-naming';

function downloadStem(source: string) {
  const cleaned = source.replace(/\.(?:csv|tsv|json)$/i, '')
    .replace(/[<>:"/\\|?*\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, '-')
    .replace(/^[.\s]+|[.\s]+$/g, '');
  const encoder = new TextEncoder();
  let stem = '', bytes = 0;
  for (const character of cleaned) {
    bytes += encoder.encode(character).length;
    if (bytes > 160) break;
    stem += character;
  }
  stem = stem.replace(/[.\s]+$/g, '');
  if (/^(?:con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i.test(stem)) return '_' + stem;
  return stem || 'converted';
}

export function createDownloadNamer() {
  // Local timestamps can repeat after an adjustment or a daylight-saving transition.
  const counts = new Map<string, number>();
  return (source: string, format: 'JSON' | 'CSV' | 'TSV', now = new Date()) => {
    const time = batchTime(now);
    const stamp = time.slice(0, -3) + '-' + time.slice(-3);
    const count = (counts.get(stamp) ?? 0) + 1;
    counts.set(stamp, count);
    return downloadStem(source) + '-' + stamp + (count > 1 ? '-' + count : '') + '.' + format.toLowerCase();
  };
}
