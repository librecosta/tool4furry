import { boundedText } from '../general/bounds';
export type CleanOptions = {
  trim: boolean;
  removeBlank: boolean;
  mergeBlank: boolean;
  normalize: boolean;
};
export const defaults: CleanOptions = {
  trim: true,
  removeBlank: false,
  mergeBlank: true,
  normalize: true,
};
export function cleanText(input: string, o: CleanOptions) {
  boundedText(input);
  const records =
    input.match(/[^\r\n]*(?:\r\n|\r|\n|$)/g)?.filter(Boolean) ?? [];
  let blank = false;
  return records
    .flatMap((record) => {
      const end = record.match(/(?:\r\n|\r|\n)$/)?.[0] ?? '';
      const body = record.slice(0, record.length - end.length),
        text = o.trim ? body.trim() : body;
      const empty = !text.trim();
      if (empty && (o.removeBlank || (o.mergeBlank && blank))) return [];
      blank = empty;
      return [text + (o.normalize && end ? '\n' : end)];
    })
    .join('');
}
export function textStats(text: string, locale: 'zh' | 'en') {
  return {
    characters: [...text].length,
    words: [
      ...new Intl.Segmenter(locale, { granularity: 'word' }).segment(text),
    ].filter((p) => p.isWordLike).length,
    han: (text.match(/\p{Script=Han}/gu) ?? []).length,
    lines: text ? text.split(/\r\n|\r|\n/).length : 0,
  };
}
