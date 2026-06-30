import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBehaviorStore } from '../store/behaviorStore';
import { useSettingsStore } from '../store/settingsStore';
import type { RootStackParamList } from '../types/navigation';
import { Colors } from '../utils/colors';
import { toDateString } from '../utils/dateUtils';
import { getUncompletedTaskCountForDate } from '../utils/taskUtils';
import { Badge } from './Badge';
import { Text } from './Text';

const ITEMS: Array<{
  route: keyof Pick<RootStackParamList, 'Home' | 'Timer' | 'Day' | 'Tasks'>;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  activeIcon: React.ComponentProps<typeof Ionicons>['name'];
}> = [
  { route: 'Home', label: 'Home', icon: 'home-outline', activeIcon: 'home' },
  { route: 'Timer', label: 'Timer', icon: 'timer-outline', activeIcon: 'timer' },
  { route: 'Day', label: 'Day', icon: 'calendar-outline', activeIcon: 'calendar' },
  { route: 'Tasks', label: 'Tasks', icon: 'checkmark-circle-outline', activeIcon: 'checkmark-circle' },
];
export type BottomNavRoute = (typeof ITEMS)[number]['route'];

const BAR_PADDING = 4;
const WRAP_BOTTOM_PADDING = 10;
const HIGHLIGHT_DURATION_MS = 400;

interface BottomNavProps {
  activeRoute: BottomNavRoute;
  onNavigate: (route: BottomNavRoute) => void;
}

export function BottomNav({ activeRoute, onNavigate }: BottomNavProps) {
  const insets = useSafeAreaInsets();
  const dayCutoffHour = useSettingsStore(s => s.dayCutoffHour);
  const tasks = useBehaviorStore(s => s.tasks);
  const [barWidth, setBarWidth] = useState(0);
  const todayStr = toDateString(new Date(), dayCutoffHour);
  const uncompletedTaskCount = getUncompletedTaskCountForDate(tasks, todayStr, dayCutoffHour);
  const activeIndex = Math.max(
    0,
    ITEMS.findIndex(item => item.route === activeRoute),
  );
  const itemWidth = barWidth > 0 ? (barWidth - BAR_PADDING * 2) / ITEMS.length : 0;
  const highlightX = useSharedValue(0);
  const highlightPositioned = useRef(false);

  useEffect(() => {
    if (itemWidth <= 0) return;
    const nextX = activeIndex * itemWidth;
    if (!highlightPositioned.current) {
      highlightX.value = nextX;
      highlightPositioned.current = true;
      return;
    }
    highlightX.value = withTiming(nextX, { duration: HIGHLIGHT_DURATION_MS });
  }, [activeIndex, highlightX, itemWidth]);

  const highlightStyle = useAnimatedStyle(() => ({
    width: itemWidth,
    transform: [{ translateX: highlightX.value }],
  }));

  const startHighlightAnimation = (index: number) => {
    if (itemWidth <= 0) return;
    highlightPositioned.current = true;
    highlightX.value = withTiming(index * itemWidth, { duration: HIGHLIGHT_DURATION_MS });
  };

  return (
    <View style={[styles.wrap, { paddingBottom: insets.bottom + WRAP_BOTTOM_PADDING }]}>
      <View
        style={styles.bar}
        onLayout={event => setBarWidth(event.nativeEvent.layout.width)}
      >
        {itemWidth > 0 && <Animated.View style={[styles.highlight, highlightStyle]} />}
        {ITEMS.map((item, index) => {
          const active = activeRoute === item.route;
          const showTaskBadge = item.route === 'Tasks' && uncompletedTaskCount > 0;
          return (
            <Pressable
              key={item.route}
              style={({ pressed }) => [styles.item, pressed && styles.pressed]}
              onPress={() => {
                if (!active) {
                  startHighlightAnimation(index);
                  onNavigate(item.route);
                }
              }}
              accessibilityRole="button"
              accessibilityLabel={
                showTaskBadge ? `${item.label}, ${uncompletedTaskCount} uncompleted tasks` : item.label
              }
            >
              <View style={styles.iconWrap}>
                <Ionicons
                  name={active ? item.activeIcon : item.icon}
                  size={22}
                  color={active ? Colors.text.primary : Colors.text.faint}
                />
                {showTaskBadge && (
                  <Badge
                    count={uncompletedTaskCount}
                    style={styles.badge}
                  />
                )}
              </View>
              <Text style={[styles.label, active && styles.labelActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    paddingTop: 8,
    backgroundColor: Colors.bg.primary,
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: Colors.bg.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border.default,
    padding: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  highlight: {
    position: 'absolute',
    top: BAR_PADDING,
    bottom: BAR_PADDING,
    left: BAR_PADDING,
    borderRadius: 10,
    backgroundColor: Colors.bg.input,
  },
  item: {
    flex: 1,
    minHeight: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    zIndex: 1,
  },
  pressed: {
    opacity: 0.72,
  },
  iconWrap: {
    position: 'relative',
    width: 28,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -7,
  },
  label: {
    color: Colors.text.faint,
    fontSize: 11,
    fontWeight: '600',
  },
  labelActive: {
    color: Colors.text.primary,
  },
});
