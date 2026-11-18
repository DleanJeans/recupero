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
      accessibilityLabel={`Edit saved log for ${behavior.name}. Long press to log now or discard`}
      style={({ pressed }) => [styles.touch, pressed && styles.pressed]}
    >
      <Animated.View style={[styles.fab, { width }]}>
        <View style={styles.iconBox}>
          <BehaviorIcon
            behavior={behavior}
            size={22}
          />
        </View>
        <Animated.Text
          numberOfLines={1}
          style={[styles.label, { opacity: labelOpacity }]}
        >
          {behavior.name}
        </Animated.Text>
        {!collapsed && (
          <View style={styles.badge}>
            <Ionicons
              name="bookmark"
              size={14}
              color={Colors.cooldown.yellow}
            />
          </View>
        )}
      </Animated.View>
      {collapsed && (
        <View style={styles.badgeCollapsed}>
          <Ionicons
            name="bookmark"
            size={10}
            color={Colors.bg.black}
          />
        </View>
      )}
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
    paddingLeft: 10,
    overflow: 'hidden',
    elevation: 4,
  },
  iconBox: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, color: Colors.text.primary, fontSize: 14, fontWeight: '600', marginLeft: 8 },
  badge: { paddingHorizontal: 10 },
  badgeCollapsed: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.cooldown.yellow,
  },
});
