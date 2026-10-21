import { useEffect, useState } from 'react';
import type { ImageResources } from '../image/resources';

export function useOwnedUrl(
  blob: Blob | undefined,
  resources: ImageResources | undefined,
) {
  const [owned, setOwned] = useState<{ blob: Blob; url: string }>();
  useEffect(() => {
    if (!blob || !resources) {
      setOwned(undefined);
      return;
    }
    const url = resources.url(blob);
    setOwned({ blob, url });
    return () => resources.revoke(url);
  }, [blob, resources]);
  return owned?.blob === blob ? owned?.url : undefined;
}
