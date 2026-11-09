import { useEffect, useState } from 'react';
import { Image } from 'react-native';

const sizes = new Map<string, { width: number; height: number }>();

/** Natural size of a (usually local) image, remembered so lists don't flicker. Null until known. */
export function useImageSize(uri: string | null): { width: number; height: number } | null {
  const [size, setSize] = useState(() => (uri ? (sizes.get(uri) ?? null) : null));

  useEffect(() => {
    if (!uri) {
      setSize(null);
      return;
    }
    const known = sizes.get(uri);
    if (known) {
      setSize(known);
      return;
    }
    let active = true;
    Image.getSize(
      uri,
      (width, height) => {
        sizes.set(uri, { width, height });
        if (active) setSize({ width, height });
      },
      () => {},
    );
    return () => {
      active = false;
    };
  }, [uri]);

  return size;
}
