import { Ionicons } from '@expo/vector-icons';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { BehaviorIcon } from '../../../components/BehaviorIcon';
import { Button } from '../../../components/Button';
import { CooldownLabel } from '../../../components/CooldownLabel';
import { DecayBar } from '../../../components/DecayBar';
import { StarRow } from '../../../components/StarRow';
import { Text } from '../../../components/Text';
import { XpBar } from '../../../components/XpBar';
import { useXpBarAnimation } from '../../../hooks/useXpBarAnimation';
import { useBehaviorStore } from '../../../store/behaviorStore';
import type { BehaviorEntry } from '../../../types/behavior';
import type { RootStackParamList } from '../../../types/navigation';
import { getBehaviorTypeColor } from '../../../utils/behaviorTypeUtils';
import { Colors } from '../../../utils/colors';
import { getCooldownColor } from '../../../utils/cooldownUtils';
import { formatElapsedNumeric } from '../../../utils/timeUtils';
import { getEffectiveLogCount } from '../../../utils/xpUtils';

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
  const [, setTick] = useState(0);

  const isFocused = useIsFocused();
  const animate = useXpBarAnimation(behavior, isFocused);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

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

  const handlePress = () => {
    navigation.navigate('BehaviorDetails', { behaviorId: behavior.id });
  };

  const handleLongPress = () => {
    navigation.navigate('BehaviorForm', { behaviorId: behavior.id });
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderLeftActions={() => <SwipeDelete onRemove={handleRemove} />}
      overshootLeft={false}
    >
      <View style={styles.card}>
        <Pressable
          style={styles.content}
          onPress={handlePress}
          onLongPress={handleLongPress}
        >
          <BehaviorIcon
            behavior={behavior}
            size={32}
          />
          <BehaviorInfo
            behavior={behavior}
            showCategory={showCategory}
            animate={animate}
            dateStr={dateStr}
          />
        </Pressable>

        <LogButton
          behavior={behavior}
          onPress={() => navigation.navigate('BehaviorLog', { behaviorId: behavior.id })}
        />
      </View>
    </Swipeable>
  );
}

// #region Sub-components

interface CategoryEmojiProps {
  behavior: BehaviorEntry;
}
function CategoryEmoji({ behavior }: CategoryEmojiProps) {
  const { categories } = useBehaviorStore();
  const category = behavior.categoryId ? categories.find(c => c.id === behavior.categoryId) : null;
  if (!category) return null;
  return <Text style={{ fontSize: 15 }}>{category.emoji}</Text>;
}

interface BehaviorInfoProps {
  behavior: BehaviorEntry;
  showCategory?: boolean;
  animate?: boolean;
  dateStr?: string;
}
function BehaviorInfo({ behavior, showCategory, animate, dateStr }: BehaviorInfoProps) {
  return (
    <View style={styles.info}>
      <View style={styles.nameRow}>
        <BehaviorName behavior={behavior} />
        {showCategory && <CategoryEmoji behavior={behavior} />}
        <StarRow
          behavior={behavior}
          dateStr={dateStr}
          size={14}
          style={styles.starSlot}
        />
        {!behavior.xpEnabled && <Text style={styles.logCount}>×{behavior.logs.length}</Text>}
      </View>
      <View style={styles.elapsedRow}>
        <BehaviorElapsed behavior={behavior} />
        <CooldownLabel behavior={behavior} />
      </View>
      {behavior.xpEnabled && (
        <XpBar
          logCount={getEffectiveLogCount(behavior)}
          color={getBehaviorTypeColor(behavior.type)}
          animate={animate}
        />
      )}
      {behavior.xpEnabled && behavior.xpDecay && getEffectiveLogCount(behavior) > 0 && <DecayBar behavior={behavior} />}
    </View>
  );
}

interface BehaviorNameProps {
  behavior: BehaviorEntry;
}
function BehaviorName({ behavior }: BehaviorNameProps) {
  return <Text style={styles.name}>{behavior.name}</Text>;
}

interface BehaviorElapsedProps {
  behavior: BehaviorEntry;
}
function BehaviorElapsed({ behavior }: BehaviorElapsedProps) {
  const color = behavior.cooldownMinutes ? getCooldownColor(behavior) : undefined;

  return <Text style={[styles.elapsed, color ? { color } : null]}>{formatElapsedNumeric(behavior.lastTimestamp)}</Text>;
}

interface LogButtonProps {
  behavior: BehaviorEntry;
  onPress: () => void;
}
function LogButton({ behavior, onPress }: LogButtonProps) {
  return (
    <Button
      variant="icon"
      onPress={onPress}
      accessibilityLabel={`Log ${behavior.name}`}
      style={styles.logBtn}
    >
      <Ionicons
        name="add-circle-outline"
        size={28}
        color={Colors.text.secondary}
      />
    </Button>
  );
}

interface SwipeDeleteProps {
  onRemove: () => void;
}
function SwipeDelete({ onRemove }: SwipeDeleteProps) {
  return (
    <Button
      variant="danger"
      onPress={onRemove}
      style={styles.deleteButton}
    >
      <Ionicons
        name="trash"
        size={24}
        color={Colors.text.primary}
      />
      <Text style={styles.deleteButtonText}>Delete</Text>
    </Button>
  );
}
// #endregion

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
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    paddingRight: 0,
  },
  info: {
    flex: 1,
  },
  elapsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    color: Colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  starSlot: {
    marginLeft: 2,
  },
  logCount: {
    color: Colors.text.muted,
    fontSize: 13,
    fontWeight: '600',
  },

  elapsed: {
    color: Colors.text.muted,
    fontSize: 13,
  },
  logBtn: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  deleteButton: {
    backgroundColor: Colors.status.danger,
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    marginVertical: 6,
    marginLeft: 16,
    marginRight: -48,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    paddingRight: 28,
  },
  deleteButtonText: {
    color: Colors.text.primary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});
