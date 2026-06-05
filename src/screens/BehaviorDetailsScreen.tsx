import { Ionicons } from '@expo/vector-icons';
import { type RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Image, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CooldownInput } from '../components/CooldownInput';
import { LogBehaviorModal } from '../components/LogBehaviorModal';
import { LogItem } from '../components/LogItem';
import { Text } from '../components/Text';
import { useBehaviorStore } from '../store/behaviorStore';
import type { LogEntry } from '../types/behavior';
import type { RootStackParamList } from '../types/navigation';
import { formatCooldown } from '../utils/timeUtils';

type BehaviorDetailsRouteProp = RouteProp<RootStackParamList, 'BehaviorDetails'>;

export function BehaviorDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute<BehaviorDetailsRouteProp>();
  const { behaviorId } = route.params;

  const { behaviors, removeLog, updateLog, updateBehaviorCooldown } = useBehaviorStore();
  const behavior = behaviors.find((b) => b.id === behaviorId);
  const [editingLog, setEditingLog] = useState<LogEntry | null>(null);
  const [editingCooldown, setEditingCooldown] = useState(false);
  const [cooldownDraft, setCooldownDraft] = useState(0);

  const handleRemoveLog = useCallback(
    (logId: string) => {
      Alert.alert('Remove Log', 'Remove this log entry?', [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeLog(behaviorId, logId),
        },
      ]);
    },
    [
      behaviorId,
      removeLog,
    ],
  );

  if (!behavior) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [
              styles.backBtn,
              pressed && {
                opacity: 0.5,
              },
            ]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons
              name="chevron-back"
              size={28}
              color="#fff"
            />
          </Pressable>
          <Text style={styles.headerTitle}>Behavior Not Found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const sortedLogs = [
    ...behavior.logs,
  ].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [
            styles.backBtn,
            pressed && {
              opacity: 0.5,
            },
          ]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons
            name="chevron-back"
            size={28}
            color="#fff"
          />
        </Pressable>
        <View style={styles.titleContainer}>
          {behavior.icon && typeof behavior.icon === 'object' ? (
            <Image
              source={behavior.icon}
              style={styles.iconImage}
            />
          ) : (
            <Text style={styles.emoji}>{typeof behavior.icon === 'string' ? behavior.icon : '⏱️'}</Text>
          )}
          <Text style={styles.headerTitle}>{behavior.name}</Text>
        </View>
      </View>

      <View style={styles.cooldownRow}>
        {behavior.cooldownMinutes ? (
          <Text style={styles.cooldownDisplay}>{formatCooldown(behavior.cooldownMinutes)}</Text>
        ) : null}
        {editingCooldown ? (
          <View style={styles.cooldownEditContainer}>
            <CooldownInput
              cooldownMinutes={cooldownDraft}
              onChange={setCooldownDraft}
            />
            <View style={styles.cooldownEditActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.cooldownCancelBtn,
                  pressed && {
                    opacity: 0.6,
                  },
                ]}
                onPress={() => {
                  setCooldownDraft(behavior.cooldownMinutes);
                  setEditingCooldown(false);
                }}
              >
                <Text style={styles.cooldownCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.cooldownSaveBtn,
                  pressed && {
                    opacity: 0.85,
                  },
                ]}
                onPress={() => {
                  updateBehaviorCooldown(behaviorId, cooldownDraft);
                  setEditingCooldown(false);
                }}
              >
                <Text style={styles.cooldownSaveText}>Save</Text>
              </Pressable>
            </View>
          </View>
        ) : behavior.cooldownMinutes ? (
          <Pressable
            style={({ pressed }) => [
              styles.cooldownEditBtn,
              pressed && {
                opacity: 0.6,
              },
            ]}
            onPress={() => {
              setCooldownDraft(behavior.cooldownMinutes);
              setEditingCooldown(true);
            }}
          >
            <Ionicons
              name="create-outline"
              size={18}
              color="#aaa"
            />
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [
              styles.addCooldownBtn,
              pressed && {
                opacity: 0.6,
              },
            ]}
            onPress={() => {
              setCooldownDraft(30);
              setEditingCooldown(true);
            }}
          >
            <Ionicons
              name="add-circle-outline"
              size={18}
              color="#888"
            />
            <Text style={styles.addCooldownText}>Add Cooldown</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        data={sortedLogs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <LogItem
            log={item}
            onRemove={() => handleRemoveLog(item.id)}
            onEdit={() => setEditingLog(item)}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No logs yet.{'\n'}Press the + button to log this behavior.</Text>
        }
        contentContainerStyle={sortedLogs.length === 0 && styles.emptyContainer}
      />

      <LogBehaviorModal
        behaviorName={behavior.name}
        visible={editingLog != null}
        initialTimestamp={editingLog?.timestamp}
        onConfirm={(timestamp) => {
          if (editingLog) updateLog(behaviorId, editingLog.id, timestamp);
          setEditingLog(null);
        }}
        onCancel={() => setEditingLog(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginBottom: 8,
  },
  backBtn: {
    padding: 8,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  emoji: {
    fontSize: 24,
    marginRight: 8,
  },
  iconImage: {
    width: 32,
    height: 32,
    borderRadius: 6,
    marginRight: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  cooldownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  cooldownDisplay: {
    color: '#888',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  cooldownEditBtn: {
    padding: 4,
  },
  cooldownEditContainer: {
    flex: 1,
    gap: 8,
  },
  cooldownEditActions: {
    flexDirection: 'row',
    gap: 8,
  },
  cooldownCancelBtn: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cooldownCancelText: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: '600',
  },
  cooldownSaveBtn: {
    flex: 1,
    backgroundColor: '#EFEFEF',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cooldownSaveText: {
    color: '#111',
    fontSize: 14,
    fontWeight: '700',
  },
  addCooldownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  addCooldownText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  empty: {
    color: '#666',
    textAlign: 'center',
    fontSize: 15,
    padding: 32,
  },
});
