import { useEffect } from 'react';
import { Alert } from 'react-native';
import { canReceiveFromProd, subscribeToIncomingFiles } from '../../modules/dev-handoff';
import { importFromFile } from '../utils/data-transfer';

/** Dev build only: when prod/preview sends a backup (or a JSON file is opened with Recupero Dev), offer to import it. */
export function useDevHandoffImport(storesReady: boolean) {
  useEffect(() => {
    if (!storesReady || !canReceiveFromProd()) return;
    return subscribeToIncomingFiles(fileUri => {
      Alert.alert('Import data from prod?', 'This replaces all data in Recupero Dev with the received backup.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          style: 'destructive',
          onPress: async () => {
            const result = await importFromFile(fileUri);
            Alert.alert(result.success ? 'Imported' : 'Error', result.message);
          },
        },
      ]);
    });
  }, [storesReady]);
}
