import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AddBehaviorButton } from '../components/AddBehaviorButton';
import { BehaviorCard } from '../components/BehaviorCard';
import { BehaviorForm } from '../components/BehaviorForm';
import { Text } from '../components/Text';
import { useBehaviorStore } from '../store/behaviorStore';
import type { BehaviorEntry } from '../types/behavior';
import { sortBehaviorsByRecent } from '../utils/behaviorUtils';

export function HomeScreen() {
  const { behaviors } = useBehaviorStore();
  const [showAddButton, setShowAddButton] = useState(true);

  return (
    <SafeAreaView style={styles.container}>
      <Title />

      <BehaviorList behaviors={behaviors} />

      {showAddButton ? (
        <AddBehaviorButton onPress={() => setShowAddButton(false)} />
      ) : (
        <BehaviorForm onClose={() => setShowAddButton(true)} />
      )}
    </SafeAreaView>
  );
}

function Title() {
  return <Text style={styles.title}>Recupero</Text>;
}

interface BehaviorListProps {
  behaviors: BehaviorEntry[];
}
function BehaviorList({ behaviors }: BehaviorListProps) {
  const sortedBehaviors = useMemo(() => sortBehaviorsByRecent(behaviors), [behaviors]);

  return (
    <FlatList
      data={sortedBehaviors}
      keyExtractor={item => item.id}
      renderItem={({ item }) => <BehaviorCard behavior={item} />}
      ListEmptyComponent={<Text style={styles.empty}>No behaviors yet.{`\n`}Add your first one.</Text>}
      contentContainerStyle={behaviors.length === 0 && styles.emptyContainer}
    />
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
});
