import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { usePeopleStore } from '../../store/people-store';
import type { Person } from '../../types/person';
import { Colors } from '../../utils/colors';
import {
  type ContactTone,
  formatDaysSince,
  getContactTone,
  getDaysSince,
  getLastContactTs,
  sortPeopleByContact,
} from '../../utils/people-utils';
import { Text } from '../text';
import { PersonDialog } from './person-dialog';

const TONE_COLORS: Record<ContactTone, string> = {
  fresh: Colors.type.desirable,
  ok: Colors.text.light,
  due: Colors.type.neutral,
  overdue: Colors.type.undesirable,
  never: Colors.text.faint,
};

interface PeopleStripProps {
  now: number;
}

/** Social need: everyone you keep in touch with and how long since you last did. */
export function PeopleStrip({ now }: PeopleStripProps) {
  const people = usePeopleStore(state => state.people);
  const contacts = usePeopleStore(state => state.contacts);
  const [editing, setEditing] = useState<Person | 'new'>();

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {sortPeopleByContact(people, contacts).map(person => {
          const last = getLastContactTs(person.id, contacts);
          const days = last == null ? undefined : getDaysSince(last, now);
          const color = TONE_COLORS[getContactTone(days, person.nudgeDays)];
          return (
            <Pressable
              key={person.id}
              style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
              onPress={() => setEditing(person)}
              accessibilityRole="button"
              accessibilityLabel={`${person.name}, last contact ${formatDaysSince(days)}`}
            >
              <Text style={styles.emoji}>{person.emoji}</Text>
              <Text
                style={styles.name}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {person.name}
              </Text>
              <Text
                style={[styles.days, { color }]}
                numberOfLines={1}
              >
                {formatDaysSince(days)}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          style={({ pressed }) => [styles.chip, styles.addChip, pressed && styles.pressed]}
          onPress={() => setEditing('new')}
          accessibilityRole="button"
          accessibilityLabel="Add a person"
        >
          <Text style={styles.emoji}>＋</Text>
          <Text
            style={styles.name}
            numberOfLines={1}
          >
            Add
          </Text>
        </Pressable>
      </ScrollView>
      {people.length === 0 ? (
        <View>
          <Text style={styles.hint}>
            Add people to see how long since you last talked, and to keep their birthday, phone, address and likes.
          </Text>
        </View>
      ) : null}
      {editing ? (
        <PersonDialog
          person={editing === 'new' ? undefined : editing}
          now={now}
          onClose={() => setEditing(undefined)}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingVertical: 4 },
  chip: {
    width: 78,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: Colors.bg.card,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  addChip: { borderStyle: 'dashed', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
  emoji: { fontSize: 24 },
  name: { color: Colors.text.primary, fontSize: 13, fontWeight: '600', maxWidth: 66 },
  days: { fontSize: 11, fontWeight: '600' },
  hint: { color: Colors.text.muted, fontSize: 12, lineHeight: 17 },
});
