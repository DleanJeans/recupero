import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useRef, useState } from 'react';
import { Alert, type GestureResponderEvent, Pressable, StyleSheet, View } from 'react-native';
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
}

export function BehaviorCard({ behavior, showCategory, dateStr }: Props) {
  const navigation = useNavigation<NavProp>();
  const { removeBehavior } = useBehaviorStore();
  const swipeableRef = useRef<Swipeable>(null);
  const [width, setWidth] = useState(0);

  const handleRemove = () => {
    swipeableRef.current?.close();
    Alert.alert('Remove Behavior', `Remove "${behavior.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => removeBehavior(behavior.id),
      },
    ]);
  };

  const handlePress = (e: GestureResponderEvent) => {
    const mode = e.nativeEvent.locationX < width / 2 ? 'details' : 'log';
    navigation.navigate('BehaviorLog', { behaviorId: behavior.id, initialMode: mode });
  };

  const handleEdit = () => {
    swipeableRef.current?.close();
    navigation.navigate('BehaviorForm', { behaviorId: behavior.id });
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderLeftActions={() => <SwipeDeleteButton onPress={handleRemove} />}
      renderRightActions={() => <SwipeEditButton onPress={handleEdit} />}
      overshootLeft={false}
      overshootRight={false}
    >
      <View style={styles.card}>
        <Pressable
          style={styles.content}
          onPress={handlePress}
          onLayout={e => setWidth(e.nativeEvent.layout.width)}
        >
          <BehaviorSummary
            behavior={behavior}
            showCategory={showCategory}
            dateStr={dateStr}
          />
        </Pressable>
      </View>
    </Swipeable>
  );
}

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
