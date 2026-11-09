import { Directory, File, Paths } from 'expo-file-system';
import { getIconCacheName } from './icon-utils';

/**
 * Icon images (Emoji Kitchen mixes and pasted image links) are downloaded once into the app's documents folder,
 * which Android doesn't clear, then always shown from there, offline included.
 */
const ICON_DIR = 'icons';

/** Local file URI per remote URL, known to exist. */
const ready = new Map<string, string>();
const inFlight = new Map<string, Promise<string | null>>();
/** URLs that failed this session; retried after the app restarts. */
const failed = new Set<string>();

function getIconDirectory(): Directory {
  const dir = new Directory(Paths.document, ICON_DIR);
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

/** Local URI if the image is already on the device, without downloading. */
export function getCachedIconUri(url: string): string | null {
  const known = ready.get(url);
  if (known) return known;
  try {
    const file = new File(Paths.document, ICON_DIR, getIconCacheName(url));
    if (file.exists && (file.size ?? 0) > 0) {
      ready.set(url, file.uri);
      return file.uri;
    }
  } catch {
    // Treat an unreadable cache like a miss.
  }
  return null;
}

export function hasIconFailed(url: string): boolean {
  return failed.has(url);
}

/** Downloads the image once (concurrent callers share the download). Resolves to the local URI, or null on failure. */
export function cacheIconImage(url: string): Promise<string | null> {
  const cached = getCachedIconUri(url);
  if (cached) return Promise.resolve(cached);
  if (failed.has(url)) return Promise.resolve(null);
  const pending = inFlight.get(url);
  if (pending) return pending;

  const download = (async () => {
    try {
      const destination = new File(getIconDirectory(), getIconCacheName(url));
      const file = await File.downloadFileAsync(url, destination, { idempotent: true });
      ready.set(url, file.uri);
      return file.uri;
    } catch {
      failed.add(url);
      return null;
    } finally {
      inFlight.delete(url);
    }
  })();
  inFlight.set(url, download);
  return download;
}
