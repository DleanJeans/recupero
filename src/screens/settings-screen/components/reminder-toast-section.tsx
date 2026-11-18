import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button } from '../../../components/button';
import { Text } from '../../../components/text';
import { useSettingsStore } from '../../../store/settings-store';
import { Colors } from '../../../utils/colors';
import type { ReminderToastPosition } from '../../../utils/reminder-toast-utils';

const POSITIONS: { value: ReminderToastPosition; label: string }[] = [
  { value: 'top', label: 'Top' },
  { value: 'bottom', label: 'Bottom' },
];

export function ReminderToastSection() {
  const enabled = useSettingsStore(s => s.reminderToastEnabled);
  const setEnabled = useSettingsStore(s => s.setReminderToastEnabled);
  const position = useSettingsStore(s => s.reminderToastPosition);
  const setPosition = useSettingsStore(s => s.setReminderToastPosition);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>REMINDER TOAST</Text>
      <Pressable
        style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
        onPress={() => setEnabled(!enabled)}
        accessibilityRole="switch"
        accessibilityState={{ checked: enabled }}
      >
        <View style={styles.labels}>
          <Text style={styles.label}>Toast while the app is open</Text>
          <Text style={styles.hint}>
            A habit reminder that fires while Recupero is open shows as a card here instead of a notification. Off
            always uses notifications.
          </Text>
        </View>
        <View style={[styles.toggle, enabled && styles.toggleOn]}>
          <View style={[styles.thumb, enabled && styles.thumbOn]} />
        </View>
      </Pressable>
      {enabled && (
        <View style={styles.optionsRow}>
          {POSITIONS.map(option => {
            const isSelected = position === option.value;
            return (
              <Button
                key={option.value}
                variant="ghost"
                active={isSelected}
                onPress={() => setPosition(option.value)}
                style={[styles.optionCard, isSelected && styles.optionCardSelected]}
              >
                <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>{option.label}</Text>
              </Button>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 24, marginHorizontal: 16 },
  sectionTitle: {
    color: Colors.text.faint,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  labels: { flex: 1, gap: 2, marginRight: 12 },
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
  optionsRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  optionCard: { flex: 1, padding: 14, borderWidth: 1.5, borderColor: Colors.bg.card, alignItems: 'center' },
  optionCardSelected: { borderColor: Colors.text.primary, backgroundColor: Colors.bg.input },
  optionLabel: { color: Colors.text.muted, fontSize: 16, fontWeight: '600' },
  optionLabelSelected: { color: Colors.text.primary },
});
