import { Ionicons } from '@expo/vector-icons';
import { type RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AddBehaviorForm } from '../components/AddBehaviorForm';
import { BehaviorIcon } from '../components/BehaviorIcon';
import { BehaviorLogItem } from '../components/BehaviorLogItem';
import { CooldownLabel } from '../components/CooldownLabel';
import { LogBehaviorModal } from '../components/LogBehaviorModal';
import { Text } from '../components/Text';
import { useBehaviorStore } from '../store/behaviorStore';
import type { BehaviorEntry, LogEntry } from '../types/behavior';
import type { RootStackParamList } from '../types/navigation';

interface BehaviorDetailsContextValues {
  behavior?: BehaviorEntry;
  showEditModal: boolean;
  openEditModal: () => void;
  closeEditModal: () => void;
  editingLog: LogEntry | null;
  startEditingLog: (log: LogEntry) => void;
  saveLogEdit: (timestamp: number) => void;
  cancelLogEdit: () => void;
  removeLog: (logId: string) => void;
  saveBehavior: (updates: {
    name?: string;
    icon?:
      | string
      | {
          uri: string;
        }
      | undefined;
    cooldownMinutes?: number;
    cooldownType?: 'rest' | 'limit';
  }) => void;
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

  const { behaviors, removeLog, updateLog, updateBehavior } = useBehaviorStore();
  const behavior = behaviors.find((b) => b.id === behaviorId);
  const [editingLog, setEditingLog] = useState<LogEntry | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  function handleRemoveLog(logId: string) {
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
  }

  const context = useMemo<BehaviorDetailsContextValues>(
    () => ({
      behavior,
      showEditModal,
      openEditModal: () => setShowEditModal(true),
      closeEditModal: () => setShowEditModal(false),
      editingLog,
      startEditingLog: setEditingLog,
      saveLogEdit: (timestamp: number) => {
        if (editingLog) updateLog(behaviorId, editingLog.id, timestamp);
        setEditingLog(null);
      },
      cancelLogEdit: () => setEditingLog(null),
      removeLog: handleRemoveLog,
      saveBehavior: (updates) => updateBehavior(behaviorId, updates),
    }),
    [
      behavior,
      showEditModal,
      editingLog,
      behaviorId,
      handleRemoveLog,
      updateLog,
      updateBehavior,
    ],
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
        <LogBehaviorModalWrapper />
        <EditBehaviorModal />
      </SafeAreaView>
    </BehaviorDetailsContext.Provider>
  );
}

// ---- Header components ----

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
  const name = behavior?.name;
  const icon = behavior?.icon;

  if (!name) {
    return <Text style={styles.headerTitle}>Behavior Not Found</Text>;
  }

  return (
    <View style={styles.titleContainer}>
      <BehaviorIcon
        icon={icon}
        size={24}
      />
      <View style={styles.titleTextRow}>
        <Text style={styles.headerTitle}>{name}</Text>
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

// ---- List component ----

function BehaviorLogList() {
  const { behavior, removeLog, startEditingLog } = useBehaviorDetails();
  if (!behavior) return null;

  const logs = behavior.logs ?? [];
  const sortedLogs = useMemo(
    () =>
      [
        ...logs,
      ].sort((a, b) => b.timestamp - a.timestamp),
    [
      logs,
    ],
  );

  return (
    <FlatList
      data={sortedLogs}
      keyExtractor={(item) => item.id}
      renderItem={({ item, index }) => (
        <BehaviorLogItem
          log={item}
          nextLogTimestamp={index > 0 ? sortedLogs[index - 1].timestamp : undefined}
          onRemove={() => removeLog(item.id)}
          onEdit={() => startEditingLog(item)}
        />
      )}
      ListEmptyComponent={<Text style={styles.empty}>No logs yet.{'\n'}Press the + button to log this behavior.</Text>}
      contentContainerStyle={sortedLogs.length === 0 && styles.emptyContainer}
    />
  );
}

// ---- Modal components ----

function LogBehaviorModalWrapper() {
  const { behavior, editingLog, saveLogEdit, cancelLogEdit } = useBehaviorDetails();
  if (!behavior) return null;

  return (
    <LogBehaviorModal
      behaviorName={behavior.name}
      visible={editingLog != null}
      initialTimestamp={editingLog?.timestamp}
      onConfirm={saveLogEdit}
      onCancel={cancelLogEdit}
    />
  );
}

function EditBehaviorModal() {
  const { showEditModal, behavior, saveBehavior, closeEditModal } = useBehaviorDetails();
  if (!behavior) return null;

  const [editIcon, setEditIcon] = useState('');
  const [editName, setEditName] = useState('');
  const [editCooldown, setEditCooldown] = useState(60);
  const [editCooldownType, setEditCooldownType] = useState<'rest' | 'limit'>('rest');

  useEffect(() => {
    if (!showEditModal || !behavior) return;
    const iconStr =
      typeof behavior.icon === 'object' && behavior.icon !== null
        ? behavior.icon.uri
        : typeof behavior.icon === 'string'
          ? behavior.icon
          : '';
    setEditIcon(iconStr);
    setEditName(behavior.name);
    setEditCooldown(behavior.cooldownMinutes || 60);
    setEditCooldownType(behavior.cooldownType || 'rest');
  }, [
    showEditModal,
    behavior,
  ]);

  const handleSave = useCallback(() => {
    if (!editName.trim()) return;
    const raw = editIcon.trim();
    const icon = raw
      ? raw.startsWith('http://') || raw.startsWith('https://')
        ? {
            uri: raw,
          }
        : raw
      : undefined;
    saveBehavior({
      name: editName.trim(),
      icon,
      cooldownMinutes: editCooldown,
      cooldownType: editCooldownType,
    });
    closeEditModal();
  }, [
    editName,
    editIcon,
    editCooldown,
    editCooldownType,
    saveBehavior,
    closeEditModal,
  ]);

  const handleCancel = useCallback(() => {
    closeEditModal();
  }, [
    closeEditModal,
  ]);

  return (
    <Modal
      visible={showEditModal}
      transparent
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        behavior="padding"
        style={styles.editModalOverlay}
      >
        <Pressable
          style={styles.editModalBackdrop}
          onPress={handleCancel}
        />
        <AddBehaviorForm
          newIcon={editIcon}
          newName={editName}
          cooldownMinutes={editCooldown}
          cooldownType={editCooldownType}
          onChangeIcon={setEditIcon}
          onChangeName={setEditName}
          onChangeCooldown={setEditCooldown}
          onChangeCooldownType={setEditCooldownType}
          onAdd={handleSave}
          onCancel={handleCancel}
          submitLabel="Save"
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

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
