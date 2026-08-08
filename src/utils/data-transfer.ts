import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useBehaviorStore } from '../store/behavior-store';
import { useCuesStore } from '../store/cues-store';
import { useSettingsStore } from '../store/settings-store';
import { useShopStore } from '../store/shop-store';

const STORAGE_KEYS = {
  behaviors: 'recupero-behaviors',
  settings: 'recupero-settings',
  shop: 'recupero-shop',
  cues: 'recupero-cues',
} as const;

interface ExportData {
  version: 1 | 2;
  exportedAt: string;
  behaviors: string | null;
  settings: string | null;
  shop?: string | null;
  cues?: string | null;
}

function isPersistedStore(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    const parsed: unknown = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null && 'state' in parsed && typeof parsed.state === 'object';
  } catch {
    return false;
  }
}

export async function exportToFile(): Promise<{ success: boolean; message: string }> {
  try {
    const [behaviors, settings, shop, cues] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.behaviors),
      AsyncStorage.getItem(STORAGE_KEYS.settings),
      AsyncStorage.getItem(STORAGE_KEYS.shop),
      AsyncStorage.getItem(STORAGE_KEYS.cues),
    ]);

    const data: ExportData = { version: 2, exportedAt: new Date().toISOString(), behaviors, settings, shop, cues };

    const json = JSON.stringify(data, null, 2);
    const filename = `recupero-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const file = new File(Paths.cache, filename);

    file.write(json);

    await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Export Recupero Data' });

    const behaviorState = behaviors ? JSON.parse(behaviors).state : null;
    const behaviorCount = behaviorState?.behaviors?.length ?? 0;
    const taskCount = behaviorState?.tasks?.length ?? 0;
    return { success: true, message: `Exported ${behaviorCount} behaviors and ${taskCount} tasks` };
  } catch (error) {
    return { success: false, message: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

export async function importFromFile(fileUri: string): Promise<{ success: boolean; message: string }> {
  try {
    const file = new File(fileUri);
    const json = await file.text();

    const data = JSON.parse(json) as Partial<ExportData>;

    if ((data.version !== 1 && data.version !== 2) || !isPersistedStore(data.behaviors)) {
      return { success: false, message: 'Invalid format — export from Recupero first' };
    }

    const entries = [
      [STORAGE_KEYS.behaviors, data.behaviors],
      ...(data.settings == null ? [] : [[STORAGE_KEYS.settings, data.settings]]),
      ...(data.shop == null ? [] : [[STORAGE_KEYS.shop, data.shop]]),
      ...(data.cues == null ? [] : [[STORAGE_KEYS.cues, data.cues]]),
    ] as Array<[string, string]>;
    if (entries.some(([, value]) => !isPersistedStore(value))) {
      return { success: false, message: 'Invalid format — export from Recupero first' };
    }

    await AsyncStorage.multiSet(entries);
    await Promise.all([
      useBehaviorStore.persist.rehydrate(),
      useSettingsStore.persist.rehydrate(),
      useShopStore.persist.rehydrate(),
      useCuesStore.persist.rehydrate(),
    ]);

    const behaviorState = data.behaviors ? JSON.parse(data.behaviors).state : null;
    const behaviorCount = behaviorState?.behaviors?.length ?? 0;
    const taskCount = behaviorState?.tasks?.length ?? 0;
    return { success: true, message: `Imported ${behaviorCount} behaviors and ${taskCount} tasks` };
  } catch (error) {
    return { success: false, message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}
