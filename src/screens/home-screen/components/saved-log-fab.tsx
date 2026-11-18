import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { BehaviorIcon } from '../../../components/behavior-icon';
import type { BehaviorEntry } from '../../../types/behavior';
import { Colors } from '../../../utils/colors';

const HEIGHT = 44;
const EXPANDED_WIDTH = 164;

interface SavedLogFabProps {
  behavior: BehaviorEntry;
  collapsed: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

/** Floating "saved for later" pill: emoji, name and a bookmark. Shrinks to a circle while scrolling down. */
export function SavedLogFab({ behavior, collapsed, onPress, onLongPress }: SavedLogFabProps) {
  const progress = useRef(new Animated.Value(collapsed ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(progress, {
      toValue: collapsed ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [collapsed, progress]);
  const width = progress.interpolate({ inputRange: [0, 1], outputRange: [EXPANDED_WIDTH, HEIGHT] });
  const labelOpacity = progress.interpolate({ inputRange: [0, 0.6], outputRange: [1, 0], extrapolate: 'clamp' });

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={`Log ${behavior.name} now. Long press to edit or discard`}
      style={({ pressed }) => [styles.touch, pressed && styles.pressed]}
    >
      <Animated.View style={[styles.fab, { width }]}>
        <BehaviorIcon
          behavior={behavior}
          size={22}
        />
        <Animated.Text
          numberOfLines={1}
          style={[styles.label, { opacity: labelOpacity }]}
        >
          {behavior.name}
        </Animated.Text>
        <View style={[styles.badge, collapsed && styles.badgeCollapsed]}>
          <Ionicons
            name="bookmark"
            size={collapsed ? 9 : 14}
            color={collapsed ? Colors.bg.black : Colors.cooldown.yellow}
          />
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  touch: { alignSelf: 'flex-end' },
  pressed: { opacity: 0.85 },
  fab: {
    height: HEIGHT,
    borderRadius: HEIGHT / 2,
    backgroundColor: Colors.bg.elevated,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 11,
    overflow: 'hidden',
    elevation: 4,
  },
  label: { flex: 1, color: Colors.text.primary, fontSize: 14, fontWeight: '600', marginLeft: 8 },
  badge: { paddingHorizontal: 10 },
  badgeCollapsed: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    paddingHorizontal: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.cooldown.yellow,
  },
});
