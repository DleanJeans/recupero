import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const STORAGE_KEYS = { behaviors: 'recupero-behaviors', settings: 'recupero-settings', shop: 'recupero-shop' } as const;

interface ExportData {
  version: 1;
  exportedAt: string;
  behaviors: string | null;
  settings: string | null;
  shop?: string | null;
}

export async function exportToFile(): Promise<{ success: boolean; message: string }> {
  try {
    const [behaviors, settings, shop] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.behaviors),
      AsyncStorage.getItem(STORAGE_KEYS.settings),
      AsyncStorage.getItem(STORAGE_KEYS.shop),
    ]);

    const data: ExportData = { version: 1, exportedAt: new Date().toISOString(), behaviors, settings, shop };

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

    const data = JSON.parse(json) as ExportData;

    if (!data.version || !data.behaviors) {
      return { success: false, message: 'Invalid format — export from Recupero first' };
    }

    const operations: Promise<void>[] = [];

    if (data.behaviors) {
      operations.push(AsyncStorage.setItem(STORAGE_KEYS.behaviors, data.behaviors));
    }
    if (data.settings) {
      operations.push(AsyncStorage.setItem(STORAGE_KEYS.settings, data.settings));
    }
    if (data.shop) {
      operations.push(AsyncStorage.setItem(STORAGE_KEYS.shop, data.shop));
    }

    await Promise.all(operations);

    const behaviorState = data.behaviors ? JSON.parse(data.behaviors).state : null;
    const behaviorCount = behaviorState?.behaviors?.length ?? 0;
    const taskCount = behaviorState?.tasks?.length ?? 0;
    return { success: true, message: `Imported ${behaviorCount} behaviors and ${taskCount} tasks` };
  } catch (error) {
    return { success: false, message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}
