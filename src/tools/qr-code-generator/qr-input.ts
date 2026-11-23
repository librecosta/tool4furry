// Represent each line break with one space in the single-line field. Keep pasted bytes in the recipe.
export const displayQrText = (text: string) => text.replace(/\r\n?|\n/g, ' ');

function originalOffset(text: string, offset: number) {
  let i = 0;
  for (let seen = 0; seen < offset && i < text.length; seen++, i++) {
    if (text[i] === '\r' && text[i + 1] === '\n') i++;
  }
  return i;
}

export function replaceQrText(text: string, start: number, end: number, replacement: string) {
  return text.slice(0, originalOffset(text, start)) + replacement + text.slice(originalOffset(text, end));
}

export function editQrText(text: string, edited: string) {
  if (!/[\r\n]/.test(text)) return edited;
  const previous = displayQrText(text);
  let start = 0;
  while (start < previous.length && previous[start] === edited[start]) start++;
  let end = 0;
  while (end < Math.min(previous.length, edited.length) - start && previous.at(-1 - end) === edited.at(-1 - end)) end++;
  return replaceQrText(text, start, previous.length - end, edited.slice(start, edited.length - end));
}
