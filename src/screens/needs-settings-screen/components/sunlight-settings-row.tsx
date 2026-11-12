import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import { resyncReminders } from '../../../hooks/use-reminder-engine';
import { useSunlightStore } from '../../../store/sunlight-store';
import { Colors } from '../../../utils/colors';
import { requestBackgroundLocationPermission } from '../../../utils/reminder-geofencing';

/** Turns the Sunlight bar (outdoor time between sunrise and sunset) on or off. */
export function SunlightSettingsRow() {
  const enabled = useSunlightStore(state => state.enabled);
  const goalMinutes = useSunlightStore(state => state.goalMinutes);
  const setEnabled = useSunlightStore(state => state.setEnabled);

  const toggle = () => {
    setEnabled(!enabled);
    // Arrive/leave tracking needs "Allow all the time"; the geofences resync once it's granted.
    if (!enabled) {
      requestBackgroundLocationPermission()
        .then(granted => (granted ? resyncReminders() : undefined))
        .catch(() => undefined);
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      onPress={toggle}
      accessibilityRole="switch"
      accessibilityState={{ checked: enabled }}
    >
      <Text style={styles.emoji}>☀️</Text>
      <View style={styles.labels}>
        <Text style={styles.label}>Sunlight</Text>
        <Text style={styles.hint}>Time away from your places between sunrise and sunset · goal {goalMinutes} min</Text>
      </View>
      <View style={[styles.toggle, enabled && styles.toggleOn]}>
        <View style={[styles.thumb, enabled && styles.thumbOn]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border.default,
  },
  pressed: { opacity: 0.7 },
  emoji: { fontSize: 18, width: 24, textAlign: 'center' },
  labels: { flex: 1, gap: 2 },
  label: { color: Colors.text.secondary, fontSize: 15 },
  hint: { color: Colors.text.faint, fontSize: 12 },
  toggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.bg.elevated,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleOn: { backgroundColor: Colors.status.success },
  thumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.text.muted },
  thumbOn: { backgroundColor: Colors.text.primary, alignSelf: 'flex-end' },
});
