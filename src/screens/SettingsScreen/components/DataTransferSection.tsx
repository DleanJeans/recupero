import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Button } from '../../../components/Button';
import { Text } from '../../../components/Text';
import { Colors } from '../../../utils/colors';
import { exportToFile, importFromFile } from '../../../utils/dataTransfer';

export function DataTransferSection() {
  const [isTransferring, setIsTransferring] = useState(false);

  const handleExport = async () => {
    setIsTransferring(true);
    const result = await exportToFile();
    setIsTransferring(false);
    if (!result.success) {
      Alert.alert('Error', result.message);
    }
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      Alert.alert('Import Data', 'This will replace your current data on this device. Continue?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          style: 'destructive',
          onPress: async () => {
            setIsTransferring(true);
            const importResult = await importFromFile(result.assets[0].uri);
            setIsTransferring(false);
            if (importResult.success) {
              Alert.alert('Imported', `${importResult.message}. Restart the app to see changes.`);
            } else {
              Alert.alert('Error', importResult.message);
            }
          },
        },
      ]);
    } catch (error) {
      setIsTransferring(false);
      Alert.alert('Error', `File pick failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>DATA</Text>
      <View style={styles.optionsRow}>
        <Button
          variant="ghost"
          onPress={handleExport}
          disabled={isTransferring}
          style={[styles.optionCard, isTransferring && { opacity: 0.5 }]}
        >
          <Ionicons
            name="document-text-outline"
            size={22}
            color={Colors.text.white}
            style={{ marginBottom: 6 }}
          />
          <Text style={styles.optionLabel}>Export</Text>
          <Text style={styles.optionDescriptionSmall}>Save JSON file</Text>
        </Button>

        <Button
          variant="ghost"
          onPress={handleImport}
          disabled={isTransferring}
          style={[styles.optionCard, isTransferring && { opacity: 0.5 }]}
        >
          <Ionicons
            name="folder-open-outline"
            size={22}
            color={Colors.text.white}
            style={{ marginBottom: 6 }}
          />
          <Text style={styles.optionLabel}>Import</Text>
          <Text style={styles.optionDescriptionSmall}>Pick JSON file</Text>
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 24, marginHorizontal: 16 },
  sectionTitle: {
    color: Colors.text.faint,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  optionsRow: { flexDirection: 'row', gap: 10 },
  optionCard: { flex: 1, padding: 16, borderWidth: 1.5, borderColor: Colors.bg.card },
  optionLabel: { color: Colors.text.muted, fontSize: 16, fontWeight: '600', marginBottom: 4 },
  optionDescriptionSmall: { color: Colors.text.dim, fontSize: 12, fontWeight: '400', marginTop: 2 },
});
