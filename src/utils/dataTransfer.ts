import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const STORAGE_KEYS = { behaviors: 'recupero-behaviors', settings: 'recupero-settings' } as const;

interface ExportData {
  version: 1;
  exportedAt: string;
  behaviors: string | null;
  settings: string | null;
}

export async function exportToFile(): Promise<{ success: boolean; message: string }> {
  try {
    const [behaviors, settings] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.behaviors),
      AsyncStorage.getItem(STORAGE_KEYS.settings),
    ]);

    const data: ExportData = { version: 1, exportedAt: new Date().toISOString(), behaviors, settings };

    const json = JSON.stringify(data, null, 2);
    const filename = `recupero-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const file = new File(Paths.cache, filename);

    file.write(json);

    await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Export Recupero Data' });

    const behaviorCount = behaviors ? (JSON.parse(behaviors).state?.behaviors?.length ?? 0) : 0;
    return { success: true, message: `Exported ${behaviorCount} behaviors` };
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

    await Promise.all(operations);

    const behaviorCount = data.behaviors ? (JSON.parse(data.behaviors).state?.behaviors?.length ?? 0) : 0;
    return { success: true, message: `Imported ${behaviorCount} behaviors` };
  } catch (error) {
    return { success: false, message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}
