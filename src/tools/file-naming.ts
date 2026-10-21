// Pure filename policy. No File/Blob, clock reads, encoding or browser state.
const utf8 = new TextEncoder();
const forbidden = /[<>:"/\\|?*\x00-\x1f\x7f\u202a-\u202e\u2066-\u2069]/;
const reserved = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;
const length = (text: string) => utf8.encode(text).length;
function truncate(text: string, budget: number) {
  let result = '';
  for (const character of text) {
    if (length(result + character) > budget) break;
    result += character;
  }
  return result.replace(/[. ]+$/g, '');
}
export function batchTime(date: Date) {
  const pad = (value: number, size = 2) => String(value).padStart(size, '0');
  return `${pad(date.getFullYear(), 4)}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}${pad(date.getMilliseconds(), 3)}`;
}
export function validFilenameLabel(label: string) {
  return (
    label === '' ||
    (label === label.trim() &&
      length(label) <= 40 &&
      !forbidden.test(label) &&
      !/[. ]$/.test(label) &&
      !reserved.test(label) &&
      label !== '.' &&
      label !== '..')
  );
}
export function taskFilename({
  time,
  sequence,
  source,
  extension,
  label = '',
}: {
  time: string;
  sequence: number;
  source: string;
  extension: string;
  label?: string;
}) {
  if (
    !/^\d{8}-\d{9}$/.test(time) ||
    !Number.isSafeInteger(sequence) ||
    sequence < 1 ||
    !/^[a-z0-9]{1,10}$/.test(extension) ||
    !validFilenameLabel(label)
  )
    return { name: '', error: true };
  let stem = source
    .normalize('NFC')
    .replace(/\.[^.]*$/, '')
    .replace(/[<>:"/\\|?*\x00-\x1f\x7f\u202a-\u202e\u2066-\u2069]/g, '-')
    .replace(/[. ]+$/g, '')
    .trim();
  if (!stem || reserved.test(stem) || /^\.+$/.test(stem)) stem = 'image';
  const prefix = `t4f-${time}-${String(sequence).padStart(4, '0')}-${label ? `${label.normalize('NFC')}-` : ''}`;
  const suffix = `.${extension}`;
  stem = truncate(stem, 180 - length(prefix + suffix)) || 'image';
  return { name: `${prefix}${stem}${suffix}`, error: false };
}
