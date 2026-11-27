import { useEffect, useRef, useState } from 'react';
import type { Locale } from '../../i18n/locale';
import { errorText } from '../general/ui';
import { readBackground } from './delivery';

export type LocalPhoto = { bitmap: ImageBitmap; name: string };
export type PhotoInputState = { photo?: LocalPhoto; pending?: boolean; error?: string };

export function useLocalPhoto(locale: Locale, onLoaded: () => void) {
  const [state, setState] = useState<PhotoInputState>({});
  const sequence = useRef(0);
  const input = useRef<HTMLInputElement>(null);
  const { photo } = state;
  useEffect(() => () => { sequence.current++; }, []);
  useEffect(() => () => photo?.bitmap.close(), [photo]);

  async function load(file: File) {
    const id = ++sequence.current;
    setState(previous => ({ photo: previous.photo, pending: true }));
    try {
      const bitmap = await readBackground(file);
      if (id !== sequence.current) { bitmap.close(); return; }
      setState({ photo: { bitmap, name: file.name } });
      onLoaded();
    } catch (error) {
      if (id === sequence.current) setState(previous => ({ photo: previous.photo, error: errorText(error, locale) }));
    }
  }

  return {
    ...state, input, load,
    choose: () => input.current?.click(),
    clear: () => { sequence.current++; setState({}); },
  };
}
