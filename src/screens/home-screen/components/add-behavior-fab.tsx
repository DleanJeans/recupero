import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
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
  label?: string;
  /** Ionicons name for the collapsed circle and the left of the label. */
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  /** MaterialCommunityIcons name, used instead of `icon` when set (e.g. chef-hat, which Ionicons lacks). */
  mciIcon?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  /** Glyph size inside the fixed icon slot. Busy outline icons read better smaller than the plain +. */
  iconSize?: number;
  /** Secondary look (dark pill) so it does not compete with the primary Add behavior button. */
  secondary?: boolean;
}

/** Floating "+ Add behavior" pill that shrinks to a circle while the list scrolls down. */
export function AddBehaviorFab({
  collapsed,
  onPress,
  label = 'Add behavior',
  icon = 'add',
  mciIcon,
  iconSize = ICON_SIZE,
  secondary,
}: AddBehaviorFabProps) {
  const fg = secondary ? Colors.text.primary : Colors.bg.black;
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
      accessibilityLabel={label}
      style={({ pressed }) => [styles.touch, pressed && styles.pressed]}
    >
      <Animated.View style={[styles.fab, secondary && styles.fabSecondary, { width }]}>
        <View style={styles.iconSlot}>
          {mciIcon ? (
            <MaterialCommunityIcons
              name={mciIcon}
              size={iconSize}
              color={fg}
            />
          ) : (
            <Ionicons
              name={icon}
              size={iconSize}
              color={fg}
            />
          )}
        </View>
        <AnimatedText
          numberOfLines={1}
          onLayout={e => setLabelWidth(Math.ceil(e.nativeEvent.layout.width))}
          style={[styles.label, { color: fg, opacity: labelOpacity }]}
        >
          {label}
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
  iconSlot: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabSecondary: {
    backgroundColor: Colors.bg.elevated,
  },
  label: {
    color: Colors.bg.black,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: LABEL_GAP,
    flexShrink: 0,
  },
});
