import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import { PATCH_NOTES } from '../../../data/patch-notes';
import { Colors } from '../../../utils/colors';
import { formatPatchNotesDate, PATCH_NOTES_COLLAPSED_DAYS, visiblePatchNotes } from '../../../utils/patch-notes-utils';

export function PatchNotesSection() {
  const [expanded, setExpanded] = useState(false);
  const days = visiblePatchNotes(PATCH_NOTES, expanded);
  const canExpand = PATCH_NOTES.length > PATCH_NOTES_COLLAPSED_DAYS;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>PATCH NOTES</Text>
      {days.map(day => (
        <View
          key={day.date}
          style={styles.day}
        >
          <Text style={styles.date}>{formatPatchNotesDate(day.date)}</Text>
          {day.items.map(item => (
            <View
              key={item}
              style={styles.itemRow}
            >
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.item}>{item}</Text>
            </View>
          ))}
        </View>
      ))}
      {canExpand && (
        <Pressable
          style={({ pressed }) => [styles.toggle, pressed && { opacity: 0.7 }]}
          onPress={() => setExpanded(value => !value)}
        >
          <Text style={styles.toggleText}>{expanded ? 'Show less' : 'Show older'}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 40, marginHorizontal: 16 },
  sectionTitle: {
    color: Colors.text.faint,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  day: { marginBottom: 16, marginLeft: 4 },
  date: { color: Colors.text.dim, fontSize: 13, fontWeight: '600', marginBottom: 6 },
  itemRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  bullet: { color: Colors.text.faint, fontSize: 13 },
  item: { flex: 1, color: Colors.text.faint, fontSize: 13, lineHeight: 18 },
  toggle: { alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 16 },
  toggleText: { color: Colors.text.dim, fontSize: 13, fontWeight: '600' },
});
