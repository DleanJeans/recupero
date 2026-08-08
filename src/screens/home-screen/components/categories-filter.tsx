import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { ToggleNamesButton } from '../../../components/category-picker/toggle-names-button';
import { Text } from '../../../components/text';
import { useBehaviorStore } from '../../../store/behavior-store';
import { useSettingsStore } from '../../../store/settings-store';
import type { Category } from '../../../types/behavior';
import type { RootStackParamList } from '../../../types/navigation';
import { computeBehaviorCounts } from '../../../utils/behavior-counts';
import { Colors } from '../../../utils/colors';

const COLLAPSED_CATEGORY_LIMIT = 2;
const CATEGORY_GRID_ANIMATION_DURATION = 240;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Props {
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
}

export const CategoriesFilter = React.memo(function CategoriesFilter({ selectedCategoryId, onSelectCategory }: Props) {
  const navigation = useNavigation<NavigationProp>();
  const categories = useBehaviorStore(s => s.categories);
  const behaviors = useBehaviorStore(s => s.behaviors);
  const hideNames = useSettingsStore(s => s.hideCategoryNames);
  const [expanded, setExpanded] = useState(false);
  const [renderExpanded, setRenderExpanded] = useState(false);
  const [gridWidth, setGridWidth] = useState(0);
  const [chipWidths, setChipWidths] = useState<Record<string, number>>({});
  const gridHeight = useSharedValue(0);
  const gridAnimationTarget = useSharedValue(0);
  const collapsedGridHeight = useSharedValue(0);
  const expandedGridHeight = useSharedValue(0);
  const expandedRef = useRef(false);
  const transitionIdRef = useRef(0);
  const animatedGridStyle = useAnimatedStyle(() => ({
    height: gridHeight.value || undefined,
  }));

  useEffect(() => {
    setChipWidths({});
  }, [hideNames]);

  const handleChipLayout = (key: string, event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setChipWidths(current => (current[key] === width ? current : { ...current, [key]: width }));
  };

  const { behaviorCounts, allCount } = useMemo(() => computeBehaviorCounts(behaviors), [behaviors]);
  const visibleCategories = useMemo(() => {
    if (renderExpanded || categories.length <= COLLAPSED_CATEGORY_LIMIT) return categories;

    const visible = categories.slice(0, COLLAPSED_CATEGORY_LIMIT);
    const selected = categories.find(category => category.id === selectedCategoryId);
    if (selected && !visible.some(category => category.id === selected.id)) {
      visible.splice(COLLAPSED_CATEGORY_LIMIT - 1, 1, selected);
    }
    return visible;
  }, [categories, renderExpanded, selectedCategoryId]);

  const iconOnlyCategories = useMemo(() => {
    if (!hideNames || renderExpanded || gridWidth <= 0 || chipWidths.all == null) return categories;
    if (categories.some(category => chipWidths[category.id] == null)) return categories;

    const gap = 9;
    const visible: Category[] = [];
    let usedWidth = chipWidths.all;

    for (const category of categories) {
      const width = chipWidths[category.id];
      if (width == null || usedWidth + gap + width > gridWidth) break;
      visible.push(category);
      usedWidth += gap + width;
    }

    const selected = categories.find(category => category.id === selectedCategoryId);
    if (selected && !visible.some(category => category.id === selected.id) && visible.length > 0) {
      visible.splice(visible.length - 1, 1, selected);
    }

    return visible;
  }, [categories, chipWidths, gridWidth, hideNames, renderExpanded, selectedCategoryId]);

  const handleCategoryLongPress = (category: Category) => {
    navigation.navigate('CategoryForm', { categoryId: category.id });
  };

  const canExpand = categories.length > COLLAPSED_CATEGORY_LIMIT;

  const finishCollapse = (transitionId: number) => {
    if (transitionIdRef.current === transitionId && !expandedRef.current) {
      setRenderExpanded(false);
    }
  };

  const handleToggleExpanded = () => {
    const nextExpanded = !expandedRef.current;
    expandedRef.current = nextExpanded;
    const transitionId = transitionIdRef.current + 1;
    transitionIdRef.current = transitionId;
    setExpanded(nextExpanded);

    if (nextExpanded) {
      setRenderExpanded(true);
      const targetHeight = expandedGridHeight.value;
      if (targetHeight > 0) {
        gridAnimationTarget.value = targetHeight;
        gridHeight.value = withTiming(targetHeight, { duration: CATEGORY_GRID_ANIMATION_DURATION });
      }
      return;
    }

    const targetHeight = collapsedGridHeight.value;
    if (targetHeight <= 0) {
      setRenderExpanded(false);
      return;
    }

    gridAnimationTarget.value = targetHeight;
    gridHeight.value = withTiming(targetHeight, { duration: CATEGORY_GRID_ANIMATION_DURATION }, finished => {
      if (finished) runOnJS(finishCollapse)(transitionId);
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <ToggleNamesButton />
          <Text style={styles.label}>Categories</Text>
        </View>
        {canExpand && (
          <CategoryExpandButton
            expanded={expanded}
            onPress={handleToggleExpanded}
          />
        )}
      </View>

      <Animated.View style={[styles.gridViewport, animatedGridStyle]}>
        <View
          onLayout={(event: LayoutChangeEvent) => {
            const { height, width } = event.nativeEvent.layout;
            setGridWidth(width);

            const measuredHeight = renderExpanded ? expandedGridHeight : collapsedGridHeight;
            measuredHeight.value = height;
            if (gridHeight.value === 0) {
              gridHeight.value = height;
              gridAnimationTarget.value = height;
            } else if (gridAnimationTarget.value !== height) {
              gridAnimationTarget.value = height;
              gridHeight.value = withTiming(height, { duration: CATEGORY_GRID_ANIMATION_DURATION });
            }
          }}
          style={[styles.grid, hideNames && !renderExpanded && styles.gridIconOnly]}
        >
          <CategoryChip
            label="All"
            count={allCount}
            active={selectedCategoryId === null}
            iconOnly={hideNames}
            onLayout={event => handleChipLayout('all', event)}
            onPress={() => onSelectCategory(null)}
          />
          {(hideNames && !renderExpanded ? iconOnlyCategories : visibleCategories).map(category => (
            <CategoryChip
              key={category.id}
              icon={category.emoji}
              label={category.name}
              count={behaviorCounts[category.id] ?? 0}
              active={selectedCategoryId === category.id}
              iconOnly={hideNames}
              onLayout={event => handleChipLayout(category.id, event)}
              onPress={() => onSelectCategory(category.id)}
              onLongPress={() => handleCategoryLongPress(category)}
            />
          ))}
        </View>
      </Animated.View>
    </View>
  );
});

interface CategoryExpandButtonProps {
  expanded: boolean;
  onPress: () => void;
}

function CategoryExpandButton({ expanded, onPress }: CategoryExpandButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      onPress={onPress}
      style={styles.toggleButton}
    >
      <Text style={styles.toggleLabel}>{expanded ? 'Show less ▲' : 'Show more ▼'}</Text>
    </Pressable>
  );
}

interface CategoryChipProps {
  icon?: string;
  iconOnly?: boolean;
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  onLayout?: (event: LayoutChangeEvent) => void;
}

function CategoryChip({
  icon,
  iconOnly = false,
  label,
  count,
  active,
  onPress,
  onLongPress,
  onLayout,
}: CategoryChipProps) {
  return (
    <Pressable
      accessibilityLabel={`${label}, ${count} behaviors`}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onLongPress={onLongPress}
      onLayout={onLayout}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.chipPressed]}
    >
      {(icon || iconOnly) && (
        <Text
          style={
            icon
              ? [styles.icon, !active && styles.iconInactive]
              : [styles.chipLabel, active ? styles.chipLabelActive : styles.chipLabelInactive]
          }
        >
          {icon ?? label}
        </Text>
      )}
      {!iconOnly && (
        <Text style={[styles.chipLabel, active ? styles.chipLabelActive : styles.chipLabelInactive]}>{label}</Text>
      )}
      <Text style={[styles.count, active ? styles.countActive : styles.countInactive]}>{count}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  gridViewport: {
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    paddingBottom: 2,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    color: Colors.text.faint,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.7,
    textTransform: 'uppercase',
  },
  toggleButton: {
    justifyContent: 'center',
    minHeight: 40,
    paddingLeft: 12,
  },
  toggleLabel: {
    color: Colors.type.desirable,
    fontSize: 13,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flexShrink: 0,
    gap: 9,
  },
  gridIconOnly: {
    flexWrap: 'nowrap',
    overflow: 'hidden',
  },
  chip: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: Colors.bg.card,
    borderColor: Colors.border.default,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: 'rgba(74, 222, 128, 0.12)',
    borderColor: 'rgba(74, 222, 128, 0.4)',
  },
  chipPressed: {
    opacity: 0.7,
  },
  icon: {
    fontSize: 14,
  },
  iconInactive: {
    opacity: 0.85,
  },
  chipLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  chipLabelActive: {
    color: Colors.type.desirable,
  },
  chipLabelInactive: {
    color: Colors.text.muted,
  },
  count: {
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  countActive: {
    color: Colors.type.desirable,
  },
  countInactive: {
    color: Colors.text.dim,
  },
});
