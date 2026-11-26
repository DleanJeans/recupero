import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { resyncReminders } from '../../hooks/use-reminder-engine';
import { useSunlightStore } from '../../store/sunlight-store';
import { Colors } from '../../utils/colors';
import {
  getPauseUntil,
  SUNLIGHT_PAUSE_OPTIONS,
  SUNLIGHT_PIN_MAX_MS,
  SUNLIGHT_PIN_RADIUS_M,
} from '../../utils/sunlight-utils';
import { Text } from '../text';

/**
 * Pause outdoor detection at somewhere that isn't a saved place: drops a temporary pin here (at the sunlight
 * radius) and counting resumes by itself once you leave it, which also removes the pin. Fixed durations are
 * only offered if the position can't be read.
 */
export function SunlightPauseCard() {
  const pauseUntil = useSunlightStore(state => state.pauseUntil);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const pinHere = async () => {
    setBusy(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') throw new Error('no location permission');
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const now = Date.now();
      pauseUntil(now + SUNLIGHT_PIN_MAX_MS, { lat: position.coords.latitude, lng: position.coords.longitude });
      void resyncReminders();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Pause here</Text>
      <Text style={styles.detail}>
        {`Somewhere you haven't saved as a place? Drops a temporary pin here (${SUNLIGHT_PIN_RADIUS_M} m). Counting resumes and the pin is removed when you leave it.`}
      </Text>
      <Pressable
        style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
        onPress={pinHere}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel="Pause here with a temporary pin"
      >
        <Ionicons
          name="pin"
          size={12}
          color={Colors.text.primary}
        />
        <Text style={styles.chipText}>{busy ? 'Getting location…' : 'Pause here'}</Text>
      </Pressable>
      {failed && (
        <>
          <Text style={styles.detail}>Couldn't read your location. Pause for a set time instead:</Text>
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
        </>
      )}
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
