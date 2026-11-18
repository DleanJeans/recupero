import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';
import { useBehaviorStore } from '../../../store/behavior-store';
import { type PendingLog, usePendingLogsStore } from '../../../store/pending-logs-store';
import type { RootStackParamList } from '../../../types/navigation';
import { Colors } from '../../../utils/colors';
import { completePendingLog } from '../../../utils/pending-log-utils';
import { splitSavedFabs } from '../../../utils/saved-fab-utils';
import { SavedLogFab } from './saved-log-fab';
import { SavedMoreSheet } from './saved-more-sheet';

interface SavedLogFabsProps {
  collapsed: boolean;
}

/** Stack of "saved for later" pills above the Add behavior button. Tap logs now; long-press edits or discards. */
export function SavedLogFabs({ collapsed }: SavedLogFabsProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const pendingLogs = usePendingLogsStore(s => s.pendingLogs);
  const removePending = usePendingLogsStore(s => s.removePending);
  const behaviors = useBehaviorStore(s => s.behaviors);
  const [moreOpen, setMoreOpen] = useState(false);
  const { shown, overflow } = useMemo(
    () => splitSavedFabs(pendingLogs.filter(p => behaviors.some(b => b.id === p.behaviorId))),
    [behaviors, pendingLogs],
  );
  if (shown.length === 0) return null;

  const openMenu = (pending: PendingLog, name: string) =>
    Alert.alert(name, 'Saved for later', [
      {
        text: 'Edit',
        onPress: () =>
          navigation.navigate('BehaviorLog', {
            behaviorId: pending.behaviorId,
            initialMode: 'log',
            pendingLogId: pending.id,
          }),
      },
      { text: 'Discard', style: 'destructive', onPress: () => removePending(pending.id) },
      { text: 'Cancel', style: 'cancel' },
    ]);

  return (
    <>
      {overflow > 0 && (
        <Pressable
          onPress={() => setMoreOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`${overflow} more saved for later`}
          style={styles.more}
        >
          <Text style={styles.moreText}>{collapsed ? `+${overflow}` : `+${overflow} more`}</Text>
        </Pressable>
      )}
      {shown.map(pending => {
        const behavior = behaviors.find(b => b.id === pending.behaviorId);
        if (!behavior) return null;
        return (
          <SavedLogFab
            key={pending.id}
            behavior={behavior}
            collapsed={collapsed}
            onPress={() => completePendingLog(pending)}
            onLongPress={() => openMenu(pending, behavior.name)}
          />
        );
      })}
      <SavedMoreSheet
        visible={moreOpen}
        onClose={() => setMoreOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  more: {
    alignSelf: 'flex-end',
    height: 36,
    minWidth: 44,
    paddingHorizontal: 14,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#26324a',
    elevation: 4,
  },
  moreText: { color: '#9cc2ff', fontSize: 13, fontWeight: '600' },
});
