import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '../../../components/Button';
import { Text } from '../../../components/Text';
import { Colors } from '../../../utils/colors';

interface DetailsActionsProps {
  onEdit: () => void;
  onLog: () => void;
}

export function DetailsActions({ onEdit, onLog }: DetailsActionsProps) {
  return (
    <View style={styles.detailsActionsRow}>
      <Button
        variant="secondary"
        style={styles.detailAction}
        onPress={onEdit}
      >
        <View style={styles.actionIconRow}>
          <Ionicons
            name="create-outline"
            size={18}
            color={Colors.text.light}
          />
          <Text style={styles.actionLabel}>Edit</Text>
        </View>
      </Button>
      <Button
        variant="primary"
        style={styles.detailAction}
        onPress={onLog}
      >
        Log
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  detailsActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  detailAction: { flex: 1, position: 'relative', bottom: 0, left: 0, right: 0 },
  actionIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionLabel: {
    color: Colors.text.light,
    fontSize: 16,
    fontWeight: '600',
  },
});
