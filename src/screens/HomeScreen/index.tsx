import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { CategoryFilter } from '../../components/CategoryFilter';
import { Text } from '../../components/Text';
import { useBackGuard } from '../../hooks/useBackGuard';
import { useBehaviorStore } from '../../store/behaviorStore';
import { useSettingsStore } from '../../store/settingsStore';
import type { BehaviorEntry } from '../../types/behavior';
import type { RootStackParamList } from '../../types/navigation';
import { getDailyMetadataTotals, groupBehaviorsByRecency } from '../../utils/behaviorUtils';
import { Colors } from '../../utils/colors';
import { toDateString } from '../../utils/dateUtils';
import { Label } from '../../utils/strings';
import { AddBehaviorButton } from './components/AddBehaviorButton';
import { BehaviorCard } from './components/BehaviorCard';
import { CategoryXpBar } from './components/CategoryXpBar';
import { StatsIcon } from './components/StatsIcon';
import { TypeXpBar } from './components/TypeXpBar';

export function HomeScreen() {
  useBackGuard();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { behaviors, categories } = useBehaviorStore();
  const hidePrivate = useSettingsStore(s => s.hidePrivate);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
    <SafeAreaView style={styles.container}>
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
        onSelectCategory={setSelectedCategoryId}
      />

      {isSearching ? null : showXp && <CategoryXpBar selectedCategoryId={selectedCategoryId} />}

      <BehaviorList
        behaviors={filteredBehaviors}
        selectedCategoryId={selectedCategoryId}
        searchQuery={isSearching ? searchQuery : undefined}
      />

      <AddBehaviorButton
        onPress={() => navigation.navigate('BehaviorForm', { defaultCategoryId: selectedCategoryId ?? undefined })}
      />
    </SafeAreaView>
  );
}

interface HomeHeaderProps {
  showXp: boolean;
  onToggleXp: () => void;
  isSearching: boolean;
  onSearchPress: () => void;
}
function HomeHeader({ showXp, onToggleXp, isSearching, onSearchPress }: HomeHeaderProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.titleRow}>
      <Text style={styles.title}>Recupero</Text>
      <View style={styles.titleActions}>
        <HeaderIcon
          icon={
            <StatsIcon
              size={22}
              active={showXp}
            />
          }
          onPress={onToggleXp}
          accessibilityLabel={showXp ? 'Hide XP' : 'Show XP'}
        />
        <HeaderIcon
          name="analytics-outline"
          onPress={() => navigation.navigate('Day')}
          accessibilityLabel="Day view"
        />
        <HeaderIcon
          name={isSearching ? 'search' : 'search-outline'}
          onPress={onSearchPress}
          accessibilityLabel={isSearching ? 'Close search' : 'Search'}
        />
        <HeaderIcon
          name="settings-outline"
          onPress={() => navigation.navigate('Settings')}
          accessibilityLabel="Settings"
        />
      </View>
    </View>
  );
}

interface HeaderIconProps {
  icon?: React.ReactNode;
  name?: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  accessibilityLabel: string;
}
function HeaderIcon({ icon, name, onPress, accessibilityLabel }: HeaderIconProps) {
  return (
    <Button
      variant="icon"
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
    >
      {icon ??
        (name ? (
          <Ionicons
            name={name}
            size={22}
            color={Colors.text.muted}
          />
        ) : null)}
    </Button>
  );
}

import { HomeSearchBar } from './components/HomeSearchBar';

interface BehaviorListProps {
  behaviors: BehaviorEntry[];
  selectedCategoryId: string | null;
  searchQuery?: string;
}
function BehaviorList({ behaviors, selectedCategoryId, searchQuery }: BehaviorListProps) {
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
        <SectionHeader
          title={section.title}
          behaviors={behaviors}
          selectedCategoryId={selectedCategoryId}
        />
      )}
      ListEmptyComponent={
        <Text style={styles.empty}>
          {searchQuery
            ? `No behaviors matching "${searchQuery}".`
            : selectedCategoryId !== null
              ? 'No behaviors in this category.\nTap + to add one.'
              : 'No behaviors yet.\nAdd your first one.'}
        </Text>
      }
      contentContainerStyle={behaviors.length === 0 && styles.emptyContainer}
    />
  );
}

interface SectionHeaderProps {
  title: string;
  behaviors: BehaviorEntry[];
  selectedCategoryId: string | null;
}
function SectionHeader({ title, behaviors, selectedCategoryId }: SectionHeaderProps) {
  const { categories } = useBehaviorStore();
  const today = toDateString(new Date());
  const metaCategory =
    title === Label.TODAY && selectedCategoryId !== null
      ? categories.find(c => c.id === selectedCategoryId && c.metadataFields?.length)
      : undefined;
  const totals = metaCategory ? getDailyMetadataTotals(behaviors, metaCategory, today) : null;

  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
      {totals && metaCategory && (
        <View style={styles.sectionTotals}>
          {metaCategory.metadataFields?.map(field => {
            const val = totals![field.key];
            if (val == null) return null;
            return (
              <Text
                key={field.key}
                style={styles.sectionTotalValue}
              >
                {field.label} {val}
                {field.unit ?? ''}
              </Text>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
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
    color: Colors.text.primary,
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
    color: Colors.text.faint,
    textAlign: 'center',
    fontSize: 15,
    padding: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 4,
    marginHorizontal: 16,
  },
  sectionHeaderText: {
    color: Colors.text.faint,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionTotals: {
    flexDirection: 'row',
    gap: 8,
  },
  sectionTotalValue: {
    color: Colors.text.faint,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
