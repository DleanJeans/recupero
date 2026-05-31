import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AddBehaviorForm } from '../components/AddBehaviorForm';
import { BehaviorCard } from '../components/BehaviorCard';
import { LogBehaviorModal } from '../components/LogBehaviorModal';
import { Text } from '../components/Text';
import { useBehaviorStore } from '../store/behaviorStore';
import type { BehaviorEntry } from '../types/behavior';
import type { MetadataField } from '../types/metadata';
import type { RootStackParamList } from '../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { behaviors, addBehavior, logBehavior, removeBehavior } = useBehaviorStore();
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('');
  const [newMetadata, setNewMetadata] = useState<MetadataField[]>([]);
  const [loggingBehavior, setLoggingBehavior] = useState<BehaviorEntry | null>(null);

  const handleAdd = useCallback(() => {
    const name = newName.trim();
    if (!name) return;
    const raw = newIcon.trim();
    const icon = raw
      ? raw.startsWith('http://') || raw.startsWith('https://')
        ? {
            uri: raw,
          }
        : raw
      : undefined;
    addBehavior(name, icon, newMetadata);
    setNewName('');
    setNewIcon('');
    setNewMetadata([]);
    setIsAdding(false);
  }, [
    newName,
    newIcon,
    newMetadata,
    addBehavior,
  ]);

  const handleRemove = useCallback(
    (behavior: BehaviorEntry) => {
      Alert.alert('Remove Behavior', `Remove "${behavior.name}"?`, [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeBehavior(behavior.id),
        },
      ]);
    },
    [
      removeBehavior,
    ],
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
            onPress={() =>
              navigation.navigate('BehaviorDetails', {
                behaviorId: item.id,
              })
            }
          />
        )}
        ListEmptyComponent={<Text style={styles.empty}>No behaviors yet.{`\n`}Add your first one.</Text>}
        contentContainerStyle={behaviors.length === 0 && styles.emptyContainer}
      />

      {isAdding ? (
        <AddBehaviorForm
          newIcon={newIcon}
          newName={newName}
          metadata={newMetadata}
          onChangeIcon={setNewIcon}
          onChangeName={setNewName}
          onChangeMetadata={setNewMetadata}
          onAdd={handleAdd}
          onCancel={() => setIsAdding(false)}
        />
      ) : (
        <Pressable
          style={({ pressed }) => [
            styles.fab,
            pressed && styles.fabPressed,
          ]}
          onPress={() => setIsAdding(true)}
        >
          <Text style={styles.fabText}>+ Add behavior</Text>
        </Pressable>
      )}

      <LogBehaviorModal
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
    fontSize: 34,
    fontWeight: 'bold',
    letterSpacing: -0.5,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
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
    backgroundColor: '#EFEFEF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  fabPressed: {
    backgroundColor: '#D8D8D8',
    transform: [
      {
        scale: 0.98,
      },
    ],
  },
  fabText: {
    color: '#111111',
    fontSize: 15,
    fontWeight: '600',
  },
});
