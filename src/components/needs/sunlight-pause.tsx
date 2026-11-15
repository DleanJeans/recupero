import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSunlightStore } from '../../store/sunlight-store';
import type { SunlightPause } from '../../types/sunlight';
import { Colors } from '../../utils/colors';
import { formatPauseUntil, getPauseUntil, SUNLIGHT_PAUSE_OPTIONS } from '../../utils/sunlight-utils';
import { formatTime } from '../../utils/time-utils';
import { Text } from '../text';
import { SUNLIGHT_COLOR } from './sunlight-bar-row';

interface SunlightPauseProps {
  /** The pause in effect now, if any. */
  pause?: SunlightPause;
  now: number;
}

/** Pause outdoor detection for a while (visiting somewhere that isn't a saved place), or resume early. */
export function SunlightPauseCard({ pause, now }: SunlightPauseProps) {
  const pauseUntil = useSunlightStore(state => state.pauseUntil);
  const resume = useSunlightStore(state => state.resumeSunlight);

  if (pause) {
    return (
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.info}>
            <Text style={styles.title}>{`Paused ${formatPauseUntil(pause.until, now, formatTime)}`}</Text>
            <Text style={styles.detail}>Time outside so far today is kept. Nothing new counts until it resumes.</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
            onPress={resume}
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>Resume</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Pause counting</Text>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  info: {
    flex: 1,
    gap: 2,
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
  button: {
    backgroundColor: SUNLIGHT_COLOR,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  buttonText: {
    color: '#1a1300',
    fontSize: 13,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
});
