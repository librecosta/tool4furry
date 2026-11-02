import type { ArchiveSink } from '../archive/stream-zip';
export type SaveHandle = {createWritable(): Promise<ArchiveSink>};
type SavePicker = (options: {suggestedName: string; types: {description: string; accept: Record<string, string[]>}[]}) => Promise<SaveHandle>;
const picker = () => (window as Window & {showSaveFilePicker?: SavePicker}).showSaveFilePicker;
export const supportsArchiveSave = () => window.isSecureContext && typeof picker() === 'function';
/** Call directly from the trusted click, before any async import or work. */
export async function chooseArchiveFile(name: string, format: 'zip' | 'cbz') {
  const choose = picker(); if (!choose) throw new Error('save unavailable');
  return choose.call(window, {suggestedName: name, types: [{description: format.toUpperCase(), accept: {[format === 'cbz' ? 'application/vnd.comicbook+zip' : 'application/zip']: [`.${format}`]}}]});
}
