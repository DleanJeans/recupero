import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';

const OPEN_PATCH_NOTES_KEY = 'recupero-open-patch-notes-after-restart';

/** Restarts into the downloaded update and asks the next launch to open Patch notes. */
export async function reloadIntoUpdate(): Promise<void> {
  try {
    await AsyncStorage.setItem(OPEN_PATCH_NOTES_KEY, '1');
  } catch {
    // Without the flag the app still restarts, it just won't open Patch notes.
  }
  try {
    await Updates.reloadAsync();
  } catch (error) {
    await AsyncStorage.removeItem(OPEN_PATCH_NOTES_KEY).catch(() => undefined);
    throw error;
  }
}

/** True once after a restart that was started from an update button. Clears the flag as it reads it. */
export async function consumeOpenPatchNotesFlag(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(OPEN_PATCH_NOTES_KEY);
    if (value == null) return false;
    await AsyncStorage.removeItem(OPEN_PATCH_NOTES_KEY);
    return true;
  } catch {
    return false;
  }
}
