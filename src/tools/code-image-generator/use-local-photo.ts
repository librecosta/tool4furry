import { useLayoutEffect, useRef, useState } from 'react';
import type { CreativeAsset } from '../../assets/creative';
import { creativeImageUrl } from '../../assets/creative/image-urls';
import type { Locale } from '../../i18n/locale';
import { errorText } from '../general/ui';
import { readBackground } from './delivery';

type Photo = { bitmap: ImageBitmap; name: string; assetId?: string };
export type PhotoInputState = { photo?: Photo; pending?: boolean; error?: string };

export function useLocalPhoto(locale: Locale, onLoaded: () => void) {
  const [state, setState] = useState<PhotoInputState>({});
  const request = useRef<AbortController>(undefined);
  const owned = useRef(new Set<ImageBitmap>());
  useLayoutEffect(() => () => {
    request.current?.abort();
    owned.current.forEach(bitmap => bitmap.close());
    owned.current.clear();
  }, []);
  useLayoutEffect(() => {
    for (const bitmap of owned.current) {
      if (bitmap === state.photo?.bitmap) continue;
      bitmap.close();
      owned.current.delete(bitmap);
    }
  }, [state.photo]);

  async function load(source: { file: File } | { asset: CreativeAsset }) {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setState(previous => ({ photo: previous.photo, pending: true }));
    try {
      let blob: Blob, name: string, assetId: string | undefined;
      if ('asset' in source) {
        const { asset } = source;
        const url = await creativeImageUrl(asset);
        if (controller.signal.aborted) return;
        if (!url) throw new Error('Missing creative asset');
        const response = await fetch(url, { signal: controller.signal, credentials: 'same-origin' });
        if (!response.ok) throw new Error('Creative asset request failed');
        blob = await response.blob();
        name = asset.title[locale];
        assetId = asset.id;
      } else {
        blob = source.file;
        name = source.file.name;
      }
      if (controller.signal.aborted) return;
      const bitmap = await readBackground(blob);
      if (controller.signal.aborted) { bitmap.close(); return; }
      if ('asset' in source && (bitmap.width !== source.asset.width || bitmap.height !== source.asset.height)) {
        bitmap.close();
        throw new Error('Creative asset dimensions do not match the catalog');
      }
      owned.current.add(bitmap);
      setState({ photo: { bitmap, name, assetId } });
      onLoaded();
    } catch (error) {
      if (controller.signal.aborted) return;
      const message = 'file' in source ? errorText(error, locale) : locale === 'zh'
        ? '无法加载素材。请重试或选择其他图片。' : 'Could not load the asset. Try again or choose another image.';
      setState(previous => ({ photo: previous.photo, error: message }));
    }
  }

  return {
    ...state, load,
    cancel: () => { request.current?.abort(); setState(previous => ({ photo: previous.photo })); },
    clear: () => { request.current?.abort(); setState({}); },
  };
}
