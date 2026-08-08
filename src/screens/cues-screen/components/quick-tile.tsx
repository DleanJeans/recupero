import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { CueTriggerIcon } from '../../../components/cues/cue-trigger-icon';
import { Text } from '../../../components/text';
import type { CueTriggerType } from '../../../types/cue';
import { Colors } from '../../../utils/colors';

interface QuickTileProps {
  type: Extract<CueTriggerType, 'location' | 'mood'>;
  title: string;
  subtitle: string;
  onPress: () => void;
}

export function QuickTile({ type, title, subtitle, onPress }: QuickTileProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${subtitle}`}
      accessibilityHint={`Open ${title.toLowerCase()}.`}
    >
      <CueTriggerIcon type={type} />
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text
          style={styles.subtitle}
          numberOfLines={1}
        >
          {subtitle}
        </Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={Colors.text.faint}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.default,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    color: Colors.text.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  subtitle: {
    color: Colors.text.faint,
    fontSize: 11,
  },
  pressed: {
    opacity: 0.72,
  },
});
