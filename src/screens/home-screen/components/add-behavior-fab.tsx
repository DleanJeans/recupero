import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet } from 'react-native';
import { Colors } from '../../../utils/colors';

const HEIGHT = 48;
const EXPANDED_WIDTH = 164;

interface AddBehaviorFabProps {
  collapsed: boolean;
  onPress: () => void;
}

/** Floating "+ Add behavior" pill that shrinks to a circle while the list scrolls down. */
export function AddBehaviorFab({ collapsed, onPress }: AddBehaviorFabProps) {
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
      accessibilityRole="button"
      accessibilityLabel="Add behavior"
      style={({ pressed }) => [styles.touch, pressed && styles.pressed]}
    >
      <Animated.View style={[styles.fab, { width }]}>
        <Ionicons
          name="add"
          size={26}
          color={Colors.bg.black}
        />
        <Animated.Text
          numberOfLines={1}
          style={[styles.label, { opacity: labelOpacity }]}
        >
          Add behavior
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  touch: {
    alignSelf: 'flex-end',
  },
  pressed: {
    opacity: 0.85,
  },
  fab: {
    height: HEIGHT,
    borderRadius: HEIGHT / 2,
    backgroundColor: Colors.text.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 11,
    overflow: 'hidden',
    elevation: 4,
  },
  label: {
    color: Colors.bg.black,
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 4,
  },
});
