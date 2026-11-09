import { useEffect, useState } from 'react';
import { cacheIconImage, getCachedIconUri, hasIconFailed } from '../utils/icon-image-cache';

export type IconImageState =
  | { status: 'none' }
  | { status: 'loading' }
  | { status: 'failed' }
  | { status: 'ready'; uri: string };

function initialState(url: string | null): IconImageState {
  if (!url) return { status: 'none' };
  const cached = getCachedIconUri(url);
  if (cached) return { status: 'ready', uri: cached };
  return hasIconFailed(url) ? { status: 'failed' } : { status: 'loading' };
}

/** Local copy of an icon image, downloading it the first time it is shown. */
export function useIconImage(url: string | null): IconImageState {
  const [state, setState] = useState(() => initialState(url));

  useEffect(() => {
    const start = initialState(url);
    setState(start);
    if (!url || start.status !== 'loading') return;
    let active = true;
    cacheIconImage(url).then(uri => {
      if (active) setState(uri ? { status: 'ready', uri } : { status: 'failed' });
    });
    return () => {
      active = false;
    };
  }, [url]);

  return state;
}
