import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AddBehaviorButton } from '../components/AddBehaviorButton';
import { BehaviorCard } from '../components/BehaviorCard';
import { BehaviorForm } from '../components/BehaviorForm';
import { Button } from '../components/Button';
import { CategoryFilter } from '../components/CategoryFilter';
import { Text } from '../components/Text';
import { useBackGuard } from '../hooks/useBackGuard';
import { useBehaviorStore } from '../store/behaviorStore';
import { useSettingsStore } from '../store/settingsStore';
import type { BehaviorEntry } from '../types/behavior';
import type { RootStackParamList } from '../types/navigation';
import { groupBehaviorsByRecency } from '../utils/behaviorUtils';
import { Colors } from '../utils/colors';

export function HomeScreen() {
  useBackGuard();
  const { behaviors, categories } = useBehaviorStore();
  const hidePrivate = useSettingsStore((s) => s.hidePrivate);
  const [showAddButton, setShowAddButton] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // Reset selection if the selected category no longer exists
  useEffect(() => {
    if (selectedCategoryId !== null && !categories.some(c => c.id === selectedCategoryId)) {
      setSelectedCategoryId(null);
    }
  }, [categories, selectedCategoryId]);

  const filteredBehaviors = useMemo(() => {
    let result = behaviors;
    if (hidePrivate) result = result.filter((b) => !b.private);
    if (selectedCategoryId !== null) result = result.filter((b) => b.categoryId === selectedCategoryId);
    return result;
  }, [behaviors, selectedCategoryId, hidePrivate]);

  return (
    <SafeAreaView style={styles.container}>
      <Title />

      <CategoryFilter
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={setSelectedCategoryId}
      />

      <BehaviorList
        behaviors={filteredBehaviors}
        selectedCategoryId={selectedCategoryId}
      />

      {showAddButton ? (
        <AddBehaviorButton onPress={() => setShowAddButton(false)} />
      ) : (
        <BehaviorForm
          defaultCategoryId={selectedCategoryId ?? undefined}
          onClose={() => setShowAddButton(true)}
        />
      )}
    </SafeAreaView>
  );
}

function Title() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.titleRow}>
      <Text style={styles.title}>Recupero</Text>
      <View style={styles.titleActions}>
        <Button
          variant="icon"
          onPress={() => navigation.navigate('Timeline')}
        >
          <Ionicons
            name="analytics-outline"
            size={22}
            color="#888"
          />
        </Button>
        <Button
          variant="icon"
          onPress={() => navigation.navigate('Settings')}
        >
          <Ionicons
            name="settings-outline"
            size={22}
            color="#888"
          />
        </Button>
      </View>
    </View>
  );
}

interface BehaviorListProps {
  behaviors: BehaviorEntry[];
  selectedCategoryId: string | null;
}
function BehaviorList({ behaviors, selectedCategoryId }: BehaviorListProps) {
  const sections = useMemo(() => groupBehaviorsByRecency(behaviors), [behaviors]);

  return (
    <SectionList
      key={selectedCategoryId ?? 'all'}
      sections={sections}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <BehaviorCard
          behavior={item}
          showCategory={selectedCategoryId === null}
        />
      )}
      renderSectionHeader={({ section }) => (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>{section.title}</Text>
        </View>
      )}
      ListEmptyComponent={
        <Text style={styles.empty}>
          {selectedCategoryId !== null
            ? 'No behaviors in this category.\nTap + to add one.'
            : 'No behaviors yet.\nAdd your first one.'}
        </Text>
      }
      contentContainerStyle={behaviors.length === 0 && styles.emptyContainer}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 34,
    fontWeight: 'bold',
    letterSpacing: -0.5,
  },
  titleActions: {
    flexDirection: 'row',
    gap: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  empty: {
    color: Colors.textFaint,
    textAlign: 'center',
    fontSize: 15,
    padding: 32,
  },
  sectionHeader: {
    marginTop: 12,
    marginBottom: 4,
    marginHorizontal: 16,
  },
  sectionHeaderText: {
    color: Colors.textFaint,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
