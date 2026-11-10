import { useEffect, useState } from 'react';
import type { ImageClear } from '../utils/icon-utils';
import { clearImageBackground, getClearedUri } from '../utils/image-clear';

/**
 * The picture to show once its background has been replaced. Until the processed copy exists (or if it can't be
 * made) this is the original, and while a setting is being changed it keeps showing the last result instead of
 * flickering back.
 */
export function useClearedImage(url: string | null, sourceUri: string | null, clear: ImageClear | undefined) {
  const key = clear ? `${Math.round(clear.tolerance)},${clear.fill ?? 'none'}` : '';
  const [uri, setUri] = useState<string | null>(() =>
    url && clear ? (getClearedUri(url, clear) ?? sourceUri) : sourceUri,
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` stands for `clear`
  useEffect(() => {
    if (!url || !sourceUri || !clear) {
      setUri(sourceUri);
      return;
    }
    const cached = getClearedUri(url, clear);
    if (cached) {
      setUri(cached);
      return;
    }
    let active = true;
    clearImageBackground(url, sourceUri, clear).then(done => {
      if (active) setUri(done ?? sourceUri);
    });
    return () => {
      active = false;
    };
  }, [url, sourceUri, key]);

  return uri;
}
