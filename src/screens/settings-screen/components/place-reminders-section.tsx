import React from 'react';
import { StyleSheet, View } from 'react-native';
import { RadiusSlider } from '../../../components/radius-slider';
import { StepSlider } from '../../../components/step-slider';
import { Text } from '../../../components/text';
import { useSettingsStore } from '../../../store/settings-store';
import { Colors } from '../../../utils/colors';

export function PlaceRemindersSection() {
  const reminderRadiusM = useSettingsStore(state => state.reminderRadiusM);
  const setReminderRadiusM = useSettingsStore(state => state.setReminderRadiusM);
  const placeDwellMin = useSettingsStore(state => state.placeDwellMin);
  const setPlaceDwellMin = useSettingsStore(state => state.setPlaceDwellMin);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>PLACE REMINDERS</Text>
      <View style={styles.card}>
        <RadiusSlider
          label="Smallest area"
          value={reminderRadiusM}
          onChange={setReminderRadiusM}
        />
        <Text style={styles.hint}>
          Reminders watch at least this big an area around a place (bigger places keep their own size). Android often
          misses areas under about 100 m, so smaller can mean late or missing notifications.
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
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 24, marginHorizontal: 16 },
  sectionTitle: {
    color: Colors.text.faint,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: { backgroundColor: Colors.bg.card, borderRadius: 8, padding: 14, gap: 10 },
  hint: { color: Colors.text.faint, fontSize: 12, lineHeight: 17 },
});
