import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AddBehaviorForm } from '../components/AddBehaviorForm';
import { BehaviorCard } from '../components/BehaviorCard';
import { LogConfirmModal } from '../components/LogConfirmModal';
import { Text } from '../components/Text';
import { useBehaviorStore } from '../store/behaviorStore';
import type { BehaviorEntry } from '../types/behavior';

export function HomeScreen() {
  const { behaviors, addBehavior, logBehavior, removeBehavior } = useBehaviorStore();
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('');
  const [loggingBehavior, setLoggingBehavior] = useState<BehaviorEntry | null>(null);

  const handleAdd = useCallback(() => {
    const name = newName.trim();
    if (!name) return;
    const raw = newIcon.trim();
    const icon = raw
      ? raw.startsWith('http://') || raw.startsWith('https://')
        ? { uri: raw }
        : raw
      : undefined;
    addBehavior(name, icon);
    setNewName('');
    setNewIcon('');
    setIsAdding(false);
  }, [newName, newIcon, addBehavior]);

  const handleRemove = useCallback(
    (behavior: BehaviorEntry) => {
      Alert.alert('Remove Behavior', `Remove "${behavior.name}"?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeBehavior(behavior.id) },
      ]);
    },
    [removeBehavior],
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Recupero</Text>

      <FlatList
        data={behaviors}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <BehaviorCard
            behavior={item}
            onLog={() => setLoggingBehavior(item)}
            onRemove={() => handleRemove(item)}
          />
        )}
        ListEmptyComponent={<Text style={styles.empty}>No behaviors yet. Add one below!</Text>}
        contentContainerStyle={behaviors.length === 0 && styles.emptyContainer}
      />

      {isAdding ? (
        <AddBehaviorForm
          newIcon={newIcon}
          newName={newName}
          onChangeIcon={setNewIcon}
          onChangeName={setNewName}
          onAdd={handleAdd}
          onCancel={() => setIsAdding(false)}
        />
      ) : (
        <Pressable
          style={styles.fab}
          onPress={() => setIsAdding(true)}
        >
          <Text style={styles.fabText}>+ Add Behavior</Text>
        </Pressable>
      )}

      <LogConfirmModal
        behaviorName={loggingBehavior?.name ?? ''}
        visible={loggingBehavior != null}
        onConfirm={(timestamp) => {
          if (loggingBehavior) logBehavior(loggingBehavior.id, timestamp);
          setLoggingBehavior(null);
        }}
        onCancel={() => setLoggingBehavior(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
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
  fab: {
    margin: 16,
    backgroundColor: '#4a9eff',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  fabText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
