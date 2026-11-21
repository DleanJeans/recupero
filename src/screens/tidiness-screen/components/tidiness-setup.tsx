import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '../../../components/button';
import { Text } from '../../../components/text';
import { useTidinessStore } from '../../../store/tidiness-store';
import { Colors } from '../../../utils/colors';
import { TIDY_CHECK_IN_LEVELS, TIDY_STARTER_ROOMS } from '../../../utils/tidiness-utils';
import { TidyChip } from './tidy-chip';

interface TidinessSetupProps {
  onStartEmpty: () => void;
}

/** First run: explains rooms and spots, and offers starter rooms or an empty plan. */
export function TidinessSetup({ onStartEmpty }: TidinessSetupProps) {
  const addStarterRooms = useTidinessStore(store => store.addStarterRooms);
  const [level, setLevel] = useState(50);
  const spotCount = TIDY_STARTER_ROOMS.reduce((sum, room) => sum + room.spots.length, 0);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Track each room and spot</Text>
      <Text style={styles.text}>
        Split Tidiness into rooms (Kitchen, Bedroom…) and spots (Sink, Desk, Bed sheets…). Each spot gets messy at its
        own speed, cleaning it fills only that spot, and Tidiness on Cues becomes the average of your spots.
      </Text>
      <Text style={styles.text}>
        Starter set: {TIDY_STARTER_ROOMS.map(room => `${room.emoji} ${room.name}`).join(', ')} ({spotCount} spots, all
        editable). Cleaning behaviours with matching names are linked for you.
      </Text>
      <Text style={styles.label}>HOW TIDY IS THE PLACE RIGHT NOW?</Text>
      <View style={styles.chips}>
        {TIDY_CHECK_IN_LEVELS.map(item => (
          <TidyChip
            key={item.label}
            label={`${item.emoji} ${item.label}`}
            selected={item.level === level}
            onPress={() => setLevel(item.level)}
          />
        ))}
      </View>
      <Button
        variant="primary"
        onPress={() => addStarterRooms(level)}
      >
        Use starter rooms
      </Button>
      <Button onPress={onStartEmpty}>Start with an empty plan</Button>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border.default,
    padding: 16,
    gap: 10,
  },
  title: { color: Colors.text.primary, fontSize: 17, fontWeight: '700' },
  text: { color: Colors.text.light, fontSize: 13, lineHeight: 19 },
  label: { color: Colors.text.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
});
