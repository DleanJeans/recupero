import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { RadiusSlider } from '../../../components/radius-slider';
import { StepSlider } from '../../../components/step-slider';
import { Text } from '../../../components/text';
import { useSettingsStore } from '../../../store/settings-store';
import { Colors } from '../../../utils/colors';

/** Global place-reminder settings (area and stay time), tucked behind an expand button under the map. */
export function PlaceReminderOptions() {
  const [open, setOpen] = useState(false);
  const reminderRadiusM = useSettingsStore(state => state.reminderRadiusM);
  const setReminderRadiusM = useSettingsStore(state => state.setReminderRadiusM);
  const placeDwellMin = useSettingsStore(state => state.placeDwellMin);
  const setPlaceDwellMin = useSettingsStore(state => state.setPlaceDwellMin);

  return (
    <View style={styles.container}>
      <Pressable
        style={({ pressed }) => [styles.header, pressed && styles.pressed]}
        onPress={() => setOpen(value => !value)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Text style={styles.title}>Area & stay time · {open ? '' : `${reminderRadiusM} m`}</Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={Colors.text.faint}
        />
      </Pressable>
      {open && (
        <View style={styles.body}>
          <RadiusSlider
            label="Reminder area"
            value={reminderRadiusM}
            onChange={setReminderRadiusM}
          />
          <Text style={styles.hint}>
            Applies to every place reminder. Android often misses areas under about 100 m, so smaller can mean late or
            missing notifications.
          </Text>
          <StepSlider
            label="Stay before “I enter” fires"
            value={placeDwellMin}
            min={0}
            max={30}
            formatValue={minutes => (minutes === 0 ? 'Off' : `${minutes} min`)}
            onChange={setPlaceDwellMin}
          />
          <Text style={styles.hint}>
            The notification waits this long and is dropped if you leave first, so just passing by stays quiet.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  title: { color: Colors.text.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  body: { gap: 10 },
  hint: { color: Colors.text.faint, fontSize: 12, lineHeight: 17 },
  pressed: { opacity: 0.72 },
});
