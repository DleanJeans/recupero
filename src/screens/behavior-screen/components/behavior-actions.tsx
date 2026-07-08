import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '../../../components/button';
import { Text } from '../../../components/text';
import { Colors } from '../../../utils/colors';
import { FabButtonRow } from '../../components/fab-button-row';

interface BehaviorActionsProps {
  onDelete: () => void;
  onEdit: () => void;
  onLog: () => void;
}

export function BehaviorActions({ onDelete, onEdit, onLog }: BehaviorActionsProps) {
  return (
    <FabButtonRow>
      <Button
        variant="danger"
        style={styles.deleteButton}
        onPress={onDelete}
        accessibilityLabel="Delete behavior"
      >
        <View style={styles.deleteIconWrapper}>
          <Ionicons
            name="trash-outline"
            size={20}
            color={Colors.text.primary}
          />
        </View>
      </Button>
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
    </FabButtonRow>
  );
}

const styles = StyleSheet.create({
  detailAction: { flex: 1, position: 'relative', bottom: 0, left: 0, right: 0 },
  deleteButton: {
    width: 48,
    height: 48,
    padding: 0,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  deleteIconWrapper: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
