import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { BehaviorActionSheet } from '../../components/behavior-action-sheet';
import { Button } from '../../components/button';
import { SafeAreaView } from '../../components/safe-area-view';
import { Text } from '../../components/text';
import { useAfterInteractionsFlag } from '../../hooks/use-after-interactions-flag';
import { useBackGuard } from '../../hooks/use-back-guard';
import { useDeferredCategorySelection } from '../../hooks/use-deferred-category-selection';
import { useBehaviorStore } from '../../store/behavior-store';
import { useChecklistSelectionStore } from '../../store/checklist-selection-store';
import { useScreenUiStore } from '../../store/screen-ui-store';
import { useSettingsStore } from '../../store/settings-store';
import type { RootStackParamList } from '../../types/navigation';
import { getActiveBehaviors, getArchivedBehaviors, isArchivedCategoryFilterId } from '../../utils/archive-utils';
import { collapseBehaviorGroups, matchesBehaviorOrGroupName } from '../../utils/behavior-group-utils';
import { Colors } from '../../utils/colors';
import { getCooldownBehaviors, isCooldownCategoryFilterId } from '../../utils/cooldown-filter';
import { BehaviorList } from './components/behavior-list';
import { BehaviorTypeXPPanel } from './components/behavior-type-xp-panel';
import { CategoriesFilter } from './components/categories-filter';
import { CategoryXPBar } from './components/category-xp-bar';
import { ChecklistSelectionBar } from './components/checklist-selection-bar';
import { ChecklistStrip } from './components/checklist-strip';
import { HomeHeader } from './components/home-header';
import { HomeSearchBar } from './components/home-search-bar';

export function HomeScreen() {
  useBackGuard();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const behaviors = useBehaviorStore(s => s.behaviors);
  const categories = useBehaviorStore(s => s.categories);
  const tasks = useBehaviorStore(s => s.tasks);
  const groupEmojis = useBehaviorStore(s => s.groupEmojis);
  const hidePrivate = useSettingsStore(s => s.hidePrivate);
  const showXp = useSettingsStore(s => s.showXp);
  const setShowXp = useSettingsStore(s => s.setShowXp);
  const homeSelectedCategoryId = useScreenUiStore(s => s.homeSelectedCategoryId);
  const setHomeSelectedCategoryId = useScreenUiStore(s => s.setHomeSelectedCategoryId);
  const selecting = useChecklistSelectionStore(s => s.active);
  const {
    selectedCategoryId,
    listCategoryId,
    renderedSummaryCategoryId,
    categoryListPending,
    selectCategory,
    resetCategorySelection,
  } = useDeferredCategorySelection(homeSelectedCategoryId);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [cooldownSortTick, setCooldownSortTick] = useState(0);
  const cooldownSelected = isCooldownCategoryFilterId(selectedCategoryId);
  const listCooldownSelected = isCooldownCategoryFilterId(listCategoryId);
  const archivedSelected = isArchivedCategoryFilterId(selectedCategoryId);
  const listArchivedSelected = isArchivedCategoryFilterId(listCategoryId);
  const handleSelectCategory = useCallback(
    (id: string | null) => {
      selectCategory(id);
      setHomeSelectedCategoryId(id);
    },
    [selectCategory, setHomeSelectedCategoryId],
  );

  // Reset selection if the selected category no longer exists
  useEffect(() => {
    if (
      selectedCategoryId !== null &&
      !cooldownSelected &&
      !archivedSelected &&
      !categories.some(c => c.id === selectedCategoryId)
    ) {
      setHomeSelectedCategoryId(null);
      resetCategorySelection();
    }
  }, [
    archivedSelected,
    categories,
    cooldownSelected,
    resetCategorySelection,
    selectedCategoryId,
    setHomeSelectedCategoryId,
  ]);

  useEffect(() => {
    if (!cooldownSelected) return;
    const interval = setInterval(() => setCooldownSortTick(t => t + 1), 60_000);
    return () => clearInterval(interval);
  }, [cooldownSelected]);

  const filteredBehaviors = useMemo(() => {
    let result = listArchivedSelected ? getArchivedBehaviors(behaviors) : getActiveBehaviors(behaviors);
    if (hidePrivate) result = result.filter(b => !b.private);
    if (listArchivedSelected) {
      // Already narrowed to archived behaviours above.
    } else if (listCooldownSelected) {
      result = getCooldownBehaviors(result);
    } else if (listCategoryId !== null) {
      result = result.filter(b => b.categoryId === listCategoryId);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(b => matchesBehaviorOrGroupName(b, q));
    }
    return result;
  }, [
    behaviors,
    listArchivedSelected,
    listCooldownSelected,
    cooldownSortTick,
    listCategoryId,
    hidePrivate,
    searchQuery,
  ]);

  /** Grouped behaviours (e.g. Omachi flavours) show as one card named after the group. Archived stays per behaviour. */
  const listedBehaviors = useMemo(
    () => (listArchivedSelected ? filteredBehaviors : collapseBehaviorGroups(filteredBehaviors, groupEmojis)),
    [filteredBehaviors, groupEmojis, listArchivedSelected],
  );

  const addBehaviorDefaultCategoryId =
    cooldownSelected || archivedSelected ? undefined : (selectedCategoryId ?? undefined);
  const motionEnabled = useAfterInteractionsFlag([behaviors, isSearching, searchQuery, showXp]);

  return (
    <SafeAreaView
      style={styles.container}
      edges={['top', 'left', 'right']}
    >
      {selecting ? (
        <ChecklistSelectionBar />
      ) : (
        <HomeHeader
          showXp={showXp}
          onToggleXp={() => setShowXp(!showXp)}
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
      )}

      {!selecting && !isSearching && !archivedSelected && <ChecklistStrip />}

      {selecting ? null : isSearching ? (
        <HomeSearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          onClose={() => {
            setSearchQuery('');
            setIsSearching(false);
          }}
        />
      ) : (
        showXp &&
        !archivedSelected && (
          <BehaviorTypeXPPanel
            selectedCategoryId={renderedSummaryCategoryId}
            motionEnabled={motionEnabled}
          />
        )
      )}

      <CategoriesFilter
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={handleSelectCategory}
      />

      {isSearching || selecting
        ? null
        : showXp &&
          !archivedSelected && (
            <CategoryXPBar
              selectedCategoryId={renderedSummaryCategoryId}
              motionEnabled={motionEnabled}
            />
          )}

      {categoryListPending ? (
        <View style={styles.listLoading}>
          <ActivityIndicator
            color={Colors.text.faint}
            size="small"
          />
          <Text style={styles.listLoadingText}>Loading</Text>
        </View>
      ) : (
        <BehaviorList
          behaviors={listedBehaviors}
          starBehaviors={filteredBehaviors}
          tasks={tasks}
          selectedCategoryId={listCategoryId}
          searchQuery={isSearching ? searchQuery : undefined}
          motionEnabled={motionEnabled}
        />
      )}

      <BehaviorActionSheet showSelect />

      {!selecting && (
        <Button
          fab
          variant="primary"
          onPress={() => navigation.navigate('BehaviorForm', { defaultCategoryId: addBehaviorDefaultCategoryId })}
          style={styles.addButton}
        >
          + Add behavior
        </Button>
      )}
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
  listLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingBottom: 100,
  },
  listLoadingText: {
    color: Colors.text.faint,
    fontSize: 13,
    fontWeight: '600',
  },
});
