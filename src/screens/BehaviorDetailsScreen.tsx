import { Ionicons } from '@expo/vector-icons';
import { type RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Image, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogBehaviorModal } from '../components/LogBehaviorModal';
import { LogItem } from '../components/LogItem';
import { MetadataInput } from '../components/MetadataInput';
import { Text } from '../components/Text';
import { useBehaviorStore } from '../store/behaviorStore';
import type { LogEntry } from '../types/behavior';
import type { MetadataField } from '../types/metadata';
import type { RootStackParamList } from '../types/navigation';

type BehaviorDetailsRouteProp = RouteProp<RootStackParamList, 'BehaviorDetails'>;

export function BehaviorDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute<BehaviorDetailsRouteProp>();
  const { behaviorId } = route.params;

  const { behaviors, removeLog, updateLog, updateBehaviorMetadata } = useBehaviorStore();
  const behavior = behaviors.find((b) => b.id === behaviorId);
  const [editingLog, setEditingLog] = useState<LogEntry | null>(null);
  const [editingMetadata, setEditingMetadata] = useState(false);

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

  const handleMetadataChange = (metadata: MetadataField[]) => {
    updateBehaviorMetadata(behaviorId, metadata);
  };

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

      <View style={styles.metadataSection}>
        <View style={styles.metadataTitleRow}>
          <Text style={styles.metadataTitle}>Metadata</Text>
          <Pressable
            style={styles.editMetadataBtn}
            onPress={() => setEditingMetadata(!editingMetadata)}
          >
            <Ionicons
              name={editingMetadata ? 'checkmark' : 'create-outline'}
              size={20}
              color="#fff"
            />
          </Pressable>
        </View>

        {editingMetadata ? (
          <MetadataInput
            metadata={behavior.metadata}
            onChange={handleMetadataChange}
          />
        ) : behavior.metadata.length > 0 ? (
          <View style={styles.metadataList}>
            {behavior.metadata.map((field) => (
              <View
                key={field.id}
                style={styles.metadataItem}
              >
                <Text style={styles.metadataName}>{field.name}</Text>
                <Text style={styles.metadataValue}>
                  {field.value}
                  {field.unit && ` ${field.unit}`}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.noMetadata}>No metadata configured</Text>
        )}
      </View>

      <Text style={styles.logsTitle}>Logs</Text>

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
  metadataSection: {
    backgroundColor: '#1e1e1e',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  metadataTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metadataTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  editMetadataBtn: {
    padding: 4,
  },
  metadataList: {
    gap: 8,
  },
  metadataItem: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metadataName: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: '600',
  },
  metadataValue: {
    color: '#fff',
    fontSize: 15,
  },
  noMetadata: {
    color: '#666',
    fontSize: 14,
    fontStyle: 'italic',
  },
  logsTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 16,
    marginBottom: 12,
  },
});
