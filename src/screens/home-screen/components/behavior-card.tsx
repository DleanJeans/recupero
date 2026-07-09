import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useRef } from 'react';
import { type GestureResponderEvent, type LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { BehaviorSummary } from '../../../components/behavior-summary';
import type { BehaviorEntry } from '../../../types/behavior';
import type { RootStackParamList } from '../../../types/navigation';
import { Colors } from '../../../utils/colors';

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

  return (
    <View style={styles.card}>
      <Pressable
        ref={pressableRef}
        style={styles.content}
        onPress={handlePress}
        onLayout={handleLayout}
        onPressIn={refreshBounds}
      >
        <BehaviorSummary
          behavior={behavior}
          showCategory={showCategory}
          dateStr={dateStr}
          motionEnabled={motionEnabled}
          xpMotionEnabled={false}
          now={now}
          inlineElapsedWhenNoCooldown
        />
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    marginVertical: 6,
    overflow: 'hidden',
    marginHorizontal: 16,
  },
  content: {
    flex: 1,
    padding: 16,
  },
});
