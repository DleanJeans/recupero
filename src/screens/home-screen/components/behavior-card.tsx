import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useRef } from 'react';
import { type GestureResponderEvent, type LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { BehaviorSummary } from '../../../components/behavior-summary';
import type { BehaviorEntry } from '../../../types/behavior';
import type { RootStackParamList } from '../../../types/navigation';
import { Colors } from '../../../utils/colors';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

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
  const contentWidth = useRef(0);

  const handlePress = useCallback(
    (e: GestureResponderEvent) => {
      const mode = e.nativeEvent.locationX < contentWidth.current / 2 ? 'details' : 'log';
      navigation.navigate('BehaviorLog', { behaviorId: behavior.id, initialMode: mode });
    },
    [behavior.id, navigation],
  );

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    contentWidth.current = e.nativeEvent.layout.width;
  }, []);

  const handlePressFallback = useCallback(
    (e: GestureResponderEvent) => {
      if (contentWidth.current === 0) {
        navigation.navigate('BehaviorLog', { behaviorId: behavior.id, initialMode: 'log' });
        return;
      }
      handlePress(e);
    },
    [behavior.id, handlePress, navigation],
  );

  return (
    <View style={styles.card}>
      <Pressable
        style={styles.content}
        onPress={handlePressFallback}
        onLayout={handleLayout}
      >
        <BehaviorSummary
          behavior={behavior}
          showCategory={showCategory}
          dateStr={dateStr}
          motionEnabled={motionEnabled}
          xpMotionEnabled={false}
          now={now}
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
