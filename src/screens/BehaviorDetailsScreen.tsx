import { Ionicons } from '@expo/vector-icons';
import { type RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AddBehaviorForm } from '../components/AddBehaviorForm';
import { LogBehaviorModal } from '../components/LogBehaviorModal';
import { LogItem } from '../components/LogItem';
import { Text } from '../components/Text';
import { useBehaviorStore } from '../store/behaviorStore';
import type { LogEntry } from '../types/behavior';
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
  const [editIcon, setEditIcon] = useState('');
  const [editName, setEditName] = useState('');
  const [editCooldown, setEditCooldown] = useState(60);

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

  const handleEditSave = useCallback(() => {
    if (!editName.trim()) return;
    const raw = editIcon.trim();
    const icon = raw
      ? raw.startsWith('http://') || raw.startsWith('https://')
        ? {
            uri: raw,
          }
        : raw
      : undefined;
    updateBehavior(behaviorId, {
      name: editName.trim(),
      icon,
      cooldownMinutes: editCooldown,
    });
    setShowEditModal(false);
  }, [
    behaviorId,
    editName,
    editIcon,
    editCooldown,
    updateBehavior,
  ]);

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
        <Pressable
          style={({ pressed }) => [
            styles.editBehaviorBtn,
            pressed && {
              opacity: 0.5,
            },
          ]}
          onPress={() => {
            const iconStr =
              typeof behavior.icon === 'object' && behavior.icon !== null
                ? behavior.icon.uri
                : typeof behavior.icon === 'string'
                  ? behavior.icon
                  : '';
            setEditIcon(iconStr);
            setEditName(behavior.name);
            setEditCooldown(behavior.cooldownMinutes || 60);
            setShowEditModal(true);
          }}
        >
          <Ionicons
            name="create-outline"
            size={26}
            color="#aaa"
          />
        </Pressable>
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

      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <KeyboardAvoidingView
          behavior="padding"
          style={styles.editModalOverlay}
        >
          <Pressable
            style={styles.editModalBackdrop}
            onPress={() => setShowEditModal(false)}
          />
          <AddBehaviorForm
            newIcon={editIcon}
            newName={editName}
            cooldownMinutes={editCooldown}
            onChangeIcon={setEditIcon}
            onChangeName={setEditName}
            onChangeCooldown={setEditCooldown}
            onAdd={handleEditSave}
            onCancel={() => setShowEditModal(false)}
            submitLabel="Save"
          />
        </KeyboardAvoidingView>
      </Modal>
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
