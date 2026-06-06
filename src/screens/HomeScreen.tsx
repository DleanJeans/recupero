import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AddBehaviorButton } from '../components/AddBehaviorButton';
import { BehaviorCard } from '../components/BehaviorCard';
import { BehaviorForm } from '../components/BehaviorForm';
import { Text } from '../components/Text';
import { useBehaviorStore } from '../store/behaviorStore';
import { sortBehaviorsByRecent } from '../utils/behaviorUtils';

export function HomeScreen() {
  const { behaviors } = useBehaviorStore();
  const [isAdding, setIsAdding] = useState(false);

  const sortedBehaviors = useMemo(() => sortBehaviorsByRecent(behaviors), [behaviors]);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Recupero</Text>

      <FlatList
        data={sortedBehaviors}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <BehaviorCard behavior={item} />}
        ListEmptyComponent={<Text style={styles.empty}>No behaviors yet.{`\n`}Add your first one.</Text>}
        contentContainerStyle={behaviors.length === 0 && styles.emptyContainer}
      />

      {isAdding ? (
        <BehaviorForm onClose={() => setIsAdding(false)} />
      ) : (
        <AddBehaviorButton onPress={() => setIsAdding(true)} />
      )}
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
});
