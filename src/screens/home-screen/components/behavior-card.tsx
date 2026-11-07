import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useRef } from 'react';
import { type GestureResponderEvent, type LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { BehaviorSummary } from '../../../components/behavior-summary';
import { Text } from '../../../components/text';
import { useBehaviorActionSheetStore } from '../../../store/behavior-action-sheet-store';
import { useBehaviorStore } from '../../../store/behavior-store';
import type { BehaviorEntry } from '../../../types/behavior';
import type { RootStackParamList } from '../../../types/navigation';
import { isArchived } from '../../../utils/archive-utils';
import { getBehaviorTypeColor } from '../../../utils/behavior-type-utils';
import { Colors } from '../../../utils/colors';
import { formatCompactDate } from '../../../utils/time-utils';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type Mode = 'details' | 'log';

interface Props {
  behavior: BehaviorEntry;
  showCategory?: boolean;
  /** Date string (YYYY-MM-DD) for the section this card belongs to.
   *  When provided, the StarRow reflects earned stars for that date
   *  instead of today. Defaults to today. */
  dateStr?: string;
  motionEnabled?: boolean;
  now?: number;
}

export const BehaviorCard = React.memo(function BehaviorCard({
  behavior,
  showCategory,
  dateStr,
  motionEnabled = true,
  now,
}: Props) {
  const navigation = useNavigation<NavProp>();
  const pressableRef = useRef<View>(null);
  /** Window-space bounds of the Pressable, refreshed on every layout change
   *  and at the start of every press. We can't rely on `locationX` from the
   *  press event because it's relative to the touched child view (the XPBar
   *  track, a bar value Text, etc.), not to the Pressable itself. */
  const bounds = useRef<{ windowX: number; width: number } | null>(null);

  const refreshBounds = useCallback(() => {
    pressableRef.current?.measureInWindow((x, _y, width) => {
      bounds.current = { windowX: x, width };
    });
  }, []);

  const goToMode = useCallback(
    (mode: Mode) => {
      navigation.navigate('BehaviorLog', { behaviorId: behavior.id, initialMode: mode });
    },
    [behavior.id, navigation],
  );

  const handlePress = useCallback(
    (e: GestureResponderEvent) => {
      // Refresh in case the card has moved (e.g. list reordering) since the
      // last layout. If the cached bounds are still valid, this re-runs the
      // same measurement — cheap and avoids stale coordinates.
      refreshBounds();
      const cached = bounds.current;
      if (cached && cached.width > 0) {
        // pageX is the touch's X in window coordinates, so it can be compared
        // directly against the Pressable's window X.
        const isRightHalf = e.nativeEvent.pageX >= cached.windowX + cached.width / 2;
        goToMode(isRightHalf ? 'log' : 'details');
      } else {
        // No measurement yet — fall back to the previous default (log).
        goToMode('log');
      }
    },
    [goToMode, refreshBounds],
  );

  const handleLayout = useCallback(
    (_e: LayoutChangeEvent) => {
      refreshBounds();
    },
    [refreshBounds],
  );

  const openActionSheet = useBehaviorActionSheetStore(state => state.open);
  const unarchiveBehavior = useBehaviorStore(state => state.unarchiveBehavior);
  const handleLongPress = useCallback(() => openActionSheet(behavior.id), [behavior.id, openActionSheet]);
  const archived = isArchived(behavior);

  const handleAccessibilityAction = useCallback(
    (event: { nativeEvent: { actionName: string } }) => {
      if (event.nativeEvent.actionName === 'view-details') goToMode('details');
      if (event.nativeEvent.actionName === 'log-behavior') goToMode('log');
      if (event.nativeEvent.actionName === 'longpress') handleLongPress();
    },
    [goToMode, handleLongPress],
  );

  const accentColor = getBehaviorTypeColor(behavior.type);

  return (
    <View style={styles.card}>
      <View
        pointerEvents="none"
        style={[styles.accent, { backgroundColor: accentColor }]}
      />
      <View style={styles.column}>
        <Pressable
          ref={pressableRef}
          style={[styles.content, archived && styles.archivedContent]}
          onPress={archived ? () => goToMode('details') : handlePress}
          onLongPress={handleLongPress}
          onLayout={handleLayout}
          onPressIn={refreshBounds}
          accessibilityRole="button"
          accessibilityLabel={behavior.name}
          accessibilityHint="Choose View details or Log behavior from accessibility actions. Long-press for more."
          accessibilityActions={[
            { name: 'view-details', label: 'View details' },
            { name: 'log-behavior', label: 'Log behavior' },
            { name: 'longpress', label: 'Edit, archive or delete' },
          ]}
          onAccessibilityAction={handleAccessibilityAction}
        >
          <BehaviorSummary
            behavior={behavior}
            showCategory={showCategory}
            dateStr={dateStr}
            motionEnabled={motionEnabled}
            xpMotionEnabled={false}
            now={now}
            presentation="home-card"
            inlineElapsedWhenNoCooldown
          />
        </Pressable>
        {archived && (
          <View style={styles.archivedFooter}>
            <Text style={styles.archivedLabel}>Archived {formatCompactDate(behavior.archivedAt ?? Date.now())}</Text>
            <Pressable
              style={({ pressed }) => [styles.unarchive, pressed && styles.unarchivePressed]}
              onPress={() => unarchiveBehavior(behavior.id)}
              accessibilityRole="button"
              accessibilityLabel={`Unarchive ${behavior.name}`}
            >
              <Text style={styles.unarchiveLabel}>Unarchive</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    borderColor: Colors.border.default,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 11,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  accent: {
    position: 'absolute',
    left: 8,
    top: 12,
    bottom: 12,
    width: 4,
    borderRadius: 4,
  },
  column: {
    flex: 1,
    minWidth: 0,
  },
  archivedContent: {
    opacity: 0.5,
  },
  archivedFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: -4,
    paddingLeft: 20,
    paddingRight: 14,
    paddingBottom: 12,
  },
  archivedLabel: {
    flex: 1,
    color: Colors.text.faint,
    fontSize: 12,
    fontWeight: '600',
  },
  unarchive: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border.light,
    backgroundColor: Colors.bg.input,
  },
  unarchivePressed: {
    opacity: 0.7,
  },
  unarchiveLabel: {
    color: Colors.text.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    minWidth: 0,
    paddingTop: 14,
    paddingRight: 14,
    paddingBottom: 14,
    paddingLeft: 20,
  },
});
