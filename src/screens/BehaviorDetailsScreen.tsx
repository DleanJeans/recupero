import { Ionicons } from '@expo/vector-icons';
import { type RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AddBehaviorForm } from '../components/AddBehaviorForm';
import { BehaviorLogItem } from '../components/BehaviorLogItem';
import { CooldownLabel } from '../components/CooldownLabel';
import { LogBehaviorModal } from '../components/LogBehaviorModal';
import { Text } from '../components/Text';
import { useBehaviorStore } from '../store/behaviorStore';
import type { BehaviorEntry, LogEntry } from '../types/behavior';
import type { RootStackParamList } from '../types/navigation';

type BehaviorDetailsRouteProp = RouteProp<RootStackParamList, 'BehaviorDetails'>;
export function BehaviorDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute<BehaviorDetailsRouteProp>();
  const { behaviorId } = route.params;

  const { behaviors, removeLog, updateLog, updateBehavior } = useBehaviorStore();
  const behavior = behaviors.find((b) => b.id === behaviorId);
  const [editingLog, setEditingLog] = useState<LogEntry | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        {behavior ? (
          <BehaviorTitle
            icon={behavior.icon}
            name={behavior.name}
            cooldownMinutes={behavior.cooldownMinutes}
            lastTimestamp={behavior.lastTimestamp}
            cooldownType={behavior.cooldownType}
          />
        ) : (
          <BehaviorTitle />
        )}
        {behavior ? <EditButton onPress={() => setShowEditModal(true)} /> : null}
      </View>

      {behavior ? (
        <>
          <LogList
            logs={behavior.logs}
            onRemove={handleRemoveLog}
            onEdit={setEditingLog}
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

          <EditBehaviorModal
            key={showEditModal ? 'open' : 'closed'}
            visible={showEditModal}
            behavior={behavior}
            onSave={(updates) => updateBehavior(behaviorId, updates)}
            onClose={() => setShowEditModal(false)}
          />
        </>
      ) : null}
    </SafeAreaView>
  );
}

// ---- Header components ----

interface BackButtonProps {
  onPress: () => void;
}

function BackButton({ onPress }: BackButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.backBtn,
        pressed && {
          opacity: 0.5,
        },
      ]}
      onPress={onPress}
    >
      <Ionicons
        name="chevron-back"
        size={28}
        color="#fff"
      />
    </Pressable>
  );
}

interface BehaviorTitleProps {
  icon?: BehaviorEntry['icon'];
  name?: string;
  cooldownMinutes?: number;
  lastTimestamp?: number | null;
  cooldownType?: 'rest' | 'limit';
}
function BehaviorTitle({ icon, name, cooldownMinutes, lastTimestamp, cooldownType }: BehaviorTitleProps) {
  if (!name) {
    return <Text style={styles.headerTitle}>Behavior Not Found</Text>;
  }

  return (
    <View style={styles.titleContainer}>
      {icon && typeof icon === 'object' ? (
        <Image
          source={icon}
          style={styles.iconImage}
        />
      ) : (
        <Text style={styles.emoji}>{typeof icon === 'string' ? icon : '⏱️'}</Text>
      )}
      <View style={styles.titleTextRow}>
        <Text style={styles.headerTitle}>{name}</Text>
        {cooldownMinutes ? (
          <CooldownLabel
            minutes={cooldownMinutes}
            lastTimestamp={lastTimestamp}
            cooldownType={cooldownType}
          />
        ) : null}
      </View>
    </View>
  );
}

interface EditButtonProps {
  onPress: () => void;
}
function EditButton({ onPress }: EditButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.editBehaviorBtn,
        pressed && {
          opacity: 0.5,
        },
      ]}
      onPress={onPress}
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

interface LogListProps {
  logs: LogEntry[];
  onRemove: (logId: string) => void;
  onEdit: (log: LogEntry) => void;
}
function LogList({ logs, onRemove, onEdit }: LogListProps) {
  const sortedLogs = [
    ...logs,
  ].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <FlatList
      data={sortedLogs}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <BehaviorLogItem
          log={item}
          onRemove={() => onRemove(item.id)}
          onEdit={() => onEdit(item)}
        />
      )}
      ListEmptyComponent={<Text style={styles.empty}>No logs yet.{'\n'}Press the + button to log this behavior.</Text>}
      contentContainerStyle={sortedLogs.length === 0 && styles.emptyContainer}
    />
  );
}

// ---- Modal components ----

interface EditBehaviorModalProps {
  visible: boolean;
  behavior: BehaviorEntry;
  onSave: (updates: {
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
  onClose: () => void;
}
function EditBehaviorModal({ visible, behavior, onSave, onClose }: EditBehaviorModalProps) {
  const [editIcon, setEditIcon] = useState('');
  const [editName, setEditName] = useState('');
  const [editCooldown, setEditCooldown] = useState(60);
  const [editCooldownType, setEditCooldownType] = useState<'rest' | 'limit'>('rest');

  useEffect(() => {
    if (!visible) return;
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
    visible,
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
    onSave({
      name: editName.trim(),
      icon,
      cooldownMinutes: editCooldown,
      cooldownType: editCooldownType,
    });
    onClose();
  }, [
    editName,
    editIcon,
    editCooldown,
    editCooldownType,
    onSave,
    onClose,
  ]);

  const handleCancel = useCallback(() => {
    onClose();
  }, [
    onClose,
  ]);

  return (
    <Modal
      visible={visible}
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
    alignItems: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 8,
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
