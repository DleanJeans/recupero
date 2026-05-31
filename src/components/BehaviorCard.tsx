import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import type { BehaviorEntry } from '../types/behavior';
import { formatElapsed } from '../utils/timeUtils';
import { Text } from './Text';

interface Props {
  behavior: BehaviorEntry;
  onLog: () => void;
  onRemove: () => void;
  onPress?: () => void;
}

export function BehaviorCard({ behavior, onLog, onRemove, onPress }: Props) {
  const swipeableRef = useRef<Swipeable>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const renderLeftActions = () => (
    <Pressable
      style={({ pressed }) => [
        styles.deleteButton,
        pressed && {
          opacity: 0.8,
        },
      ]}
      onPress={() => onRemove()}
    >
      <Ionicons
        name="trash"
        size={24}
        color="#fff"
      />
      <Text style={styles.deleteButtonText}>Delete</Text>
    </Pressable>
  );

  return (
    <Swipeable
      ref={swipeableRef}
      renderLeftActions={renderLeftActions}
      overshootLeft={false}
    >
      <View style={styles.card}>
        <Pressable
          style={styles.content}
          onPress={onPress}
        >
          {behavior.icon && typeof behavior.icon === 'object' ? (
            <Image
              source={behavior.icon}
              style={styles.iconImage}
            />
          ) : (
            <Text style={styles.emoji}>{typeof behavior.icon === 'string' ? behavior.icon : '⏱️'}</Text>
          )}
          <View style={styles.info}>
            <Text style={styles.name}>{behavior.name}</Text>
            <Text style={styles.elapsed}>{formatElapsed(behavior.lastTimestamp)}</Text>
          </View>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.logBtn,
            pressed && styles.logBtnPressed,
          ]}
          onPress={onLog}
        >
          <Ionicons
            name="add-circle-outline"
            size={28}
            color="#ccc"
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
  },
  emoji: {
    fontSize: 32,
    marginRight: 12,
  },
  iconImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  elapsed: {
    color: '#888',
    fontSize: 13,
    marginTop: 2,
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
