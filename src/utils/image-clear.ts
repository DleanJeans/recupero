import { Directory, File, Paths } from 'expo-file-system';
import { getClearedCacheName, type ImageClear } from './icon-utils';

/**
 * Replacing an image's own background happens in a hidden WebView (see ImageClearHost). This module is the
 * app-side half: it reads the cached picture, queues the job, and keeps the result as a PNG in the icons folder, so
 * each picture + setting is only processed once and shows offline afterwards.
 */
const ICON_DIR = 'icons';
/** Give up on a picture the hidden browser never answers. */
export const CLEAR_TIMEOUT_MS = 20000;

export interface ClearJob {
  id: number;
  base64: string;
  tolerance: number;
  /** [r, g, b], or null for transparent. */
  fill: [number, number, number] | null;
  resolve: (png: string | null) => void;
}

const queue: ClearJob[] = [];
const listeners = new Set<() => void>();
const ready = new Map<string, string>();
const inFlight = new Map<string, Promise<string | null>>();
const failed = new Set<string>();
let nextId = 1;

/** The host calls this to be told when work arrives. */
export function subscribeClearJobs(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function hasClearJobs(): boolean {
  return queue.length > 0;
}

export function takeClearJob(): ClearJob | undefined {
  return queue.shift();
}

function hexToRgb(hex: string): [number, number, number] {
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
  ];
}

function getDestination(url: string, clear: ImageClear): File {
  return new File(Paths.document, ICON_DIR, getClearedCacheName(url, clear));
}

/** Local URI of the processed picture if it already exists, without doing any work. */
export function getClearedUri(url: string, clear: ImageClear): string | null {
  const key = getClearedCacheName(url, clear);
  const known = ready.get(key);
  if (known) return known;
  try {
    const file = getDestination(url, clear);
    if (file.exists && (file.size ?? 0) > 0) {
      ready.set(key, file.uri);
      return file.uri;
    }
  } catch {
    // Treat an unreadable cache like a miss.
  }
  return null;
}

/** Processes the picture at sourceUri (the cached download of url). Resolves to the new local URI, or null. */
export function clearImageBackground(url: string, sourceUri: string, clear: ImageClear): Promise<string | null> {
  const cached = getClearedUri(url, clear);
  if (cached) return Promise.resolve(cached);
  const key = getClearedCacheName(url, clear);
  if (failed.has(key)) return Promise.resolve(null);
  const pending = inFlight.get(key);
  if (pending) return pending;

  const work = (async () => {
    try {
      const base64 = await new File(sourceUri).base64();
      const png = await new Promise<string | null>(resolve => {
        const job: ClearJob = {
          id: nextId++,
          base64,
          tolerance: clear.tolerance,
          fill: clear.fill ? hexToRgb(clear.fill) : null,
          resolve,
        };
        queue.push(job);
        for (const listener of listeners) listener();
      });
      if (!png) {
        failed.add(key);
        return null;
      }
      const dir = new Directory(Paths.document, ICON_DIR);
      if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
      const destination = getDestination(url, clear);
      destination.write(png, { encoding: 'base64' });
      ready.set(key, destination.uri);
      return destination.uri;
    } catch {
      failed.add(key);
      return null;
    } finally {
      inFlight.delete(key);
    }
  })();
  inFlight.set(key, work);
  return work;
}
