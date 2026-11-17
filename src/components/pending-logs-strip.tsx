import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useBehaviorStore } from '../store/behavior-store';
import { usePendingLogsStore } from '../store/pending-logs-store';
import type { RootStackParamList } from '../types/navigation';
import { Colors } from '../utils/colors';
import { completePendingLog } from '../utils/pending-log-utils';
import { formatElapsedNumeric } from '../utils/time-utils';
import { BehaviorIcon } from './behavior-icon';
import { Text } from './text';

interface Props {
  /** Only show pending logs of this behaviour (its own screen). Undefined = all of them (Routines). */
  behaviorId?: string;
}

/** Logs saved for later: details already entered, waiting to be logged with the time they are finished. */
export function PendingLogsStrip({ behaviorId }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const pendingLogs = usePendingLogsStore(s => s.pendingLogs);
  const removePending = usePendingLogsStore(s => s.removePending);
  const behaviors = useBehaviorStore(s => s.behaviors);
  const shown = useMemo(
    () => pendingLogs.filter(p => behaviorId == null || p.behaviorId === behaviorId),
    [behaviorId, pendingLogs],
  );
  if (shown.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Saved for later</Text>
      {shown.map(pending => {
        const behavior = behaviors.find(b => b.id === pending.behaviorId);
        if (!behavior) return null;
        return (
          <Pressable
            key={pending.id}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            onPress={() =>
              navigation.navigate('BehaviorLog', {
                behaviorId: pending.behaviorId,
                initialMode: 'log',
                pendingLogId: pending.id,
              })
            }
            accessibilityLabel={`Edit saved log for ${behavior.name}`}
          >
            <BehaviorIcon
              behavior={behavior}
              size={26}
            />
            <View style={styles.info}>
              <Text
                style={styles.name}
                numberOfLines={1}
              >
                {behavior.name}
              </Text>
              <Text style={styles.sub}>Saved {formatElapsedNumeric(pending.savedAt)} · tap to edit</Text>
            </View>
            <Pressable
              hitSlop={8}
              onPress={() => removePending(pending.id)}
              accessibilityLabel="Discard saved log"
            >
              <Ionicons
                name="close"
                size={20}
                color={Colors.text.secondary}
              />
            </Pressable>
            <Pressable
              style={styles.done}
              onPress={() => completePendingLog(pending)}
              accessibilityLabel={`Log ${behavior.name} now`}
            >
              <Ionicons
                name="checkmark"
                size={16}
                color={Colors.bg.black}
              />
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingVertical: 8, gap: 6 },
  heading: { color: Colors.text.secondary, fontSize: 12, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.bg.elevated,
  },
  pressed: { opacity: 0.8 },
  info: { flex: 1 },
  name: { color: Colors.text.primary, fontSize: 15, fontWeight: '600' },
  sub: { color: Colors.text.secondary, fontSize: 12 },
  done: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.type.desirable,
  },
  doneText: { color: Colors.bg.black, fontSize: 13, fontWeight: '700' },
});
