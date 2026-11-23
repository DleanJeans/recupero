import { useEffect, useState } from 'react';
import { AppUsage } from '../../modules/app-usage';

const cache = new Map<string, string | null>();

/** file:// uri of an installed app's launcher icon, or undefined while loading, unknown, or in older builds. */
export function useAppLauncherIcon(packageName: string | undefined): string | undefined {
  const [uri, setUri] = useState<string | undefined>(() =>
    packageName ? (cache.get(packageName) ?? undefined) : undefined,
  );
  useEffect(() => {
    if (!packageName) {
      setUri(undefined);
      return;
    }
    if (cache.has(packageName)) {
      setUri(cache.get(packageName) ?? undefined);
      return;
    }
    let cancelled = false;
    AppUsage?.getAppIcon?.(packageName)
      .catch(() => null)
      .then(result => {
        cache.set(packageName, result ?? null);
        if (!cancelled) setUri(result ?? undefined);
      });
    return () => {
      cancelled = true;
    };
  }, [packageName]);
  return uri;
}
