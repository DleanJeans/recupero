import { Ionicons } from '@expo/vector-icons';
import { type RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import React, { createContext, useContext, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BehaviorForm } from '../components/BehaviorForm';
import { BehaviorIcon } from '../components/BehaviorIcon';
import { BehaviorLogItem } from '../components/BehaviorLogItem';
import { BehaviorLogModal } from '../components/BehaviorLogModal';
import { CooldownLabel } from '../components/CooldownLabel';
import { DistanceIndicator } from '../components/DistanceIndicator';
import { Text } from '../components/Text';
import { useBehaviorStore } from '../store/behaviorStore';
import type { BehaviorEntry, LogEntry } from '../types/behavior';
import type { RootStackParamList } from '../types/navigation';

interface BehaviorDetailsContextValues {
  behavior: BehaviorEntry;
  showEditModal: boolean;
  openEditModal: () => void;
  closeEditModal: () => void;
  editingLog: LogEntry | null;
  startEditingLog: (log: LogEntry) => void;
  clearEditingLog: () => void;
}

const BehaviorDetailsContext = createContext<BehaviorDetailsContextValues | null>(null);

function useBehaviorDetails(): BehaviorDetailsContextValues {
  const ctx = useContext(BehaviorDetailsContext);
  if (!ctx) throw new Error('useBehaviorDetails must be used within BehaviorDetailsScreen');
  return ctx;
}

type BehaviorDetailsRouteProp = RouteProp<RootStackParamList, 'BehaviorDetails'>;
export function BehaviorDetailsScreen() {
  const route = useRoute<BehaviorDetailsRouteProp>();
  const { behaviorId } = route.params;

  const { behaviors } = useBehaviorStore();
  const behavior = behaviors.find(b => b.id === behaviorId);

  if (!behavior) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.headerTitle}>Behavior Not Found</Text>
      </SafeAreaView>
    );
  }

  const [editingLog, setEditingLog] = useState<LogEntry | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const context = useMemo<BehaviorDetailsContextValues>(
    () => ({
      behavior,
      showEditModal,
      openEditModal: () => setShowEditModal(true),
      closeEditModal: () => setShowEditModal(false),
      editingLog,
      startEditingLog: setEditingLog,
      clearEditingLog: () => setEditingLog(null),
    }),
    [behavior, showEditModal, editingLog, setEditingLog, behaviorId],
  );

  return (
    <BehaviorDetailsContext.Provider value={context}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <BackButton />
          <BehaviorTitle />
          <EditButton />
        </View>

        <BehaviorLogList />
        <EditLogModal />
        <EditBehaviorModal />
      </SafeAreaView>
    </BehaviorDetailsContext.Provider>
  );
}

// #region Header components

function BackButton() {
  const navigation = useNavigation();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.backBtn,
        pressed && {
          opacity: 0.5,
        },
      ]}
      onPress={navigation.goBack}
    >
      <Ionicons
        name="chevron-back"
        size={28}
        color="#fff"
      />
    </Pressable>
  );
}

function BehaviorTitle() {
  const { behavior } = useBehaviorDetails();

  return (
    <View style={styles.titleContainer}>
      <BehaviorIcon
        behavior={behavior}
        size={24}
      />
      <View style={styles.titleTextRow}>
        <Text style={styles.headerTitle}>{behavior.name}</Text>
        <CooldownLabel behavior={behavior} />
      </View>
    </View>
  );
}

function EditButton() {
  const { openEditModal } = useBehaviorDetails();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.editBehaviorBtn,
        pressed && {
          opacity: 0.5,
        },
      ]}
      onPress={openEditModal}
    >
      <Ionicons
        name="create-outline"
        size={26}
        color="#aaa"
      />
    </Pressable>
  );
}
// #endregion

// #region List component

function BehaviorLogList() {
  const { behavior, startEditingLog } = useBehaviorDetails();

  const logs = behavior.logs ?? [];
  const sortedLogs = useMemo(() => [...logs].sort((a, b) => b.timestamp - a.timestamp), [logs]);

  return (
    <FlatList
      data={sortedLogs}
      keyExtractor={item => item.id}
      renderItem={({ item, index }) => (
        <>
          {index > 0 && <DistanceIndicator durationMs={sortedLogs[index - 1].timestamp - item.timestamp} />}
          <BehaviorLogItem
            log={item}
            behaviorId={behavior.id}
            onEdit={() => startEditingLog(item)}
          />
        </>
      )}
      ListEmptyComponent={<Text style={styles.empty}>No logs yet.{'\n'}Press the + button to log this behavior.</Text>}
      contentContainerStyle={sortedLogs.length === 0 && styles.emptyContainer}
    />
  );
}
// #endregion

// #region Modal components

function EditLogModal() {
  const { behavior, editingLog, clearEditingLog } = useBehaviorDetails();

  return (
    <BehaviorLogModal
      behavior={behavior}
      visible={editingLog != null}
      logId={editingLog?.id}
      initialTimestamp={editingLog?.timestamp}
      onClose={clearEditingLog}
    />
  );
}

function EditBehaviorModal() {
  const { showEditModal, behavior, closeEditModal } = useBehaviorDetails();

  return (
    <Modal
      visible={showEditModal}
      transparent
      animationType="slide"
      onRequestClose={closeEditModal}
    >
      <View style={styles.editModalOverlay}>
        <Pressable
          style={styles.editModalBackdrop}
          onPress={closeEditModal}
        />
        <BehaviorForm
          behavior={behavior}
          onClose={closeEditModal}
        />
      </View>
    </Modal>
  );
}
// #endregion

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  backBtn: {
    padding: 8,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  titleTextRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  editBehaviorBtn: {
    padding: 8,
  },
  editModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    marginBottom: 15,
  },
  editModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
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
