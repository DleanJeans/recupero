import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { BehaviorIcon } from '../../../components/behavior-icon';
import type { BehaviorEntry } from '../../../types/behavior';
import { Colors } from '../../../utils/colors';

const HEIGHT = 44;
/** Space after the name for the bookmark: 14px icon + 10px padding each side. */
const BADGE_WIDTH = 34;
const MAX_EXPANDED_WIDTH = 220;

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
  // Measure the name off-screen so the pill is just wide enough for icon + name + bookmark.
  const [labelWidth, setLabelWidth] = useState(0);
  const expandedWidth = Math.min(MAX_EXPANDED_WIDTH, HEIGHT + Math.ceil(labelWidth) + BADGE_WIDTH);
  const width = progress.interpolate({ inputRange: [0, 1], outputRange: [expandedWidth, HEIGHT] });
  const labelOpacity = progress.interpolate({ inputRange: [0, 0.6], outputRange: [1, 0], extrapolate: 'clamp' });

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={`Edit saved log for ${behavior.name}. Long press to log now or discard`}
      style={({ pressed }) => [styles.touch, pressed && styles.pressed]}
    >
      <Text
        style={[styles.label, styles.measure]}
        onLayout={e => setLabelWidth(e.nativeEvent.layout.width)}
        accessible={false}
      >
        {behavior.name}
      </Text>
      <Animated.View style={[styles.fab, { width }]}>
        <View style={styles.iconBox}>
          <BehaviorIcon
            behavior={behavior}
            size={20}
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
    overflow: 'hidden',
    elevation: 4,
  },
  /** A full circle-sized slot, so the icon stays centred in the collapsed circle whatever its glyph width. */
  iconBox: { width: HEIGHT, height: HEIGHT, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  measure: { position: 'absolute', opacity: 0, left: 0, top: 0 },
  label: { flex: 1, color: Colors.text.primary, fontSize: 14, fontWeight: '600' },
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
