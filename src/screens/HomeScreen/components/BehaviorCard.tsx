import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useRef } from 'react';
import { Alert, type GestureResponderEvent, type LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { BehaviorSummary } from '../../../components/BehaviorSummary';
import { SwipeDeleteButton, SwipeEditButton } from '../../../components/SwipeActionButton';
import { useBehaviorStore } from '../../../store/behaviorStore';
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
  const removeBehavior = useBehaviorStore(s => s.removeBehavior);
  const swipeableRef = useRef<Swipeable>(null);
  const contentWidth = useRef(0);

  const handleRemove = useCallback(() => {
    swipeableRef.current?.close();
    Alert.alert('Remove Behavior', `Remove "${behavior.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => removeBehavior(behavior.id),
      },
    ]);
  }, [behavior.id, behavior.name, removeBehavior]);

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

  const handleEdit = useCallback(() => {
    swipeableRef.current?.close();
    navigation.navigate('BehaviorForm', { behaviorId: behavior.id });
  }, [behavior.id, navigation]);

  const renderLeftActions = useCallback(() => <SwipeDeleteButton onPress={handleRemove} />, [handleRemove]);

  const renderRightActions = useCallback(() => <SwipeEditButton onPress={handleEdit} />, [handleEdit]);

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
    <Swipeable
      ref={swipeableRef}
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      overshootLeft={false}
      overshootRight={false}
    >
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
    </Swipeable>
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
