import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../../components/text';
import type { BodySensationLog, MoodLog } from '../../../types/cue';
import { Colors } from '../../../utils/colors';
import { getBodySensationOption, getMoodOption } from '../../../utils/cue-utils';
import { formatTime } from '../../../utils/time-utils';

type StateLogCardProps = { kind: 'mood'; log: MoodLog } | { kind: 'body'; log: BodySensationLog };

/** Compact timeline row for a mood check-in or body sensation, tinted with its cue colour. */
export function StateLogCard(props: StateLogCardProps) {
  const option = props.kind === 'mood' ? getMoodOption(props.log.mood) : getBodySensationOption(props.log.sensation);
  const accent = Colors.cue[props.kind];
  const kindLabel = props.kind === 'mood' ? 'Mood' : 'Body';
  const note = props.log.note;

  return (
    <View
      style={[styles.card, { borderLeftColor: accent }]}
      accessibilityLabel={`${kindLabel}: ${option.label} at ${formatTime(props.log.ts)}`}
    >
      <View style={styles.header}>
        <Text style={styles.emoji}>{option.emoji}</Text>
        <Text
          style={[styles.kind, { color: accent }]}
          numberOfLines={1}
        >
          {kindLabel}
        </Text>
        <Text
          selectable
          style={styles.label}
          numberOfLines={1}
        >
          {option.label}
        </Text>
        <Text style={styles.time}>{formatTime(props.log.ts)}</Text>
      </View>
      {note ? (
        <Text
          selectable
          style={styles.note}
        >
          {note}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 6,
    backgroundColor: Colors.bg.dark,
    borderWidth: 1,
    borderColor: Colors.border.dark,
    borderLeftWidth: 3,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emoji: {
    fontSize: 16,
  },
  kind: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  label: {
    flex: 1,
    minWidth: 0,
    color: Colors.text.secondary,
    fontSize: 14,
    fontWeight: '600',
  },
  time: {
    color: Colors.text.faint,
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  note: {
    color: Colors.text.muted,
    fontSize: 13,
    lineHeight: 18,
  },
});
