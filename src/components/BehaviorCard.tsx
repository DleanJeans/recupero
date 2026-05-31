import { Ionicons } from '@expo/vector-icons';
import React, { useRef } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import type { BehaviorEntry } from '../types/behavior';
import { Text } from './Text';

interface Props {
  behavior: BehaviorEntry;
  onLog: () => void;
  onRemove: () => void;
}

function formatElapsed(timestamp: number | null): string {
  if (timestamp === null) return 'Never';
  const elapsed = Date.now() - timestamp;
  const seconds = Math.floor(elapsed / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h ago`;
  if (hours > 0) return `${hours}h ${minutes % 60}m ago`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s ago`;
  return `${seconds}s ago`;
}

export function BehaviorCard({ behavior, onLog, onRemove }: Props) {
  const swipeableRef = useRef<Swipeable>(null);

  const renderLeftActions = () => (
    <TouchableOpacity
      style={styles.deleteButton}
      onPress={() => onRemove()}
      activeOpacity={0.7}
    >
      <Ionicons
        name="trash"
        size={24}
        color="#fff"
      />
      <Text style={styles.deleteButtonText}>Delete</Text>
    </TouchableOpacity>
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
          onPress={onLog}
        >
          {behavior.icon && typeof behavior.icon === 'object' ? (
            <Image
              source={behavior.icon}
              style={styles.iconImage}
            />
          ) : (
            <Text style={styles.emoji}>
              {typeof behavior.icon === 'string' ? behavior.icon : '⏱️'}
            </Text>
          )}
          <View style={styles.info}>
            <Text style={styles.name}>{behavior.name}</Text>
            <Text style={styles.elapsed}>
              {formatElapsed(behavior.lastTimestamp)}
            </Text>
          </View>
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
    color: '#aaa',
    fontSize: 13,
    marginTop: 2,
  },
  deleteButton: {
    backgroundColor: '#c62828',
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
