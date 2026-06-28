import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { startTransition, useCallback, useEffect, useMemo, useState } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';
import { Button } from '../../components/Button';
import { CategoryFilter } from '../../components/CategoryFilter';
import { SafeAreaView } from '../../components/SafeAreaView';
import { Text } from '../../components/Text';
import { useBackGuard } from '../../hooks/useBackGuard';
import { useBehaviorStore } from '../../store/behaviorStore';
import { useSettingsStore } from '../../store/settingsStore';
import type { BehaviorEntry } from '../../types/behavior';
import type { RootStackParamList } from '../../types/navigation';
import type { TaskEntry } from '../../types/task';
import { groupBehaviorsByRecency } from '../../utils/behaviorUtils';
import { Colors } from '../../utils/colors';
import { toDateString, yesterday } from '../../utils/dateUtils';
import { getTotalStarsForDate } from '../../utils/starUtils';
import { Label } from '../../utils/strings';
import { getTaskStarsForDate } from '../../utils/taskUtils';
import { BehaviorCard } from './components/BehaviorCard';
import { CategoryXpBar } from './components/CategoryXpBar';
import { HomeSearchBar } from './components/HomeSearchBar';
import { StatsIcon } from './components/StatsIcon';
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

interface BehaviorListProps {
  behaviors: BehaviorEntry[];
  tasks: TaskEntry[];
  selectedCategoryId: string | null;
  searchQuery?: string;
}
const BehaviorList = React.memo(function BehaviorList({
  behaviors,
  tasks,
  selectedCategoryId,
  searchQuery,
}: BehaviorListProps) {
  const sections = useMemo(() => groupBehaviorsByRecency(behaviors), [behaviors]);
  const todayStr = useMemo(() => toDateString(new Date()), []);
  const yesterdayStr = useMemo(() => toDateString(yesterday()), []);
  const dateForSection = useCallback(
    (title: string): string | undefined => {
      if (title === Label.TODAY) return todayStr;
      if (title === Label.YESTERDAY) return yesterdayStr;
      return undefined;
    },
    [todayStr, yesterdayStr],
  );
  const emptyMessage = (() => {
    if (searchQuery) return `No behaviors matching "${searchQuery}".`;
    if (selectedCategoryId !== null) return 'No behaviors in this category.\nTap + to add one.';
    return 'No behaviors yet.\nAdd your first one.';
  })();
  const listEmptyComponent = useMemo(() => <Text style={styles.empty}>{emptyMessage}</Text>, [emptyMessage]);
  const contentContainerStyle = useMemo(
    () => [styles.listContent, behaviors.length === 0 && styles.emptyContainer],
    [behaviors.length],
  );
  const renderItem = useCallback(
    ({ item, section }: { item: BehaviorEntry; section: { title: string } }) => (
      <BehaviorCard
        behavior={item}
        showCategory={selectedCategoryId === null}
        dateStr={dateForSection(section.title)}
      />
    ),
    [dateForSection, selectedCategoryId],
  );
  const renderSectionHeader = useCallback(
    ({ section }: { section: { title: string } }) => (
      <SectionHeader
        title={section.title}
        behaviors={behaviors}
        tasks={tasks}
      />
    ),
    [behaviors, tasks],
  );

  return (
    <SectionList
      sections={sections}
      keyExtractor={item => item.id}
      renderItem={renderItem}
      renderSectionHeader={renderSectionHeader}
      ListEmptyComponent={listEmptyComponent}
      contentContainerStyle={contentContainerStyle}
      contentInsetAdjustmentBehavior="automatic"
    />
  );
});

interface SectionHeaderProps {
  title: string;
  behaviors: BehaviorEntry[];
  tasks: TaskEntry[];
}
const SectionHeader = React.memo(function SectionHeader({ title, behaviors, tasks }: SectionHeaderProps) {
  const today = useMemo(() => toDateString(new Date()), []);
  const yesterdayStr = useMemo(() => toDateString(yesterday()), []);
  const sectionDate = (() => {
    if (title === Label.TODAY) return today;
    if (title === Label.YESTERDAY) return yesterdayStr;
    return null;
  })();

  const sectionStars = useMemo(() => {
    if (!sectionDate) return null;
    const hasOptedIn = behaviors.some(b => b.starThresholds);
    const taskStars = getTaskStarsForDate(tasks, sectionDate);
    if (!hasOptedIn && taskStars === 0) return null;
    return getTotalStarsForDate(behaviors, sectionDate) + taskStars;
  }, [behaviors, tasks, sectionDate]);

  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLeft}>
        <Text style={styles.sectionHeaderText}>{title}</Text>
        {sectionStars !== null && (
          <View
            style={styles.sectionStarBadge}
            accessibilityLabel={`${sectionStars} stars on ${title.toLowerCase()}`}
          >
            <Ionicons
              name="star"
              size={12}
              color={Colors.star.filled}
            />
            <Text style={styles.sectionStarBadgeText}>{sectionStars}</Text>
          </View>
        )}
      </View>
    </View>
  );
});

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
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: 140,
  },
  addButton: {
    bottom: 0,
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
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionHeaderText: {
    color: Colors.text.faint,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionStarBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.bg.input,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  sectionStarBadgeText: {
    color: Colors.text.primary,
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  sectionTotals: {
    flexDirection: 'column',
    gap: 4,
  },
  sectionTotalValue: {
    color: Colors.text.faint,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
