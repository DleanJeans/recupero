import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useCuesStore } from '../../store/cues-store';
import type { CueActivityEvent } from '../../types/cue';
import { Colors } from '../../utils/colors';
import { getMoodOption } from '../../utils/cue-utils';
import { formatTime } from '../../utils/time-utils';
import { Text } from '../text';

interface CueActivityRowProps {
  event: CueActivityEvent;
}

export function CueActivityRow({ event }: CueActivityRowProps) {
  const place = useCuesStore(state => state.places.find(item => item.id === event.placeId));
  const mood = event.mood ? getMoodOption(event.mood) : undefined;
  const icon = mood?.emoji ?? (place?.isHome ? '🏠' : '📍');
  const title = event.kind === 'mood' ? 'Mood set' : event.kind === 'enter' ? 'Arrived' : 'Left';
  const detail = mood?.label ?? place?.name ?? 'Unknown place';

  return (
    <View style={styles.row}>
      <Text style={styles.icon}>{icon}</Text>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.detail}>{detail}</Text>
      </View>
      <Text style={styles.time}>{formatTime(event.ts)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    minHeight: 54,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  icon: {
    width: 30,
    fontSize: 23,
    textAlign: 'center',
  },
  copy: {
    flex: 1,
    gap: 1,
  },
  title: {
    color: Colors.text.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  detail: {
    color: Colors.text.muted,
    fontSize: 12,
  },
  time: {
    color: Colors.text.faint,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
});
