import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SelectPill } from '../../../components/select-pill';
import { Text } from '../../../components/text';
import { useSettingsStore } from '../../../store/settings-store';
import { Colors } from '../../../utils/colors';

const RADIUS_OPTIONS = [30, 50, 75, 100, 150];
const DWELL_OPTIONS = [0, 2, 5, 10, 15];

export function PlaceRemindersSection() {
  const reminderRadiusM = useSettingsStore(state => state.reminderRadiusM);
  const setReminderRadiusM = useSettingsStore(state => state.setReminderRadiusM);
  const placeDwellMin = useSettingsStore(state => state.placeDwellMin);
  const setPlaceDwellMin = useSettingsStore(state => state.setPlaceDwellMin);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>PLACE REMINDERS</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Smallest area</Text>
        <View style={styles.row}>
          {RADIUS_OPTIONS.map(radius => (
            <SelectPill
              key={radius}
              label={`${radius} m`}
              active={reminderRadiusM === radius}
              activeBtnStyle={styles.active}
              activeTextStyle={styles.activeText}
              style={styles.pill}
              onPress={() => setReminderRadiusM(radius)}
            />
          ))}
        </View>
        <Text style={styles.hint}>
          Reminders watch at least this big an area around a place (bigger places keep their own size). Android often
          misses areas under about 100 m, so smaller can mean late or missing notifications.
        </Text>

        <Text style={[styles.label, styles.second]}>Stay before “I enter” fires</Text>
        <View style={styles.row}>
          {DWELL_OPTIONS.map(minutes => (
            <SelectPill
              key={minutes}
              label={minutes === 0 ? 'Off' : `${minutes} min`}
              active={placeDwellMin === minutes}
              activeBtnStyle={styles.active}
              activeTextStyle={styles.activeText}
              style={styles.pill}
              onPress={() => setPlaceDwellMin(minutes)}
            />
          ))}
        </View>
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
  label: { color: Colors.text.secondary, fontSize: 15 },
  second: { marginTop: 6 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { backgroundColor: Colors.bg.input, borderRadius: 8 },
  active: { backgroundColor: Colors.bg.elevated, borderColor: Colors.cue.location },
  activeText: { color: Colors.text.primary },
  hint: { color: Colors.text.faint, fontSize: 12, lineHeight: 17 },
});
