import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import { Text } from '../../components/text';
import { Colors } from '../../utils/colors';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface SplitLogButtonProps {
  /** Main (left) part: a string label or custom content. */
  children: React.ReactNode;
  onPress: () => void;
  accessibilityLabel?: string;
  /** Icon on the main part, before the label. */
  icon?: IoniconName;
  /** End (right) segment, e.g. a stopwatch to start a timer. Left out = a plain white button. */
  segmentIcon?: IoniconName;
  segmentLabel?: string;
  onSegmentPress?: () => void;
  segmentAccessibilityLabel?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** White primary button with an optional grey end segment for the other way to log (Log | ⏱ or Start timer | Log). */
export function SplitLogButton({
  children,
  onPress,
  accessibilityLabel,
  icon,
  segmentIcon,
  segmentLabel,
  onSegmentPress,
  segmentAccessibilityLabel,
  disabled,
  style,
}: SplitLogButtonProps) {
  const hasSegment = onSegmentPress != null && (segmentIcon != null || segmentLabel != null);
  return (
    <View style={[styles.container, disabled && styles.disabled, style]}>
      <Pressable
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={18}
            color={Colors.bg.black}
          />
        )}
        {typeof children === 'string' ? <Text style={styles.label}>{children}</Text> : children}
      </Pressable>
      {hasSegment && (
        <Pressable
          style={({ pressed }) => [styles.segment, segmentLabel ? styles.segmentWide : null, pressed && styles.pressed]}
          onPress={onSegmentPress}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={segmentAccessibilityLabel ?? segmentLabel}
          accessibilityState={{ disabled }}
        >
          {segmentIcon && (
            <Ionicons
              name={segmentIcon}
              size={20}
              color={Colors.bg.input}
            />
          )}
          {segmentLabel && <Text style={styles.segmentLabel}>{segmentLabel}</Text>}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
  },
  disabled: {
    opacity: 0.4,
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.text.primary,
    paddingHorizontal: 12,
  },
  label: {
    color: Colors.bg.black,
    fontSize: 16,
    fontWeight: '600',
  },
  segment: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.splitButton.segment,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: Colors.splitButton.divider,
  },
  segmentWide: {
    width: 68,
  },
  segmentLabel: {
    color: Colors.bg.input,
    fontSize: 15,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.8,
  },
});
