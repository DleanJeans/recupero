import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet } from 'react-native';
import { Text } from '../../../components/text';
import { Colors } from '../../../utils/colors';

const AnimatedText = Animated.createAnimatedComponent(Text);
const HEIGHT = 48;
const ICON_SIZE = 26;
const LEFT_PAD = (HEIGHT - ICON_SIZE) / 2;
const LABEL_GAP = 4;
const RIGHT_PAD = 20;
const FALLBACK_LABEL_WIDTH = 100;

interface AddBehaviorFabProps {
  collapsed: boolean;
  onPress: () => void;
}

/** Floating "+ Add behavior" pill that shrinks to a circle while the list scrolls down. */
export function AddBehaviorFab({ collapsed, onPress }: AddBehaviorFabProps) {
  const [labelWidth, setLabelWidth] = useState(FALLBACK_LABEL_WIDTH);
  const expandedWidth = LEFT_PAD + ICON_SIZE + LABEL_GAP + labelWidth + RIGHT_PAD;
  const progress = useRef(new Animated.Value(collapsed ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(progress, {
      toValue: collapsed ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [collapsed, progress]);
  const width = progress.interpolate({ inputRange: [0, 1], outputRange: [expandedWidth, HEIGHT] });
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
          size={ICON_SIZE}
          color={Colors.bg.black}
        />
        <AnimatedText
          numberOfLines={1}
          onLayout={e => setLabelWidth(Math.ceil(e.nativeEvent.layout.width))}
          style={[styles.label, { opacity: labelOpacity }]}
        >
          Add behavior
        </AnimatedText>
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
    paddingLeft: LEFT_PAD,
    overflow: 'hidden',
    elevation: 4,
  },
  label: {
    color: Colors.bg.black,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: LABEL_GAP,
    flexShrink: 0,
  },
});
