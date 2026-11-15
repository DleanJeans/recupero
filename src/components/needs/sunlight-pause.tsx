import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSunlightStore } from '../../store/sunlight-store';
import { Colors } from '../../utils/colors';
import { getPauseUntil, SUNLIGHT_PAUSE_OPTIONS } from '../../utils/sunlight-utils';
import { Text } from '../text';

/** Pause outdoor detection for a while (visiting somewhere that isn't a saved place). Resuming is the Pause button. */
export function SunlightPauseCard() {
  const pauseUntil = useSunlightStore(state => state.pauseUntil);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Pause counting for</Text>
      <Text style={styles.detail}>
        Somewhere you haven't saved as a place? Pause so that time doesn't count. It resumes by itself.
      </Text>
      <View style={styles.chips}>
        {SUNLIGHT_PAUSE_OPTIONS.map(option => (
          <Pressable
            key={option.label}
            style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
            onPress={() => pauseUntil(getPauseUntil(option, Date.now()))}
            accessibilityRole="button"
            accessibilityLabel={`Pause for ${option.label}`}
          >
            <Ionicons
              name="pause"
              size={12}
              color={Colors.text.primary}
            />
            <Text style={styles.chipText}>{option.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 8,
    backgroundColor: Colors.bg.input,
    borderRadius: 10,
    padding: 12,
  },
  title: {
    color: Colors.text.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  detail: {
    color: Colors.text.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.text.dim,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  chipText: {
    color: Colors.text.primary,
    fontSize: 13,
  },
  pressed: {
    opacity: 0.7,
  },
});
