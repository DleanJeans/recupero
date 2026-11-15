import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import type { PatchNotesDay as PatchNotesDayData } from '../../../data/patch-notes';
import { Colors } from '../../../utils/colors';
import { formatPatchNotesDate } from '../../../utils/patch-notes-utils';

export function PatchNotesDay({ day }: { day: PatchNotesDayData }) {
  return (
    <View style={styles.day}>
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
  );
}

const styles = StyleSheet.create({
  day: { marginBottom: 20 },
  date: { color: Colors.text.dim, fontSize: 14, fontWeight: '600', marginBottom: 6 },
  itemRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  bullet: { color: Colors.text.faint, fontSize: 14 },
  item: { flex: 1, color: Colors.text.faint, fontSize: 14, lineHeight: 20 },
});
