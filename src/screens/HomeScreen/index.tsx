import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { startTransition, useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Button } from '../../components/Button';
import { CategoryFilter } from '../../components/CategoryFilter';
import { SafeAreaView } from '../../components/SafeAreaView';
import { useBackGuard } from '../../hooks/useBackGuard';
import { useBehaviorStore } from '../../store/behaviorStore';
import { useSettingsStore } from '../../store/settingsStore';
import type { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../utils/colors';
import { BehaviorList } from './components/BehaviorList';
import { CategoryXpBar } from './components/CategoryXpBar';
import { HomeHeader } from './components/HomeHeader';
import { HomeSearchBar } from './components/HomeSearchBar';
import { TypeXpBar } from './components/TypeXpBar';

export function HomeScreen() {
  useBackGuard();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const behaviors = useBehaviorStore(s => s.behaviors);
  const categories = useBehaviorStore(s => s.categories);
  const tasks = useBehaviorStore(s => s.tasks);
  const hidePrivate = useSettingsStore(s => s.hidePrivate);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const handleSelectCategory = useCallback((id: string | null) => {
    startTransition(() => setSelectedCategoryId(id));
  }, []);

  // Reset selection if the selected category no longer exists
  useEffect(() => {
    if (selectedCategoryId !== null && !categories.some(c => c.id === selectedCategoryId)) {
      setSelectedCategoryId(null);
    }
  }, [categories, selectedCategoryId]);

  const filteredBehaviors = useMemo(() => {
    let result = behaviors;
    if (hidePrivate) result = result.filter(b => !b.private);
    if (selectedCategoryId !== null) result = result.filter(b => b.categoryId === selectedCategoryId);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(b => b.name.toLowerCase().includes(q));
    }
    return result;
  }, [behaviors, selectedCategoryId, hidePrivate, searchQuery]);

  const [showXp, setShowXp] = useState(true);

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}
    >
      <HomeHeader
        showXp={showXp}
        onToggleXp={() => setShowXp(v => !v)}
        isSearching={isSearching}
        onSearchPress={() => {
          if (isSearching) {
            setSearchQuery('');
            setIsSearching(false);
          } else {
            setIsSearching(true);
          }
        }}
      />

      {isSearching ? (
        <HomeSearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          onClose={() => {
            setSearchQuery('');
            setIsSearching(false);
          }}
        />
      ) : (
        showXp && <TypeXpBar selectedCategoryId={selectedCategoryId} />
      )}

      <CategoryFilter
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={handleSelectCategory}
      />

      {isSearching ? null : showXp && <CategoryXpBar selectedCategoryId={selectedCategoryId} />}

      <BehaviorList
        behaviors={filteredBehaviors}
        tasks={tasks}
        selectedCategoryId={selectedCategoryId}
        searchQuery={isSearching ? searchQuery : undefined}
      />

      <Button
        fab
        variant="primary"
        onPress={() => navigation.navigate('BehaviorForm', { defaultCategoryId: selectedCategoryId ?? undefined })}
        style={styles.addButton}
      >
        + Add behavior
      </Button>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  addButton: {
    bottom: 0,
  },
});
