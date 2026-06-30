import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'recupero-ui-header-title-font-cache-v1';
const fittedFontSizeByName = new Map<string, number>();

let loadPromise: Promise<void> | null = null;

function loadCache(): Promise<void> {
  loadPromise ??= AsyncStorage.getItem(STORAGE_KEY)
    .then(value => {
      if (!value) {
        return;
      }

      const cache = JSON.parse(value) as Record<string, unknown>;
      for (const [name, fontSize] of Object.entries(cache)) {
        if (typeof fontSize === 'number' && Number.isFinite(fontSize)) {
          fittedFontSizeByName.set(name, fontSize);
        }
      }
    })
    .catch(() => {
      // UI cache is non-critical and intentionally separate from user data.
    });

  return loadPromise;
}

function persistCache(): void {
  const cache = Object.fromEntries(fittedFontSizeByName);
  void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cache)).catch(() => {
    // Ignore cache write failures; the title can still auto-fit next launch.
  });
}

export function getCachedHeaderTitleFontSize(name: string): number | undefined {
  return fittedFontSizeByName.get(name);
}

export async function loadCachedHeaderTitleFontSize(name: string): Promise<number | undefined> {
  await loadCache();
  return fittedFontSizeByName.get(name);
}

export function saveCachedHeaderTitleFontSize(name: string, fontSize: number): void {
  if (fittedFontSizeByName.get(name) === fontSize) {
    return;
  }

  fittedFontSizeByName.set(name, fontSize);
  persistCache();
}
