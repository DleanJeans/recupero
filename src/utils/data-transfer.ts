import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { sendFileToDev } from '../../modules/dev-handoff';
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

async function writeBackupFile(): Promise<{ file: File; summary: string }> {
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

  const behaviorState = behaviors ? JSON.parse(behaviors).state : null;
  const behaviorCount = behaviorState?.behaviors?.length ?? 0;
  const taskCount = behaviorState?.tasks?.length ?? 0;
  return { file, summary: `${behaviorCount} behaviors and ${taskCount} tasks` };
}

export async function exportToFile(): Promise<{ success: boolean; message: string }> {
  try {
    const { file, summary } = await writeBackupFile();
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Export Recupero Data' });
    return { success: true, message: `Exported ${summary}` };
  } catch (error) {
    return { success: false, message: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

/** Exports a backup and opens it straight in the Recupero dev build, which offers to import it. */
export async function sendToDevBuild(): Promise<{ success: boolean; message: string }> {
  try {
    const { file, summary } = await writeBackupFile();
    const opened = await sendFileToDev(file.uri);
    if (!opened) {
      return { success: false, message: 'Recupero Dev is not installed, or it was built before Send to dev existed' };
    }
    return { success: true, message: `Sent ${summary}` };
  } catch (error) {
    return { success: false, message: `Send failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
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

    const previousEntries = await AsyncStorage.multiGet(entries.map(([key]) => key));
    try {
      await AsyncStorage.multiSet(entries);
      await Promise.all([
        useBehaviorStore.persist.rehydrate(),
        useSettingsStore.persist.rehydrate(),
        useShopStore.persist.rehydrate(),
        useCuesStore.persist.rehydrate(),
      ]);
    } catch (error) {
      try {
        const previousValues = previousEntries.filter(([, value]) => value != null) as Array<[string, string]>;
        const missingKeys = previousEntries.filter(([, value]) => value == null).map(([key]) => key);
        if (previousValues.length > 0) await AsyncStorage.multiSet(previousValues);
        if (missingKeys.length > 0) await AsyncStorage.multiRemove(missingKeys);
        await Promise.all([
          useBehaviorStore.persist.rehydrate(),
          useSettingsStore.persist.rehydrate(),
          useShopStore.persist.rehydrate(),
          useCuesStore.persist.rehydrate(),
        ]);
      } catch {
        // Preserve the original import error; the caller still receives failure.
      }
      throw error;
    }

    const behaviorState = data.behaviors ? JSON.parse(data.behaviors).state : null;
    const behaviorCount = behaviorState?.behaviors?.length ?? 0;
    const taskCount = behaviorState?.tasks?.length ?? 0;
    return { success: true, message: `Imported ${behaviorCount} behaviors and ${taskCount} tasks` };
  } catch (error) {
    return { success: false, message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}
