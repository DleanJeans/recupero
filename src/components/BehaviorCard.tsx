import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useBehaviorStore } from '../store/behaviorStore';
import type { BehaviorEntry } from '../types/behavior';
import type { RootStackParamList } from '../types/navigation';
import { formatElapsed } from '../utils/timeUtils';
import { BehaviorIcon } from './BehaviorIcon';
import { CooldownLabel } from './CooldownLabel';
import { LogBehaviorModal } from './LogBehaviorModal';
import { Text } from './Text';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

interface Props {
  behavior: BehaviorEntry;
}
export function BehaviorCard({ behavior }: Props) {
  const navigation = useNavigation<NavProp>();
  const { logBehavior, removeBehavior } = useBehaviorStore();
  const swipeableRef = useRef<Swipeable>(null);
  const [, setTick] = useState(0);
  const [logVisible, setLogVisible] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
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

  const handleLog = (timestamp: number) => {
    logBehavior(behavior.id, timestamp);
    setLogVisible(false);
  };

  return (
    <>
      <Swipeable
        ref={swipeableRef}
        renderLeftActions={() => <SwipeDelete onRemove={handleRemove} />}
        overshootLeft={false}
      >
        <View style={styles.card}>
          <Pressable
            style={styles.content}
            onPress={() => navigation.navigate('BehaviorDetails', { behaviorId: behavior.id })}
          >
            <BehaviorIcon
              icon={behavior.icon}
              size={32}
            />
            <BehaviorInfo behavior={behavior} />
          </Pressable>
          <LogButton
            name={behavior.name}
            onLog={() => setLogVisible(true)}
          />
        </View>
      </Swipeable>

      <LogBehaviorModal
        behaviorName={behavior.name}
        visible={logVisible}
        onConfirm={handleLog}
        onCancel={() => setLogVisible(false)}
      />
    </>
  );
}

// ---- Sub-components ----

interface BehaviorInfoProps {
  behavior: BehaviorEntry;
}
function BehaviorInfo({ behavior }: BehaviorInfoProps) {
  return (
    <View style={styles.info}>
      <BehaviorName name={behavior.name} />
      <View style={styles.elapsedRow}>
        <BehaviorElapsed lastTimestamp={behavior.lastTimestamp} />
        <CooldownLabel behavior={behavior} />
      </View>
    </View>
  );
}

interface BehaviorNameProps {
  name: string;
}
function BehaviorName({ name }: BehaviorNameProps) {
  return <Text style={styles.name}>{name}</Text>;
}

interface BehaviorElapsedProps {
  lastTimestamp: number | null;
}
function BehaviorElapsed({ lastTimestamp }: BehaviorElapsedProps) {
  return <Text style={styles.elapsed}>{formatElapsed(lastTimestamp)}</Text>;
}

interface LogButtonProps {
  name: string;
  onLog: () => void;
}
function LogButton({ name, onLog }: LogButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.logBtn,
        pressed && styles.logBtnPressed,
      ]}
      onPress={onLog}
      accessibilityLabel={`Log ${name}`}
    >
      <Ionicons
        name="add-circle-outline"
        size={28}
        color="#ccc"
      />
    </Pressable>
  );
}

interface SwipeDeleteProps {
  onRemove: () => void;
}
function SwipeDelete({ onRemove }: SwipeDeleteProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.deleteButton,
        pressed && {
          opacity: 0.8,
        },
      ]}
      onPress={onRemove}
    >
      <Ionicons
        name="trash"
        size={24}
        color="#fff"
      />
      <Text style={styles.deleteButtonText}>Delete</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
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
  name: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  elapsed: {
    color: '#888',
    fontSize: 13,
  },
  logBtn: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logBtnPressed: {
    opacity: 0.5,
    transform: [
      {
        scale: 0.92,
      },
    ],
  },
  deleteButton: {
    backgroundColor: '#943030',
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
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});
